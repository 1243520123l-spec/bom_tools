/**
 * BOM综合管理平台 - BOM检查工具模块
 * 硬件BOM与接插件BOM交叉核对
 */

import { ExcelProcessor } from '../modules/excel-processor.js';
import { UIComponents } from '../modules/ui-components.js';
import { Validator } from '../modules/validator.js';
import { Utils } from '../core/utils.js';
import { Config } from '../core/config.js';

/**
 * BOM检查工具类
 */
class BOMCheckTool {
    constructor() {
        // 硬件BOM数据存储：料号 -> 行号数组
        this.hwPnMap = new Map();
        // 硬件BOM原始行数据
        this.hwData = [];
        // 接插件BOM工作簿
        this.connWb = null;

        // 性能优化配置
        this.BATCH_SIZE = 50;
        this.VIRTUAL_SCROLL_THRESHOLD = 100;
        this.tableDataCache = [];
        this.tableStatsCache = {};

        // 类别映射
        this.categoryMapping = {
            "主板": "MB",
            "小板": "KB",
            "天线小板": "ANTB",
        };

        this.reverseCategoryMapping = {
            "MB": ["主板", "MB"],
            "KB": ["小板", "KB"],
            "ANTB": ["天线小板", "ANTB"],
        };

        this.init();
    }

    init() {
        this.initSelects();
        this.bindEvents();
        this.checkLibrariesLoaded();
    }

    /**
     * 初始化列选择下拉框
     */
    initSelects() {
        const selects = ['colConnectorPn', 'colConnectorName', 'colConnectorQty'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.innerHTML = '';
            const colNames = [];
            for (let i = 1; i <= 26; i++) {
                colNames.push(String.fromCharCode(64 + i));
            }
            for (let i = 0; i < 26; i++) {
                for (let j = 0; j < 26; j++) {
                    colNames.push(String.fromCharCode(65 + i) + String.fromCharCode(65 + j));
                }
            }
            colNames.forEach((name, idx) => {
                let opt = document.createElement('option');
                opt.value = idx + 1;
                opt.text = name + " 列";
                el.appendChild(opt);
            });
        });
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 硬件BOM文件上传
        document.getElementById('fileHardware').addEventListener('change', (e) => {
            this.handleHardwareFile(e);
        });

        // 接插件BOM文件上传
        document.getElementById('fileConnector').addEventListener('change', (e) => {
            this.handleConnectorFile(e);
        });

        // 工作表选择
        document.getElementById('sheetConnector').addEventListener('change', (e) => {
            if (!this.connWb) return;
            const sheet = this.connWb.getWorksheet(e.target.value);
            if (sheet) this.autoDetectColumns(sheet);
        });

