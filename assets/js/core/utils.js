/**
 * BOM综合管理平台 - 通用工具函数模块
 * 从common.js重构而来，提供纯函数工具
 */

import { Config } from './config.js';

/**
 * 工具函数类
 */
export class Utils {
    /**
     * 格式化文件大小
     * @param {number} bytes - 字节数
     * @returns {string} - 格式化后的文件大小
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 格式化日期时间
     * @param {Date|string|number} date - 日期对象/字符串/时间戳
     * @param {string} format - 格式模板
     * @returns {string} - 格式化后的日期字符串
     */
    static formatDateTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
        const d = date instanceof Date ? date : new Date(date);

        if (isNaN(d.getTime())) return '';

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');

        return format
            .replace('YYYY', year)
            .replace('MM', month)
            .replace('DD', day)
            .replace('HH', hours)
            .replace('mm', minutes)
            .replace('ss', seconds);
    }

    /**
     * 防抖函数
     * @param {Function} func - 要执行的函数
     * @param {number} wait - 等待时间(ms)
     * @returns {Function}
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * 节流函数
     * @param {Function} func - 要执行的函数
     * @param {number} limit - 限制时间(ms)
     * @returns {Function}
     */
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * 深度克隆对象
     * @param {*} obj - 要克隆的对象
     * @returns {*} - 克隆后的对象
     */
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (obj instanceof Object) {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.deepClone(obj[key]);
            });
            return copy;
        }
    }

    /**
     * 复制文本到剪贴板
     * @param {string} text - 要复制的文本
     * @returns {Promise<boolean>}
     */
    static async copyToClipboard(text) {
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
    }

    /**
     * 下载文件
     * @param {Blob|string} content - 文件内容或Blob对象
     * @param {string} filename - 文件名
     * @param {string} mimeType - MIME类型
     */
    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /**
     * 解析Excel列名(如A, B, AA)
     * @param {number} num - 列序号(从1开始)
     * @returns {string} - 列名
     */
    static getColumnName(num) {
        let result = '';
        while (num > 0) {
            num--;
            result = String.fromCharCode(65 + (num % 26)) + result;
            num = Math.floor(num / 26);
        }
        return result || 'A';
    }

    /**
     * 高亮搜索关键词
     * @param {string} text - 原文本
     * @param {string} keyword - 关键词
     * @param {string} className - 高亮类名
     * @returns {string} - 高亮后的HTML
     */
    static highlightKeyword(text, keyword, className = 'highlight') {
        if (!keyword) return text;
        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, `<span class="${className}">$1</span>`);
    }

    /**
     * 转义HTML特殊字符
     * @param {string} text - 原文本
     * @returns {string} - 转义后的文本
     */
    static escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * 解析Excel列名(如A, B, AA)
     * @param {number} num - 列序号(从1开始)
     * @returns {string} - 列名
     */
    static columnNameToNumber(column) {
        let num = 0;
        for (let i = 0; i < column.length; i++) {
            num = num * 26 + (column.charCodeAt(i) - 64);
        }
        return num;
    }

    /**
     * 数组去重
     * @param {Array} array - 原数组
     * @param {string|Function} key - 去重键或函数
     * @returns {Array} - 去重后的数组
     */
    static unique(array, key) {
        if (!key) return [...new Set(array)];

        const seen = new Set();
        return array.filter(item => {
            const k = typeof key === 'function' ? key(item) : item[key];
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }

    /**
     * 数组分组
     * @param {Array} array - 原数组
     * @param {string|Function} key - 分组键或函数
     * @returns {Object} - 分组后的对象
     */
    static groupBy(array, key) {
        return array.reduce((result, item) => {
            const k = typeof key === 'function' ? key(item) : item[key];
            (result[k] = result[k] || []).push(item);
            return result;
        }, {});
    }

    /**
     * 延迟执行
     * @param {number} ms - 延迟时间(ms)
     * @returns {Promise}
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 生成UUID
     * @returns {string} - UUID
     */
    static uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * 检查是否为有效的文件类型
     * @param {File} file - 文件对象
     * @param {Array<string>} allowedTypes - 允许的类型
     * @returns {boolean}
     */
    static isValidFileType(file, allowedTypes) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        return allowedTypes.includes(ext);
    }

    /**
     * 检查文件大小是否超限
     * @param {File} file - 文件对象
     * @param {number} maxSize - 最大大小(字节)
     * @returns {boolean}
     */
    static isValidFileSize(file, maxSize = Config.excel.maxFileSize) {
        return file.size <= maxSize;
    }

    /**
     * 本地存储封装
     */
    static Storage = {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.error('Storage get error:', e);
                return defaultValue;
            }
        },
        remove(key) {
            localStorage.removeItem(key);
        },
        clear() {
            localStorage.clear();
        }
    };

    /**
     * URL参数处理
     */
    static URL = {
        getParams() {
            const params = {};
            window.location.search.slice(1).split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                params[decodeURIComponent(key)] = decodeURIComponent(value);
            });
            return params;
        },
        setParam(key, value) {
            const url = new URL(window.location);
            url.searchParams.set(key, value);
            window.history.pushState({}, '', url);
        },
        removeParam(key) {
            const url = new URL(window.location);
            url.searchParams.delete(key);
            window.history.pushState({}, '', url);
        }
    };
}

// 导出单例实例
export const utils = new Utils();
export default Utils;
