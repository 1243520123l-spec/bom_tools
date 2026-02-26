/**
 * BOM综合管理平台 - 通用JavaScript
 */

// 工具函数命名空间
const BOMUtils = {
    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} - 格式化后的文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    /**
     * 显示浮动通知
     * @param {string} type - 通知类型: success, error, warning, info
     * @param {string} message - 通知内容
     * @param {number} duration - 显示时长(ms)，默认3000
     */
    showNotification(type, message, duration = 3000) {
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
        
        // 图标
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        
        notification.innerHTML = `
            <span style="font-size: 18px; font-weight: bold;">${icons[type] || '•'}</span>
            <span>${message}</span>
        `;

        container.appendChild(notification);

        // 自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间(ms)
     * @returns {Function}
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * 节流函数
     * @param {Function} func - 要执行的函数
     * @param {number} limit - 限制时间(ms)
     * @returns {Function}
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * 复制文本到剪贴板
     * @param {string} text - 要复制的文本
     * @returns {Promise<boolean>}
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // 降级方案
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const result = document.execCommand('copy');
            document.body.removeChild(textarea);
            return result;
        }
    },

    /**
     * 下载文件
     * @param {Blob} blob - 文件Blob
     * @param {string} filename - 文件名
     */
    downloadFile(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },

    /**
     * 解析Excel列名(如A, B, AA)
     * @param {number} num - 列序号(从1开始)
     * @returns {string} - 列名
     */
    getColumnName(num) {
        let result = '';
        while (num > 0) {
            num--;
            result = String.fromCharCode(65 + (num % 26)) + result;
            num = Math.floor(num / 26);
        }
        return result || 'A';
    },

    /**
     * 检测Excel表头行
     * @param {Array} rawData - 原始数据数组
     * @param {Array} requiredKeywords - 必需的关键字
     * @param {Array} optionalKeywords - 可选的关键字
     * @returns {number} - 表头行索引，未找到返回-1
     */
    detectHeaderRow(rawData, requiredKeywords = ['料号'], optionalKeywords = ['位号', '名称', '描述']) {
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
};

// 添加slideOut动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// DOM Ready 事件
document.addEventListener('DOMContentLoaded', () => {
    // 自动添加一些交互效果
    
    // 为所有按钮添加点击反馈
    document.querySelectorAll('.btn, button').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (!this.disabled) {
                this.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    this.style.transform = '';
                }, 100);
            }
        });
    });
});
