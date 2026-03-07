/**
 * BOM综合管理平台 - UI组件库
 * 提供可复用的UI组件
 */

import { Config } from '../core/config.js';
import { Utils } from '../core/utils.js';

/**
 * UI组件类
 */
export class UIComponents {
    /**
     * 显示浮动通知
     * @param {string} type - 通知类型: success, error, warning, info
     * @param {string} message - 通知内容
     * @param {number} duration - 显示时长(ms)
     */
    static showNotification(type, message, duration = Config.ui.notification.duration) {
        // 创建通知容器
        let container = document.querySelector('.notification-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'notification-container';
            document.body.appendChild(container);
        }

        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        // SVG 图标
        const icons = {
            success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
            error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
            warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
            info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`
        };

        const colorMap = {
            success: '--success-color',
            error: '--danger-color',
            warning: '--warning-color',
            info: '--info-color'
        };

        notification.innerHTML = `
            <span style="display:flex;align-items:center;color:var(${colorMap[type] || '--info-color'});">${icons[type] || icons.info}</span>
            <span>${Utils.escapeHtml(message)}</span>
        `;

        container.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    /**
     * 显示加载指示器
     * @param {string} message - 加载消息
     * @param {Object} options - 选项
     * @returns {Function} - 关闭加载器的函数
     */
    static showLoading(message = '处理中...', options = {}) {
        const {
            overlay = true,
            spinner = true
        } = options;

        // 创建容器
        let container = document.querySelector('.loading-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'loading-container';
            if (overlay) {
                container.style.cssText = `
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    backdrop-filter: blur(4px);
                `;
            }
            document.body.appendChild(container);
        }

        // 创建加载器
        const loader = document.createElement('div');
        loader.className = 'loading-indicator';
        loader.style.cssText = `
            background: white;
            padding: 30px 40px;
            border-radius: 16px;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            min-width: 200px;
        `;

        if (spinner) {
            loader.innerHTML += `
                <div class="spinner" style="width: 32px; height: 32px; border-width: 3px;"></div>
            `;
        }

        loader.innerHTML += `
            <div style="font-weight: 600; color: var(--text-primary);">${Utils.escapeHtml(message)}</div>
        `;

        container.appendChild(loader);
        container.style.display = 'flex';

        // 返回关闭函数
        return () => {
            loader.remove();
            if (container.children.length === 0) {
                container.remove();
            } else {
                container.style.display = 'none';
            }
        };
    }

    /**
     * 创建文件上传组件
     * @param {Object} options - 配置选项
     * @returns {HTMLElement} - 上传组件元素
     */
    static createFileUploader(options = {}) {
        const {
            accept = '.xlsx,.xls,.csv',
            multiple = false,
            maxSize = Config.excel.maxFileSize,
            onFileSelect = null,
            onFileChange = null,
            buttonText = '点击或拖拽文件到此处',
            icon = null
        } = options;

        const wrapper = document.createElement('div');
        wrapper.className = 'file-upload-wrapper';

        const defaultIcon = icon || `
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
        `;

        wrapper.innerHTML = `
            ${defaultIcon}
            <div class="upload-text">${buttonText}</div>
            <div class="upload-hint" style="font-size: 12px; margin-top: 4px; color: var(--text-muted);">
                支持格式: ${accept} | 最大: ${Utils.formatFileSize(maxSize)}
            </div>
        `;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.multiple = multiple;
        input.style.cssText = 'position: absolute; width: 100%; height: 100%; opacity: 0; cursor: pointer;';

        // 拖拽支持
        wrapper.addEventListener('dragover', (e) => {
            e.preventDefault();
            wrapper.classList.add('dragover');
        });

        wrapper.addEventListener('dragleave', () => {
            wrapper.classList.remove('dragover');
        });

        wrapper.addEventListener('drop', (e) => {
            e.preventDefault();
            wrapper.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });

        // 文件选择
        input.addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });

        const handleFiles = (files) => {
            if (files.length === 0) return;

            const file = multiple ? files : files[0];

            // 验证文件类型
            const allowedTypes = accept.split(',').map(t => t.trim());
            if (!Utils.isValidFileType(file, allowedTypes)) {
                this.showNotification('error', Config.messages.invalidFileType(allowedTypes));
                return;
            }

            // 验证文件大小
            if (!Utils.isValidFileSize(file, maxSize)) {
                this.showNotification('error', Config.messages.fileTooLarge(maxSize));
                return;
            }

            wrapper.classList.add('active-upload');
            wrapper.querySelector('.upload-text').textContent = file.name;

            if (onFileSelect) onFileSelect(file);
            if (onFileChange) onFileChange(file);
        };

        wrapper.appendChild(input);
        return wrapper;
    }

    /**
     * 创建结果展示组件
     * @param {Object} data - 结果数据
     * @param {Object} options - 配置选项
     * @returns {HTMLElement} - 结果展示元素
     */
    static createResultDisplay(data, options = {}) {
        const {
            title = '处理结果',
            showExport = true,
            exportFormats = ['xlsx', 'csv'],
            onExport = null
        } = options;

        const container = document.createElement('div');
        container.className = 'result-area';

        // 创建头部
        const header = document.createElement('div');
        header.className = 'result-header';
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;';
        header.innerHTML = `
            <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${title}</h3>
            ${showExport ? this._createExportButton(exportFormats, onExport) : ''}
        `;

        container.appendChild(header);

        // 创建内容区
        const content = document.createElement('div');
        content.className = 'result-content';

        if (data.summary) {
            content.appendChild(this._createSummary(data.summary));
        }

        if (data.details) {
            content.appendChild(this._createDetails(data.details));
        }

        if (data.table) {
            content.appendChild(this._createTable(data.table));
        }

        container.appendChild(content);

        return container;
    }

    /**
     * 创建摘要卡片
     */
    static _createSummary(summary) {
        const card = document.createElement('div');
        card.className = 'result-details';

        let html = '<h4>摘要</h4>';
        for (const [key, value] of Object.entries(summary)) {
            html += `
                <div class="detail-row">
                    <span class="detail-label">${key}:</span>
                    <span class="detail-value">${value}</span>
                </div>
            `;
        }

        card.innerHTML = html;
        return card;
    }

    /**
     * 创建详情区域
     */
    static _createDetails(details) {
        const container = document.createElement('div');
        container.className = 'result-details-list';

        details.forEach(detail => {
            const item = document.createElement('div');
            item.className = 'result-details';
            item.innerHTML = `
                <h4>${detail.title}</h4>
                <div>${detail.content}</div>
            `;
            container.appendChild(item);
        });

        return container;
    }

    /**
     * 创建表格
     */
    static _createTable(tableData) {
        const { headers, rows, striped = true } = tableData;

        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-container';

        const table = document.createElement('table');
        table.className = 'data-table';

        // 表头
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        // 表体
        const tbody = document.createElement('tbody');
        rows.forEach((row, index) => {
            const tr = document.createElement('tr');
            if (striped && index % 2 === 1) {
                tr.style.background = 'var(--bg-light)';
            }
            row.forEach(cell => {
                const td = document.createElement('td');
                td.textContent = cell;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        tableContainer.appendChild(table);
        return tableContainer;
    }

    /**
     * 创建导出按钮
     */
    static _createExportButton(formats, onExport) {
        const container = document.createElement('div');
        container.className = 'export-buttons';
        container.style.cssText = 'display: flex; gap: 8px;';

        formats.forEach(format => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-secondary';
            btn.textContent = format.toUpperCase();
            btn.addEventListener('click', () => {
                if (onExport) onExport(format);
            });
            container.appendChild(btn);
        });

        return container;
    }

    /**
     * 创建进度条
     * @param {Object} options - 配置选项
     * @returns {Object} - 包含元素和更新方法的对象
     */
    static createProgressBar(options = {}) {
        const {
            showLabel = true,
            showPercentage = true,
            height = 8
        } = options;

        const container = document.createElement('div');
        container.className = 'progress-container';
        container.style.cssText = 'margin-bottom: 16px;';

        const labelRow = document.createElement('div');
        labelRow.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; font-weight: 600; color: var(--text-secondary);';

        const label = document.createElement('span');
        label.className = 'progress-label';
        if (showLabel) label.textContent = '处理中...';

        const percentage = document.createElement('span');
        percentage.className = 'progress-percentage';
        if (showPercentage) percentage.textContent = '0%';

        labelRow.appendChild(label);
        labelRow.appendChild(percentage);

        const barContainer = document.createElement('div');
        barContainer.style.cssText = `
            width: 100%;
            height: ${height}px;
            background: var(--zinc-200);
            border-radius: ${height / 2}px;
            overflow: hidden;
        `;

        const bar = document.createElement('div');
        bar.className = 'progress-bar';
        bar.style.cssText = `
            height: 100%;
            width: 0%;
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
            border-radius: ${height / 2}px;
            transition: width 0.3s ease;
        `;

        barContainer.appendChild(bar);
        container.appendChild(labelRow);
        container.appendChild(barContainer);

        return {
            element: container,
            update(percent, text) {
                bar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
                if (showPercentage) percentage.textContent = `${Math.round(percent)}%`;
                if (showLabel && text) label.textContent = text;
            },
            complete() {
                this.update(100, '完成');
            }
        };
    }

    /**
     * 创建模态框
     * @param {Object} options - 配置选项
     * @returns {Object} - 包含元素和控制方法的对象
     */
    static createModal(options = {}) {
        const {
            title = '提示',
            content = '',
            size = 'md', // sm, md, lg
            closable = true,
            showFooter = true,
            onConfirm = null,
            onCancel = null
        } = options;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';

        const sizeMap = {
            sm: 'max-width: 400px',
            md: 'max-width: 600px',
            lg: 'max-width: 900px'
        };

        modal.style.cssText = `
            background: white;
            border-radius: 16px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            ${sizeMap[size]}
            width: 90%;
            max-height: 90vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            transform: scale(0.9);
            transition: transform 0.3s ease;
        `;

        // 头部
        const header = document.createElement('div');
        header.className = 'modal-header';
        header.style.cssText = `
            padding: 20px 24px;
            border-bottom: 1px solid var(--border-light);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const titleEl = document.createElement('h3');
        titleEl.style.cssText = 'margin: 0; font-size: 1.1rem; font-weight: 700;';
        titleEl.textContent = title;

        header.appendChild(titleEl);

        if (closable) {
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            closeBtn.style.cssText = 'background: none; border: none; cursor: pointer; padding: 4px; color: var(--text-muted);';
            closeBtn.addEventListener('click', () => this.close());
            header.appendChild(closeBtn);
        }

        // 内容
        const body = document.createElement('div');
        body.className = 'modal-body';
        body.style.cssText = 'padding: 24px; overflow-y: auto;';
        if (typeof content === 'string') {
            body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            body.appendChild(content);
        }

        // 底部
        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        footer.style.cssText = `
            padding: 16px 24px;
            border-top: 1px solid var(--border-light);
            display: flex;
            justify-content: flex-end;
            gap: 12px;
        `;

        if (showFooter) {
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = '取消';
            cancelBtn.addEventListener('click', () => {
                if (onCancel) onCancel();
                this.close();
            });

            const confirmBtn = document.createElement('button');
            confirmBtn.className = 'btn btn-primary';
            confirmBtn.textContent = '确定';
            confirmBtn.addEventListener('click', () => {
                if (onConfirm) onConfirm();
                this.close();
            });

            footer.appendChild(cancelBtn);
            footer.appendChild(confirmBtn);
        }

        modal.appendChild(header);
        modal.appendChild(body);
        if (showFooter) modal.appendChild(footer);
        overlay.appendChild(modal);

        // 显示动画
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);

        return {
            element: overlay,
            close() {
                overlay.style.opacity = '0';
                modal.style.transform = 'scale(0.9)';
                setTimeout(() => overlay.remove(), 300);
            },
            setContent(newContent) {
                if (typeof newContent === 'string') {
                    body.innerHTML = newContent;
                } else if (newContent instanceof HTMLElement) {
                    body.innerHTML = '';
                    body.appendChild(newContent);
                }
            }
        };
    }

    /**
     * 创建确认对话框
     */
    static confirm(message, onConfirm, onCancel) {
        const modal = this.createModal({
            title: '确认',
            content: `<p style="margin: 0; color: var(--text-primary);">${message}</p>`,
            size: 'sm',
            onConfirm,
            onCancel
        });
        document.body.appendChild(modal.element);
    }

    /**
     * 创建输入对话框
     */
    static prompt(title, placeholder = '', defaultValue = '', onConfirm, onCancel) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.placeholder = placeholder;
        input.value = defaultValue;

        const modal = this.createModal({
            title,
            content: input,
            size: 'sm',
            onConfirm: () => onConfirm(input.value),
            onCancel
        });

        document.body.appendChild(modal.element);
        setTimeout(() => input.focus(), 100);
    }
}

// 导出便捷方法
export const UI = UIComponents;
export const showNotification = UIComponents.showNotification.bind(UIComponents);
export const showLoading = UIComponents.showLoading.bind(UIComponents);

export default UIComponents;
