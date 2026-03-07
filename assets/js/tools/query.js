/**
 * BOM综合管理平台 - 位号查询工具模块
 * 根据硬件BOM查询料号对应位号
 */

import { ExcelProcessor } from '../modules/excel-processor.js';
import { UIComponents } from '../modules/ui-components.js';
import { Validator } from '../modules/validator.js';
import { Utils } from '../core/utils.js';
import { Config } from '../core/config.js';

/**
 * 位号查询工具类
 */
class QueryTool {
    constructor() {
        // BOM数据存储
        this.bomData = [];
        this.pnIndex = new Map(); // 料号 -> 数据数组索引
        this.designatorIndex = new Map(); // 位号 -> 数据数组索引

        // 查询状态
        this.partNumbers = []; // 用户输入的料号列表

        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // BOM文件上传
        document.getElementById('fileBom')?.addEventListener('change', (e) => {
            this.handleBomFile(e);
        });

        // 添加料号按钮
        document.getElementById('addPartBtn')?.addEventListener('click', () => {
            this.addPartNumberInput();
        });

        // 查询按钮
        document.getElementById('btnQuery')?.addEventListener('click', () => {
            this.performQuery();
        });

        // 导出按钮
        document.getElementById('btnExport')?.addEventListener('click', () => {
            this.exportResults();
        });
    }

    /**
     * 处理BOM文件上传
     */
    async handleBomFile(e) {
        const file = e.target.files[0];
        if (!file) return;

        const validation = Validator.validateExcelFile(file);
        if (!validation.valid) {
            UIComponents.showNotification('error', validation.errors.join(', '));
            return;
        }

        const closeLoading = UIComponents.showLoading('正在解析BOM...');

        try {
            const workbook = await ExcelProcessor.readFile(file);
            const parsed = ExcelProcessor.parseData(workbook, {
                requiredKeywords: ['料号'],
                optionalKeywords: ['位号', '名称', '描述']
            });

            this.bomData = parsed.data;
            this.buildIndexes();

            document.getElementById('bomInfo').classList.add('active-upload');
            UIComponents.showNotification('success', `BOM加载成功，共${parsed.dataRows}条记录`);
        } catch (err) {
            UIComponents.showNotification('error', `BOM读取失败: ${err.message}`);
        } finally {
            closeLoading();
        }
    }

    /**
     * 构建索引
     */
    buildIndexes() {
        this.pnIndex.clear();
        this.designatorIndex.clear();

        this.bomData.forEach((row, index) => {
            // 索引料号
            const pn = ExcelProcessor.getCellValue(row, ['料号', 'PN', 'Part Number']);
            if (pn) {
                if (!this.pnIndex.has(pn)) {
                    this.pnIndex.set(pn, []);
                }
                this.pnIndex.get(pn).push(index);
            }

            // 索引位号
            const designator = ExcelProcessor.getCellValue(row, ['位号', 'Designator']);
            if (designator) {
                const parts = designator.split(/[,，\s\n]+/);
                parts.forEach(part => {
                    const trimmed = part.trim();
                    if (trimmed) {
                        if (!this.designatorIndex.has(trimmed)) {
                            this.designatorIndex.set(trimmed, []);
                        }
                        this.designatorIndex.get(trimmed).push(index);
                    }
                });
            }
        });
    }

    /**
     * 添加料号输入框
     */
    addPartNumberInput() {
        const container = document.getElementById('partNumberInputs');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'part-number-row';

        row.innerHTML = `
            <div class="input-group">
                <div class="form-control-with-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        <circle cx="10" cy="10" r="7"/>
                    </svg>
                    <input type="text" class="form-control part-number-input" placeholder="输入料号 (如: HQ12345)" />
                </div>
                <button type="button" class="btn btn-secondary btn-add" title="添加更多料号">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 5v14M5 12h14"/>
                    </svg>
                </button>
                <button type="button" class="btn btn-secondary btn-remove" title="删除此行">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
        `;

        // 绑定事件
        const input = row.querySelector('.part-number-input');
        const addBtn = row.querySelector('.btn-add');
        const removeBtn = row.querySelector('.btn-remove');

        addBtn.addEventListener('click', () => this.addPartNumberInput());
        removeBtn.addEventListener('click', () => {
            if (container.children.length > 1) {
                row.remove();
            } else {
                input.value = '';
            }
        });

        container.appendChild(row);
        input.focus();
    }

