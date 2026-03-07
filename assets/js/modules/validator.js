/**
 * BOM综合管理平台 - 数据验证模块
 * 提供各种数据验证功能
 */

import { Config } from '../core/config.js';

/**
 * 数据验证器类
 */
export class Validator {
    /**
     * 验证Excel文件
     * @param {File} file - 文件对象
     * @param {Object} options - 验证选项
     * @returns {Object} - 验证结果 {valid: boolean, errors: Array}
     */
    static validateExcelFile(file, options = {}) {
        const {
            maxSize = Config.excel.maxFileSize,
            allowedTypes = Config.excel.supportedFormats
        } = options;

        const errors = [];

        // 检查文件是否存在
        if (!file) {
            errors.push('文件不存在');
            return { valid: false, errors };
        }

        // 检查文件名
        if (!file.name) {
            errors.push('文件名无效');
        }

        // 检查文件扩展名
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(ext)) {
            errors.push(Config.messages.invalidFileType(allowedTypes));
        }

        // 检查文件大小
        if (file.size > maxSize) {
            errors.push(Config.messages.fileTooLarge(maxSize));
        }

        // 检查文件是否为空
        if (file.size === 0) {
            errors.push('文件为空');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings: []
        };
    }

    /**
     * 验证BOM数据
     * @param {Object} bomData - BOM数据对象
     * @returns {Object} - 验证结果
     */
    static validateBOMData(bomData) {
        const errors = [];
        const warnings = [];

        if (!bomData) {
            errors.push('BOM数据为空');
            return { valid: false, errors, warnings };
        }

        // 检查必需字段
        if (!bomData.headers || !Array.isArray(bomData.headers)) {
            errors.push('缺少表头数据');
        }

        if (!bomData.data || !Array.isArray(bomData.data)) {
            errors.push('缺少BOM数据');
        }

        if (bomData.data && bomData.data.length === 0) {
            warnings.push('BOM数据为空');
        }

        // 检查是否有料号列
        if (bomData.headers) {
            const hasPartNumber = bomData.headers.some(h =>
                Config.excel.defaultRequiredKeywords.some(kw => h && h.includes(kw))
            );

            if (!hasPartNumber) {
                warnings.push('未找到料号列');
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * 验证料号格式
     * @param {string} partNumber - 料号
     * @param {Object} options - 验证选项
     * @returns {Object} - 验证结果
     */
    static validatePartNumber(partNumber, options = {}) {
        const {
            minLength = 1,
            maxLength = 50,
            pattern = null,
            allowEmpty = false
        } = options;

        const errors = [];

        // 检查空值
        if (!partNumber || partNumber.trim() === '') {
            if (!allowEmpty) {
                errors.push('料号不能为空');
            }
            return { valid: allowEmpty, errors };
        }

        const trimmed = partNumber.trim();

        // 检查长度
        if (trimmed.length < minLength) {
            errors.push(`料号长度不能少于${minLength}个字符`);
        }

        if (trimmed.length > maxLength) {
            errors.push(`料号长度不能超过${maxLength}个字符`);
        }

        // 检查模式
        if (pattern && !pattern.test(trimmed)) {
            errors.push('料号格式不正确');
        }

        // 检查特殊字符
        const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
        if (invalidChars.test(trimmed)) {
            errors.push('料号包含非法字符');
        }

        return {
            valid: errors.length === 0,
            errors,
            normalized: trimmed
        };
    }

    /**
     * 验证位号格式
     * @param {string} designator - 位号
     * @returns {Object} - 验证结果
     */
    static validateDesignator(designator) {
        const errors = [];

        if (!designator || designator.trim() === '') {
            return { valid: true, errors }; // 位号可以为空
        }

        const trimmed = designator.trim();

        // 检查位号格式 (如: R1, C10, U100-A)
        const pattern = /^[A-Za-z]+\d+[A-Za-z\d\-_]*$/;

        if (!pattern.test(trimmed)) {
            errors.push('位号格式不正确，应为字母开头+数字的组合');
        }

        return {
            valid: errors.length === 0,
            errors,
            normalized: trimmed
        };
    }

    /**
     * 验证数量
     * @param {number|string} quantity - 数量
     * @param {Object} options - 验证选项
     * @returns {Object} - 验证结果
     */
    static validateQuantity(quantity, options = {}) {
        const {
            min = 0,
            max = 999999,
            allowDecimal = true
        } = options;

        const errors = [];

        // 转换为数字
        const num = typeof quantity === 'number' ? quantity : parseFloat(quantity);

        if (isNaN(num)) {
            errors.push('数量不是有效的数字');
            return { valid: false, errors };
        }

        if (num < min) {
            errors.push(`数量不能小于${min}`);
        }

        if (num > max) {
            errors.push(`数量不能大于${max}`);
        }

        if (!allowDecimal && !Number.isInteger(num)) {
            errors.push('数量必须是整数');
        }

        return {
            valid: errors.length === 0,
            errors,
            normalized: num
        };
    }

    /**
     * 验证URL
     * @param {string} url - URL字符串
     * @returns {Object} - 验证结果
     */
    static validateURL(url) {
        const errors = [];

        if (!url || url.trim() === '') {
            errors.push('URL不能为空');
            return { valid: false, errors };
        }

        try {
            new URL(url);
            return { valid: true, errors };
        } catch (e) {
            errors.push('URL格式不正确');
            return { valid: false, errors };
        }
    }

    /**
     * 验证邮箱
     * @param {string} email - 邮箱地址
     * @returns {Object} - 验证结果
     */
    static validateEmail(email) {
        const errors = [];

        if (!email || email.trim() === '') {
            errors.push('邮箱不能为空');
            return { valid: false, errors };
        }

        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!pattern.test(email)) {
            errors.push('邮箱格式不正确');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 验证二维码内容
     * @param {string} content - 二维码内容
     * @returns {Object} - 验证结果
     */
    static validateQRContent(content) {
        const errors = [];

        if (!content || content.trim() === '') {
            errors.push('二维码内容不能为空');
            return { valid: false, errors };
        }

        if (content.length > 500) {
            errors.push('二维码内容过长（最多500字符）');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * 批量验证
     * @param {Array} items - 数据项数组
     * @param {Function} validator - 验证函数
     * @returns {Object} - 批量验证结果
     */
    static validateBatch(items, validator) {
        const results = [];
        let validCount = 0;
        let errorCount = 0;

        items.forEach((item, index) => {
            const result = validator(item);
            result.index = index;
            results.push(result);

            if (result.valid) {
                validCount++;
            } else {
                errorCount++;
            }
        });

        return {
            total: items.length,
            valid: validCount,
            errors: errorCount,
            results
        };
    }

    /**
     * 创建验证规则
     * @param {Object} rules - 验证规则对象
     * @returns {Function} - 验证函数
     */
    static createSchema(rules) {
        return (data) => {
            const errors = [];
            const warnings = [];

            for (const [field, rule] of Object.entries(rules)) {
                const value = data[field];

                // 必填验证
                if (rule.required && (!value || value.toString().trim() === '')) {
                    errors.push(`${field}为必填项`);
                    continue;
                }

                // 如果值为空且非必填，跳过其他验证
                if (!value || value.toString().trim() === '') {
                    continue;
                }

                // 类型验证
                if (rule.type) {
                    let typeValid = true;
                    switch (rule.type) {
                        case 'number':
                            if (isNaN(Number(value))) typeValid = false;
                            break;
                        case 'email':
                            if (!this.validateEmail(value).valid) typeValid = false;
                            break;
                        case 'url':
                            if (!this.validateURL(value).valid) typeValid = false;
                            break;
                    }
                    if (!typeValid) {
                        errors.push(`${field}类型不正确`);
                    }
                }

                // 长度验证
                if (rule.minLength !== undefined && value.length < rule.minLength) {
                    errors.push(`${field}长度不能少于${rule.minLength}个字符`);
                }
                if (rule.maxLength !== undefined && value.length > rule.maxLength) {
                    errors.push(`${field}长度不能超过${rule.maxLength}个字符`);
                }

                // 范围验证
                if (rule.min !== undefined && Number(value) < rule.min) {
                    errors.push(`${field}不能小于${rule.min}`);
                }
                if (rule.max !== undefined && Number(value) > rule.max) {
                    errors.push(`${field}不能大于${rule.max}`);
                }

                // 正则验证
                if (rule.pattern && !rule.pattern.test(value)) {
                    errors.push(`${field}格式不正确`);
                }

                // 自定义验证
                if (rule.validator && !rule.validator(value, data)) {
                    errors.push(`${field}验证失败: ${rule.message || '格式不正确'}`);
                }
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings
            };
        };
    }
}

// 预定义验证规则
export const ValidationRules = {
    bomRow: Validator.createSchema({
        料号: { required: true, minLength: 1, maxLength: 50 },
        位号: { required: false },
        数量: { required: false, type: 'number', min: 0 },
        名称: { required: false, maxLength: 100 },
        描述: { required: false, maxLength: 200 }
    }),

    searchQuery: Validator.createSchema({
        keyword: { required: true, minLength: 1 },
        field: { required: false }
    }),

    exportOptions: Validator.createSchema({
        format: { required: true },
        filename: { required: true, minLength: 1, maxLength: 100 }
    })
};

export default Validator;