        // 检查按钮
        document.getElementById('btnCheck').addEventListener('click', () => {
            this.performCheck();
        });
    }

    /**
     * 检查库加载状态
     */
    checkLibrariesLoaded() {
        const check = () => {
            const xlsxLoaded = typeof XLSX !== 'undefined';
            const excelJsLoaded = typeof ExcelJS !== 'undefined';

            if (xlsxLoaded && excelJsLoaded) {
                document.getElementById('loadingStatus').style.display = 'none';
                this.checkReady();
            } else {
                const missing = [];
                if (!xlsxLoaded) missing.push('XLSX');
                if (!excelJsLoaded) missing.push('ExcelJS');
                document.getElementById('loadingStatus').innerHTML =
                    `<span style="color:var(--accent-color);">
                        正在加载组件: ${missing.join(', ')}...
                    </span>`;
                setTimeout(check, 500);
            }
        };

        window.addEventListener('load', check);
        check();
    }

    /**
     * 处理硬件BOM文件
     */
    async handleHardwareFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        // 验证文件
        const validation = Validator.validateExcelFile(file);
        if (!validation.valid) {
            UIComponents.showNotification('error', validation.errors.join(', '));
            return;
        }

        const closeLoading = UIComponents.showLoading('正在解析硬件BOM...');

        try {
            document.getElementById('hwName').innerText = "(" + file.name + ")";
            document.getElementById('hwLabel').classList.add('active-upload');

            // 自动检测类别
            const kws = ['MB', 'KB', 'ANTB'];
            const detectedCat = kws.find(k => file.name.toUpperCase().includes(k)) || "";
            document.getElementById('inputCategory').value = detectedCat;

            const workbook = await ExcelProcessor.readFile(file);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            this.parseHardwareBOM(rows);
            this.checkReady();

            UIComponents.showNotification('success', `硬件BOM加载成功，共${this.hwData.length}条记录`);
        } catch (err) {
            UIComponents.showNotification('error', `硬件BOM读取失败: ${err.message}`);
        } finally {
            closeLoading();
        }
    }

    /**
     * 解析硬件BOM数据
     */
    parseHardwareBOM(rows) {
        this.hwPnMap.clear();
        this.hwData = [];

        if (!rows || rows.length === 0) {
            throw new Error('硬件BOM为空');
        }

        // 查找表头行
        const headerRow = ExcelProcessor.detectHeaderRow(
            rows,
            ['料号'],
            ['位号', '名称', '描述', '序号']
        );

        if (headerRow === -1) {
            // 使用默认值
            this.headerRow = 8;
            this.pnCol = 1;
            this.refDesCol = 8;
        } else {
            // 解析表头列
            const headers = rows[headerRow].map(h => h ? h.toString().trim() : '');
            this.pnCol = headers.findIndex(h => h === '料号');
            this.refDesCol = headers.findIndex(h => h === '位号');
            this.headerRow = headerRow;
        }

        const dataStartRow = this.headerRow + 1;
        let lastValidQty = 0;
        let lastSequence = null;

        for (let i = dataStartRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row || !Array.isArray(row) || row.length <= this.pnCol) continue;

            const pn = row[this.pnCol] !== undefined ? String(row[this.pnCol]).trim() : '';
            if (!pn || pn.toLowerCase() === 'n/a') continue;
            if (!/^HQ[0-9A-Z]/i.test(pn)) continue;

            // 计算位号数量
            let desText = '';
            if (this.refDesCol >= 0 && this.refDesCol < row.length && row[this.refDesCol] !== undefined) {
                desText = String(row[this.refDesCol]).trim();
            }
            let count = desText ? desText.split(/[,，\s\n]+/).filter(v => v.trim().length > 0).length : 0;

            // 获取序号
            const sequence = (row[0] !== undefined && row[0] !== null) ? String(row[0]).trim() : null;

            // 继承逻辑
            if (count === 0 && lastValidQty > 0 && sequence !== null && sequence === lastSequence) {
                count = lastValidQty;
            }

            if (!this.hwPnMap.has(pn)) {
                this.hwPnMap.set(pn, []);
            }
            this.hwPnMap.get(pn).push({
                rowNum: i + 1,
                qty: count
            });

            this.hwData.push({
                rowNum: i + 1,
                pn: pn,
                qty: count,
                row: row
            });

            if (count > 0) {
                lastValidQty = count;
            }
            lastSequence = sequence;
        }

        console.log(`硬件BOM解析完成: 共${this.hwData.length}条记录，${this.hwPnMap.size}个唯一料号`);
    }

    /**
     * 处理接插件BOM文件
     */
    async handleConnectorFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const validation = Validator.validateExcelFile(file);
        if (!validation.valid) {
            UIComponents.showNotification('error', validation.errors.join(', '));
            return;
        }

        const closeLoading = UIComponents.showLoading('正在解析接插件BOM...');

        try {
            document.getElementById('connName').innerText = "(" + file.name + ")";
            document.getElementById('connLabel').classList.add('active-upload');

            const wb = new ExcelJS.Workbook();
            await wb.xlsx.load(await file.arrayBuffer());
            this.connWb = wb;

            // 填充工作表选择
            const sel = document.getElementById('sheetConnector');
            sel.innerHTML = '';
            wb.eachSheet(s => {
                let opt = document.createElement('option');
                opt.value = s.name;
                opt.text = s.name;
                sel.appendChild(opt);
            });

            if (wb.worksheets.length > 0) {
                this.autoDetectColumns(wb.worksheets[0]);
            }

            this.checkReady();
            UIComponents.showNotification('success', `接插件BOM加载成功`);
        } catch (err) {
            UIComponents.showNotification('error', `接插件BOM读取失败: ${err.message}`);
        } finally {
            closeLoading();
        }
    }

    /**
     * 自动检测列
     */
    autoDetectColumns(sheet) {
        let pnCol = 4;
        let nameCol = 3;
        let qtyCol = 8;
        let foundPn = false, foundName = false, foundQty = false;

        const nameKeywords = ['物料名称', '名称', 'description', 'desc', '物料描述', '品名', '规格'];
        const qtyKeywords = ['用量', '数量', '单耗', 'qty', 'quantity'];

        // 搜索前10行
        for (let i = 1; i <= Math.min(10, sheet.rowCount); i++) {
            const row = sheet.getRow(i);
            row.eachCell((cell, colNumber) => {
                const val = String(this.getCellValue(cell) || '').trim().toLowerCase().replace(/\s+/g, '');

                const excludeKeywords = ['项目名称', '负责人', '供应商名称'];
                if (excludeKeywords.some(kw => val.includes(kw))) return;

                if (!foundName && nameKeywords.some(kw => val === kw || val.includes(kw))) {
                    nameCol = colNumber;
                    foundName = true;
                }
                if (!foundQty && qtyKeywords.some(kw => val === kw || val.includes(kw))) {
                    qtyCol = colNumber;
                    foundQty = true;
                }
            });
            if (foundName && foundQty) break;
        }

        // 统计料号出现频率
        const colCounts = new Map();
        for (let i = 1; i <= Math.min(100, sheet.rowCount); i++) {
            const row = sheet.getRow(i);
            if (!row) continue;
            for (let col = 1; col <= Math.min(15, row.cellCount || 15); col++) {
                const cell = row.getCell(col);
                const val = String(this.getCellValue(cell) || '').trim();
                if (/^HQ[0-9A-Z]{5,}/i.test(val)) {
                    colCounts.set(col, (colCounts.get(col) || 0) + 1);
                }
            }
        }

        let maxCount = 0;
        colCounts.forEach((count, col) => {
            if (count > maxCount && count >= 2) {
                maxCount = count;
                pnCol = col;
                foundPn = true;
            }
        });

        document.getElementById('colConnectorPn').value = pnCol;
        document.getElementById('colConnectorName').value = nameCol;
        document.getElementById('colConnectorQty').value = qtyCol;

        document.getElementById('pnAutoTip').innerText = foundPn ? "已识别" : "";
        document.getElementById('nameAutoTip').innerText = foundName ? "已识别" : "";
        document.getElementById('qtyAutoTip').innerText = foundQty ? "已识别" : "";
    }

    /**
     * 获取单元格值
     */
    getCellValue(cell) {
        if (!cell || cell.value === null || cell.value === undefined) return "";
        let v = cell.value;
        if (v.richText) return v.richText.map(r => r.text).join('').trim();
        if (typeof v === 'object' && v.result !== undefined) return String(v.result).trim();
        if (typeof v === 'object' && v.formula) return String(v.result || '').trim();
        return String(v).trim();
    }

    /**
     * 检查删除线
     */
    hasStrikeThrough(cell) {
        if (!cell || !cell.font) return false;
        if (cell.font.strike) return true;
        if (cell.value && cell.value.richText) {
            return cell.value.richText.some(r => r.font && r.font.strike);
        }
        return false;
    }

    /**
     * 类别匹配
     */
    isCategoryMatch(rawCat, inputCat) {
        if (!rawCat || !inputCat) return false;

        const raw = String(rawCat).trim().toUpperCase();
        const input = String(inputCat).trim().toUpperCase();

        if (raw === input) return true;

        const mappedCat = this.categoryMapping[raw];
        if (mappedCat && mappedCat.toUpperCase() === input) return true;

        const inputMapped = this.categoryMapping[input];
        if (inputMapped && inputMapped === raw) return true;

        if (raw.includes(input) || input.includes(raw)) return true;

        return false;
    }

    /**
     * 检查准备状态
     */
    checkReady() {
        const b = document.getElementById('btnCheck');
        const xlsxLoaded = typeof XLSX !== 'undefined';
        const excelJsLoaded = typeof ExcelJS !== 'undefined';

        if (!xlsxLoaded || !excelJsLoaded) {
            b.disabled = true;
            b.textContent = '正在加载组件...';
            return;
        }

        if (this.hwPnMap.size > 0 && this.connWb) {
            b.disabled = false;
            b.textContent = '开始交叉核对';
        } else {
            b.disabled = true;
            if (this.hwPnMap.size === 0 && !this.connWb) {
                b.textContent = '等待文件就绪...';
            } else if (this.hwPnMap.size === 0) {
                b.textContent = '等待硬件BOM...';
            } else {
                b.textContent = '等待接插件BOM...';
            }
        }
    }

    /**
     * 执行交叉核对
     */
    performCheck() {
        const inputCat = document.getElementById('inputCategory').value.trim().toUpperCase();
        if (!inputCat) {
            UIComponents.showNotification('warning', '请输入待核对类别 (如: MB, KB, ANTB)');
            return;
        }

        if (!this.connWb) {
            UIComponents.showNotification('warning', '请先上传接插件BOM');
            return;
        }

        const sheetName = document.getElementById('sheetConnector').value;
        const sheet = this.connWb.getWorksheet(sheetName);
        if (!sheet) {
            UIComponents.showNotification('error', '无法获取接插件工作表');
            return;
        }

        const pnColNum = parseInt(document.getElementById('colConnectorPn').value);
        const nameColNum = parseInt(document.getElementById('colConnectorName').value);
        const qtyColNum = parseInt(document.getElementById('colConnectorQty').value);

        const results = [];

        sheet.eachRow((row, rowNum) => {
            const catCell = row.getCell(1);
            const rawCatValue = this.getCellValue(catCell);

            if (!this.isCategoryMatch(rawCatValue, inputCat)) return;

            const pnCell = row.getCell(pnColNum);
            const nameCell = row.getCell(nameColNum);
            const qtyCell = row.getCell(qtyColNum);
            const pn = this.getCellValue(pnCell);

            if (!pn || pn.toLowerCase() === 'n/a') return;

            const isStruck = this.hasStrikeThrough(catCell) ||
                           this.hasStrikeThrough(pnCell) ||
                           this.hasStrikeThrough(nameCell);

            const hwInfoList = this.hwPnMap.get(pn);
            let hwRow = null;
            let hwQty = 0;
            if (hwInfoList && hwInfoList.length > 0) {
                hwRow = hwInfoList[0].rowNum;
                hwQty = hwInfoList[0].qty;
            }

            const masterQtyCell = qtyCell.master || qtyCell;
            const connQty = parseFloat(this.getCellValue(masterQtyCell)) || 0;

            let status = 'pending';
            if (isStruck) {
                status = (hwInfoList && hwInfoList.length > 0) ? 'extra' : 'ignored';
            }

            results.push({
                id: rowNum,
                cat: rawCatValue,
                name: this.getCellValue(nameCell),
                pn: pn,
                hwRows: hwInfoList || null,
                hwRow: hwRow,
                hwQty: hwQty,
                connQty: connQty,
                st: status
            });
        });

        if (results.length === 0) {
            UIComponents.showNotification('warning', `未找到类别为 "${inputCat}" 的记录`);
            return;
        }

        this.checkSequenceAndQty(results);
        this.renderTable(results);

        UIComponents.showNotification('success', `核对完成，找到${results.length}条记录`);
    }

    /**
     * 检查顺序和数量
     */
    checkSequenceAndQty(results) {
        let i = 0;
        while (i < results.length) {
            if (results[i].st === 'ignored' || results[i].st === 'extra') {
                i++;
                continue;
            }

            let j = i + 1;
            while (j < results.length &&
                   results[j].name === results[i].name &&
                   results[j].st !== 'ignored' &&
                   results[j].st !== 'extra') {
                j++;
            }

            const group = results.slice(i, j).filter(x => x.st !== 'ignored' && x.st !== 'extra');

            if (group.length > 0) {
                const hwRowNumbers = [];
                group.forEach(item => {
                    if (item.hwRow) {
                        hwRowNumbers.push({
                            item: item,
                            hwRow: item.hwRow
                        });
                    }
                });

                const sorted = [...hwRowNumbers].sort((a, b) => a.hwRow - b.hwRow);

                hwRowNumbers.forEach((current, idx) => {
                    if (!current.item.hwRow) {
                        current.item.st = 'missing';
                    } else {
                        const expectedHwRow = sorted[idx].hwRow;
                        if (current.hwRow !== expectedHwRow) {
                            current.item.st = 'seq';
                            current.item.expectedRow = expectedHwRow;
                        } else {
                            if (current.item.connQty !== current.item.hwQty) {
                                current.item.st = 'qty';
                            } else {
                                current.item.st = 'ok';
                            }
                        }
                    }
                });

                group.forEach(item => {
                    if (item.st === 'pending') {
                        item.st = 'missing';
                    }
                });
            }

            i = j;
        }
    }

    /**
     * 创建表格行HTML
     */
    createTableRowHTML(item) {
        let resultBadge = '';
        let rowClass = '';

        switch (item.st) {
            case 'ignored':
                rowClass = 'row-ignored';
                resultBadge = '<span class="result-badge badge-ignored">已废弃</span>';
                break;
            case 'extra':
                rowClass = 'row-extra';
                resultBadge = `<span class="result-badge badge-extra" title="接插件已废弃但硬件BOM中仍存在">多余料号</span>`;
                break;
            case 'missing':
                rowClass = 'row-missing';
                resultBadge = '<span class="result-badge badge-missing">料号缺失</span>';
                break;
            case 'seq':
                rowClass = 'row-seq';
                const tip = item.expectedRow ? `(应在第${item.expectedRow}行)` : '';
                resultBadge = `<span class="result-badge badge-seq" title="${tip}">顺序错误</span>`;
                break;
            case 'qty':
                rowClass = 'row-qty';
                resultBadge = `<span class="result-badge badge-qty" title="接插件用量: ${item.connQty}, 硬件位号数: ${item.hwQty}">数量不匹配(${item.connQty}/${item.hwQty})</span>`;
                break;
            case 'ok':
                resultBadge = '<span class="result-badge badge-ok">核对通过</span>';
                break;
            default:
                resultBadge = '<span class="result-badge" style="background:#ccc;color:#666;">待检查</span>';
        }

        let hwRowDisplay = item.hwRow || '-';
        if (item.hwRows && item.hwRows.length > 1) {
            hwRowDisplay = `${item.hwRows[0].rowNum} <small style="color:var(--text-muted)">(+${item.hwRows.length - 1})</small>`;
        }

        return `<tr class="${rowClass}">
            <td>${item.id}</td>
            <td>${item.cat}</td>
            <td class="c-name">${item.name}</td>
            <td class="c-pn">${item.pn}</td>
            <td>${hwRowDisplay}</td>
            <td>${item.connQty || '-'}</td>
            <td>${item.hwQty || '-'}</td>
            <td>${resultBadge}</td>
        </tr>`;
    }

    /**
     * 计算统计信息
     */
    calculateStats(data) {
        let missingCount = 0, seqCount = 0, qtyCount = 0, ignoredCount = 0, extraCount = 0, okCount = 0;

        data.forEach(item => {
            switch (item.st) {
                case 'ignored': ignoredCount++; break;
                case 'extra': extraCount++; break;
                case 'missing': missingCount++; break;
                case 'seq': seqCount++; break;
                case 'qty': qtyCount++; break;
                case 'ok': okCount++; break;
            }
        });

        return { missingCount, seqCount, qtyCount, ignoredCount, extraCount, okCount };
    }

    /**
     * 更新统计摘要
     */
    updateSummary(stats, total) {
        const valid = total - stats.ignoredCount;
        document.getElementById('summaryText').innerHTML =
            `分析完成 | 总计: ${total} | 有效: ${valid} | 忽略: ${stats.ignoredCount} | ` +
            `<span style="color:var(--success-color)">通过: ${stats.okCount}</span> | ` +
            `<span style="color:var(--danger-color)">缺失: ${stats.missingCount}</span> | ` +
            `<span style="color:var(--accent-dark)">顺序错: ${stats.seqCount}</span>` +
            (stats.qtyCount > 0 ? ` | <span style="color:var(--info-color)">数量错: ${stats.qtyCount}</span>` : '') +
            (stats.extraCount > 0 ? ` | <span style="color:var(--danger-color)">多余: ${stats.extraCount}</span>` : '');
    }

    /**
     * 渲染表格
     */
    renderTable(data) {
        const tbody = document.getElementById('resultBody');
        tbody.innerHTML = '';

        this.tableDataCache = data;
        this.tableStatsCache = this.calculateStats(data);

        document.getElementById('resultArea').style.display = 'block';

        if (data.length <= this.VIRTUAL_SCROLL_THRESHOLD) {
            const html = data.map(item => this.createTableRowHTML(item)).join('');
            tbody.innerHTML = html;
            this.updateSummary(this.tableStatsCache, data.length);
        } else {
            this.renderTableBatched(data, 0);
        }
    }

    /**
     * 分批渲染表格
     */
    renderTableBatched(data, startIndex = 0) {
        const tbody = document.getElementById('resultBody');
        const endIndex = Math.min(startIndex + this.BATCH_SIZE, data.length);

        const fragment = document.createDocumentFragment();
        const tempDiv = document.createElement('div');

        for (let i = startIndex; i < endIndex; i++) {
            tempDiv.innerHTML = this.createTableRowHTML(data[i]);
            fragment.appendChild(tempDiv.firstElementChild);
        }

        tbody.appendChild(fragment);

        if (endIndex < data.length) {
            requestAnimationFrame(() => this.renderTableBatched(data, endIndex));
        } else {
            this.updateSummary(this.tableStatsCache, data.length);
        }
    }
}

// 导出
export default BOMCheckTool;
