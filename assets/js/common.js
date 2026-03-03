/**
 * BOM综合管理平台 - 通用JavaScript (Design-Taste-Frontend 优化版)
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
        
        // SVG 图标 - 替代 emoji
        const icons = {
            success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
            error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
            warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
            info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`
        };
        
        notification.innerHTML = `
            <span style="display:flex;align-items:center;color:var(--${type === 'error' ? 'danger' : type === 'info' ? 'info' : type === 'warning' ? 'warning' : 'success'}-color);">${icons[type] || icons.info}</span>
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

// DOM Ready 事件
document.addEventListener('DOMContentLoaded', () => {
    // 为所有按钮添加点击反馈 - 触觉效果
    document.querySelectorAll('.btn, button').forEach(btn => {
        btn.addEventListener('mousedown', function(e) {
            if (!this.disabled) {
                this.style.transform = 'scale(0.98)';
            }
        });
        
        btn.addEventListener('mouseup', function(e) {
            if (!this.disabled) {
                this.style.transform = '';
            }
        });
        
        btn.addEventListener('mouseleave', function(e) {
            if (!this.disabled) {
                this.style.transform = '';
            }
        });
    });
    
    // 为卡片添加微妙的入场动画
    const cards = document.querySelectorAll('.card, .bento-item, .panel');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s var(--ease-smooth), transform 0.5s var(--ease-spring)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
    });
});