    /**
     * 获取用户输入的料号列表
     */
    getPartNumbers() {
        const inputs = document.querySelectorAll('.part-number-input');
        const partNumbers = [];

        inputs.forEach(input => {
            const value = input.value.trim();
            if (value) {
                // 支持逗号分隔的多个料号
                const parts = value.split(/[,，\s\n]+/);
                parts.forEach(p => {
                    const trimmed = p.trim();
                    if (trimmed && !partNumbers.includes(trimmed)) {
                        partNumbers.push(trimmed);
                    }
                });
            }
        });

        return partNumbers;
    }

    /**
     * 执行查询
     */
    performQuery() {
        const partNumbers = this.getPartNumbers();

        if (partNumbers.length === 0) {
            UIComponents.showNotification('warning', '请输入要查询的料号');
            return;
        }

        if (this.bomData.length === 0) {
            UIComponents.showNotification('warning', '请先上传BOM文件');
            return;
        }

        const results = [];

        partNumbers.forEach(pn => {
            const indexes = this.pnIndex.get(pn);
            const isPrimary = pn.startsWith('HQ');

            if (indexes && indexes.length > 0) {
                indexes.forEach(idx => {
                    const row = this.bomData[idx];
                    results.push({
                        partNumber: pn,
                        designator: ExcelProcessor.getCellValue(row, ['位号', 'Designator']),
                        name: ExcelProcessor.getCellValue(row, ['名称', 'Name', '描述', 'Description']),
                        type: isPrimary ? 'primary' : 'alternative',
                        found: true
                    });
                });
            } else {
                results.push({
                    partNumber: pn,
                    designator: '',
                    name: '',
                    type: isPrimary ? 'primary' : 'alternative',
                    found: false
                });
            }
        });

        this.renderResults(results);

        const found = results.filter(r => r.found).length;
        UIComponents.showNotification('success', `查询完成，找到${found}/${results.length}个料号`);
    }

    /**
     * 渲染查询结果
     */
    renderResults(results) {
        const container = document.getElementById('queryResults');
        if (!container) return;

        container.innerHTML = '';

        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="M21 21l-4.35-4.35"/>
                        </svg>
                    </div>
                    <div class="empty-state-text">未找到匹配结果</div>
                    <div class="empty-state-hint">请检查料号是否正确或上传更完整的BOM文件</div>
                </div>
            `;
            return;
        }

        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'query-result-item';

            if (!result.found) {
                item.innerHTML = `
                    <div class="query-result-part" style="color: var(--danger-color);">${Utils.escapeHtml(result.partNumber)}</div>
                    <div class="query-result-designator" style="color: var(--text-muted);">未找到匹配记录</div>
                `;
            } else {
                const typeLabel = result.type === 'primary' ? '主料' : '替代料';
                const typeClass = result.type === 'primary' ? 'primary' : 'alternative';

                item.innerHTML = `
                    <div class="query-result-part">
                        ${Utils.escapeHtml(result.partNumber)}
                        <span class="query-result-type ${typeClass}">${typeLabel}</span>
                    </div>
                    <div class="query-result-designator">
                        位号: <strong>${Utils.escapeHtml(result.designator || '无')}</strong>
                    </div>
                    ${result.name ? `<div class="query-result-designator">${Utils.escapeHtml(result.name)}</div>` : ''}
                `;
            }

            container.appendChild(item);
        });
    }

    /**
     * 导出结果
     */
    exportResults() {
        const results = document.querySelectorAll('.query-result-item');

        if (results.length === 0) {
            UIComponents.showNotification('warning', '没有可导出的结果');
            return;
        }

        const data = [];
        results.forEach(item => {
            const pn = item.querySelector('.query-result-part')?.textContent || '';
            const type = item.querySelector('.query-result-type')?.textContent || '';
            const des = item.querySelector('.query-result-designator')?.textContent || '';

            data.push({
                '料号': pn.replace(type, '').trim(),
                '类型': type,
                '位号': des.replace('位号: ', '').replace('无', '').trim()
            });
        });

        const filename = `位号查询结果_${Utils.formatDateTime(new Date(), 'YYYYMMDD_HHmmss')}.xlsx`;

        ExcelProcessor.exportToExcel(data, filename)
            .then(() => {
                UIComponents.showNotification('success', '导出成功');
            })
            .catch(err => {
                UIComponents.showNotification('error', `导出失败: ${err.message}`);
            });
    }
}

// 导出
export default QueryTool;
