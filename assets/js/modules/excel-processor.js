/**
 * BOM综合管理平台 - Excel处理模块
 * 统一的Excel文件读取、解析、导出功能
 * 消除重复代码，提升可维护性
 */

class ExcelProcessor {
    /**
     * 读取Excel文件
     * @param {File} file - Excel文件对象
     * @returns {Promise<WorkBook>} - Promise解析为workbook对象
     */
    static async readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    resolve(workbook);
                } catch (error) {
                    reject(new Error(`文件读取失败: ${error.message}`));
                }
            };

            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * 检测表头行位置
     * @param {Array} rawData - 原始数据数组
     * @param {Array} requiredKeywords - 必需关键字
     * @param {Array} optionalKeywords - 可选关键字
     * @returns {number} - 表头行索引，未找到返回-1
     */
    static detectHeaderRow(rawData, requiredKeywords = ['料号'], optionalKeywords = ['位号', '名称', '描述']) {
        const maxSearchRows = Math.min(20, rawData.length);
        let bestHeaderRow = -1;
        let bestScore = 0;

        for (let i = 0; i < maxSearchRows; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            let score = 0;
            let hasRequired = false;

            for (const cell of row) {
                if (!cell) continue;
                const cellStr = cell.toString().trim();

                if (requiredKeywords.some(kw => cellStr.includes(kw))) {
                    score += 10;
                    hasRequired = true;
                }

                for (const kw of optionalKeywords) {
                    if (cellStr.includes(kw)) {
                        score += 5;
                        break;
                    }
                }
            }

            // 排除包含干扰词的行
            const rowStr = row.join('');
            const excludeWords = ['历史修改', '提交时间', '对白'];
            if (excludeWords.some(w => rowStr.includes(w))) {
                score -= 20;
            }

            if (hasRequired && score > bestScore) {
                bestScore = score;
                bestHeaderRow = i;
            }
        }

        return bestHeaderRow;
    }

    /**
     * 解析Excel数据为对象数组
     * @param {WorkBook} workbook - Excel workbook对象
     * @param {Object} options - 解析选项
     * @returns {Array<Object>} - 解析后的数据数组
     */
    static parseData(workbook, options = {}) {
        const {
            sheetName = null,
            headerRowIndex = null,
            requiredKeywords = ['料号'],
            optionalKeywords = ['位号', '名称', '描述']
        } = options;

        // 获取工作表
        const sheet = sheetName
            ? workbook.Sheets[sheetName]
            : workbook.Sheets[workbook.SheetNames[0]];

        if (!sheet) {
            throw new Error('未找到有效的工作表');
        }

        // 转换为二维数组
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rawData.length === 0) {
            throw new Error('工作表为空');
        }

        // 检测或使用指定的表头行
        const headerRow = headerRowIndex !== null
            ? headerRowIndex
            : this.detectHeaderRow(rawData, requiredKeywords, optionalKeywords);

        if (headerRow === -1) {
            throw new Error(`未找到包含 ${requiredKeywords.join(' 或 ')} 的表头行`);
        }

        // 提取表头
        const headers = rawData[headerRow].map(h => h ? h.toString().trim() : '');

        if (headers.length === 0 || headers.every(h => !h)) {
            throw new Error('表头行为空');
        }

        // 解析数据行
        const data = [];
        for (let i = headerRow + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            // 检查是否为空行
            if (row.every(cell => !cell || cell.toString().trim() === '')) continue;

            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = row[index] !== undefined ? row[index] : '';
            });
            rowData._rowIndex = i + 1; // 记录原始行号
            data.push(rowData);
        }

        return {
            headers,
            data,
            headerRow,
            totalRows: rawData.length,
            dataRows: data.length
        };
    }

    /**
     * 导出数据为Excel文件
     * @param {Array|Object} data - 要导出的数据
     * @param {string} filename - 文件名
     * @param {Object} options - 导出选项
     */
    static async exportToExcel(data, filename, options = {}) {
        const {
            sheetName = 'Sheet1',
            headerStyle = { font: { bold: true }, fill: { fgColor: { rgb: "FFE8E8E8" } } }
        } = options;

        try {
            // 使用SheetJS (XLSX) 导出
            let worksheet;

            if (Array.isArray(data)) {
                // 数组数据
                if (data.length > 0 && typeof data[0] === 'object') {
                    worksheet = XLSX.utils.json_to_sheet(data);
                } else {
                    worksheet = XLSX.utils.aoa_to_sheet(data);
                }
            } else {
                worksheet = XLSX.utils.json_to_sheet([data]);
            }

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

            // 生成文件
            XLSX.writeFile(workbook, filename);

            return { success: true, filename };
        } catch (error) {
            throw new Error(`导出失败: ${error.message}`);
        }
    }

    /**
     * 获取工作表名称列表
     * @param {WorkBook} workbook - Excel workbook对象
     * @returns {Array<string>} - 工作表名称数组
     */
    static getSheetNames(workbook) {
        return workbook.SheetNames || [];
    }

    /**
     * 获取工作表数据预览
     * @param {WorkBook} workbook - Excel workbook对象
     * @param {string} sheetName - 工作表名称
     * @param {number} maxRows - 最大预览行数
     * @returns {Array<Array>} - 预览数据
     */
    static getPreview(workbook, sheetName, maxRows = 10) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) return [];

        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        return data.slice(0, maxRows);
    }

    /**
     * 查找列索引
     * @param {Array<string>} headers - 表头数组
     * @param {Array<string>} keywords - 关键字数组
     * @returns {number|null} - 列索引，未找到返回null
     */
    static findColumnIndex(headers, keywords) {
        for (const keyword of keywords) {
            const index = headers.findIndex(h => h && h.includes(keyword));
            if (index !== -1) return index;
        }
        return null;
    }

    /**
     * 批量处理多个Excel文件
     * @param {Array<File>} files - 文件数组
     * @param {Function} progressCallback - 进度回调
     * @returns {Promise<Array>} - 处理结果数组
     */
    static async processBatch(files, progressCallback) {
        const results = [];

        for (let i = 0; i < files.length; i++) {
            try {
                const workbook = await this.readFile(files[i]);
                const parsed = this.parseData(workbook);

                results.push({
                    file: files[i].name,
                    success: true,
                    data: parsed
                });

                if (progressCallback) {
                    progressCallback({
                        current: i + 1,
                        total: files.length,
                        percent: Math.round(((i + 1) / files.length) * 100)
                    });
                }
            } catch (error) {
                results.push({
                    file: files[i].name,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * 获取单元格值
     * @param {Object} row - 行数据对象
     * @param {Array<string>} columnNames - 可能的列名
     * @returns {string} - 单元格值
     */
    static getCellValue(row, columnNames) {
        for (const name of columnNames) {
            if (row[name] !== undefined && row[name] !== '') {
                return String(row[name]).trim();
            }
        }
        return '';
    }

    /**
     * 比较两个数据集
     * @param {Array} sourceData - 源数据
     * @param {Array} targetData - 目标数据
     * @param {Object} options - 比较选项
     * @returns {Object} - 比较结果
     */
    static compareData(sourceData, targetData, options = {}) {
        const {
            keyColumn = '料号',
            compareColumns = ['位号', '数量']
        } = options;

        const sourceMap = new Map();
        sourceData.forEach(row => {
            const key = this.getCellValue(row, [keyColumn]);
            if (key) sourceMap.set(key, row);
        });

        const results = {
            missing: [],      // 源有目标无
            extra: [],        // 源无目标有
            mismatch: [],     // 字段不匹配
            match: []         // 完全匹配
        };

        targetData.forEach(targetRow => {
            const key = this.getCellValue(targetRow, [keyColumn]);

            if (!key) return;

            const sourceRow = sourceMap.get(key);

            if (!sourceRow) {
                results.extra.push({ key, row: targetRow });
            } else {
                let hasMismatch = false;
                const mismatches = [];

                compareColumns.forEach(col => {
                    const sourceVal = this.getCellValue(sourceRow, [col]);
                    const targetVal = this.getCellValue(targetRow, [col]);

                    if (sourceVal !== targetVal) {
                        hasMismatch = true;
                        mismatches.push({ column: col, source: sourceVal, target: targetVal });
                    }
                });

                if (hasMismatch) {
                    results.mismatch.push({ key, mismatches, row: targetRow });
                } else {
                    results.match.push({ key, row: targetRow });
                }

                sourceMap.delete(key);
            }
        });

        // 剩余的是目标中缺少的
        sourceMap.forEach((row, key) => {
            results.missing.push({ key, row });
        });

        return results;
    }
}

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExcelProcessor;
}
