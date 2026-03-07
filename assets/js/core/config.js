/**
 * BOM综合管理平台 - 配置管理模块
 * 集中管理应用配置、常量和CDN资源
 */

export const Config = {
    // CDN资源配置
    cdn: {
        xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        xlsxIntegrity: 'sha384-...',
        exceljs: 'https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js',
        qrcode: 'https://cdn.jsdelivr.net/npm/qrcode@1.5.1/build/qrcode.min.js',
        jspdf: 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',
        html2canvas: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
        fileSaver: 'https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js',
        geistFont: 'https://cdn.jsdelivr.net/npm/geist@1.2.0/dist/fonts/geist-sans/style.css'
    },

    // Excel配置
    excel: {
        defaultRequiredKeywords: ['料号', 'PN', 'Part Number'],
        defaultOptionalKeywords: ['位号', '名称', 'Name', '描述', 'Description', 'Designator'],
        maxSearchRows: 20,
        supportedFormats: ['.xlsx', '.xls', '.csv'],
        maxFileSize: 50 * 1024 * 1024 // 50MB
    },

    // UI配置
    ui: {
        notification: {
            duration: 3000,
            position: 'top-right'
        },
        loading: {
            minDisplayTime: 500
        },
        animation: {
            duration: 300,
            easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
        }
    },

    // 文件导出配置
    export: {
        defaultDateFormat: 'YYYY-MM-DD HH:mm:ss',
        bomCharset: '\uFEFF' // UTF-8 BOM
    },

    // BOM检查配置
    bomCheck: {
        ignorePatterns: [
            /^Test/,
            /^Dummy/,
            /^Sample/
        ],
        compareFields: ['料号', '位号', '数量', '描述'],
        toleranceFields: {
            '数量': { tolerance: 0, type: 'exact' }
        }
    },

    // 位号查询配置
    query: {
        searchFields: ['料号', '位号', '名称'],
        highlightColor: '#D4A574',
        maxResults: 1000
    },

    // 二维码生成配置
    qrcode: {
        defaultSize: 200,
        defaultMargin: 2,
        errorCorrectionLevel: 'M',
        templateDir: 'templates'
    },

    // 应用信息
    app: {
        name: 'BOM综合管理平台',
        version: '2.0.0',
        author: 'BOM Tools Team',
        homepage: 'https://github.com/your-repo/bom-platform'
    },

    // 错误消息
    messages: {
        fileTooLarge: (maxSize) => `文件大小超过限制 (${(maxSize / 1024 / 1024).toFixed(1)}MB)`,
        invalidFileType: (types) => `不支持的文件类型，请使用: ${types.join(', ')}`,
        noHeaderFound: '未找到有效的表头行，请检查Excel文件格式',
        emptyFile: '文件为空或无法读取',
        loadFailed: '文件加载失败',
        exportFailed: '导出失败',
        searchNoResults: '未找到匹配结果',
        compareComplete: '比对完成',
        processing: '处理中...'
    }
};

// 创建便捷访问器
export const CDN = Config.cdn;
export const ExcelConfig = Config.excel;
export const UIConfig = Config.ui;
export const Messages = Config.messages;

// 导出默认配置
export default Config;
