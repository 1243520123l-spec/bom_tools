/**
 * BOM综合管理平台 - 二维码生成工具模块
 * 批量生成样机SN二维码
 */

import { ExcelProcessor } from '../modules/excel-processor.js';
import { UIComponents } from '../modules/ui-components.js';
import { Validator } from '../modules/validator.js';
import { Utils } from '../core/utils.js';
import { Config } from '../core/config.js';

/**
 * 二维码生成工具类
 */
class QRCodeTool {
    constructor() {
        // Excel数据
        this.excelData = [];
        this.qrCodes = [];

        // 配置
        this.config = {
            columns: 3, // 每行二维码数量
            size: 200,  // 二维码大小
            margin: 2,
            template: 'default'
        };

        // 当前步骤
        this.currentStep = 1;

        this.init();
    }

    init() {
        this.bindEvents();
        this.initStepIndicator();
    }

    bindEvents() {
        // 文件上传
        document.getElementById('fileUpload')?.addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });

        // 步骤导航
        document.querySelectorAll('.step-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const step = parseInt(e.currentTarget.dataset.step);
                if (step <= this.getMaxStep()) {
                    this.goToStep(step);
                }
            });
        });

        // 模板选择
        document.querySelectorAll('.template-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.selectTemplate(e.currentTarget);
            });
        });

        // 列数选择
        document.querySelectorAll('[data-columns]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.config.columns = parseInt(e.currentTarget.dataset.columns);
                this.updateColumnSelection();
                this.renderPreview();
            });
        });

        // 生成按钮
        document.getElementById('btnGenerate')?.addEventListener('click', () => {
            this.generateQRCodes();
        });

        // 导出按钮
        document.getElementById('btnExportWord')?.addEventListener('click', () => {
            this.exportToWord();
        });

        document.getElementById('btnExportImage')?.addEventListener('click', () => {
            this.exportToImage();
        });
    }

    /**
     * 初始化步骤指示器
     */
    initStepIndicator() {
        const steps = document.querySelectorAll('.step-item');
        steps.forEach((step, index) => {
            step.dataset.step = index + 1;
        });
    }

    /**
     * 获取可达到的最大步骤
     */
    getMaxStep() {
        if (this.currentStep === 1 && this.excelData.length > 0) return 2;
        if (this.currentStep === 2) return 3;
        return 1;
    }

    /**
     * 跳转到指定步骤
     */
    goToStep(step) {
        // 隐藏所有步骤内容
        document.querySelectorAll('.step-content').forEach(content => {
            content.classList.remove('active');
        });

        // 显示目标步骤内容
        document.getElementById(`step${step}`)?.classList.add('active');

        // 更新步骤指示器
        document.querySelectorAll('.step-item').forEach((item, index) => {
            const itemStep = index + 1;
            item.classList.remove('active', 'completed');

            if (itemStep === step) {
                item.classList.add('active');
            } else if (itemStep < step) {
                item.classList.add('completed');
            }
        });

        this.currentStep = step;
    }

    /**
     * 处理文件上传
     */
    async handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const validation = Validator.validateExcelFile(file);
        if (!validation.valid) {
            UIComponents.showNotification('error', validation.errors.join(', '));
            return;
        }

        const closeLoading = UIComponents.showLoading('正在读取Excel...');

        try {
            const workbook = await ExcelProcessor.readFile(file);
            const parsed = ExcelProcessor.parseData(workbook);

            this.excelData = parsed.data;

            // 更新UI
            document.getElementById('fileInfo').textContent = `${file.name} (${parsed.dataRows}行)`;
            document.getElementById('fileInfo').style.display = 'block';

            // 尝试自动识别SN列
            this.autoDetectSNColumn(parsed.headers);

            // 启用下一步
            document.querySelectorAll('.step-item')[1].style.pointerEvents = 'auto';
            document.querySelectorAll('.step-item')[1].style.opacity = '1';

            UIComponents.showNotification('success', `成功读取${parsed.dataRows}行数据`);

            // 自动跳到下一步
            setTimeout(() => this.goToStep(2), 500);
        } catch (err) {
            UIComponents.showNotification('error', `文件读取失败: ${err.message}`);
        } finally {
            closeLoading();
        }
    }

    /**
     * 自动识别SN列
     */
    autoDetectSNColumn(headers) {
        const snKeywords = ['SN', '序列号', '序号', 'Serial', '号码', '编号'];
        const select = document.getElementById('snColumn');

        if (!select) return;

        select.innerHTML = '<option value="">-- 请选择 --</option>';

        headers.forEach((header, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.text = header || `列${index + 1}`;
            select.appendChild(opt);
        });

        // 自动选择
        for (const keyword of snKeywords) {
            const index = headers.findIndex(h => h && h.toLowerCase().includes(keyword.toLowerCase()));
            if (index !== -1) {
                select.value = index;
                break;
            }
        }
    }

    /**
     * 选择模板
     */
    selectTemplate(element) {
        document.querySelectorAll('.template-item').forEach(item => {
            item.classList.remove('active');
        });
        element.classList.add('active');

        this.config.template = element.dataset.template;
    }

    /**
     * 更新列数选择UI
     */
    updateColumnSelection() {
        document.querySelectorAll('[data-columns]').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.columns) === this.config.columns) {
                btn.classList.add('active');
            }
        });
    }

    /**
     * 生成二维码
     */
    async generateQRCodes() {
        if (this.excelData.length === 0) {
            UIComponents.showNotification('warning', '请先上传Excel文件');
            return;
        }

        const snColumnIndex = document.getElementById('snColumn')?.value;
        if (snColumnIndex === '' || snColumnIndex === null) {
            UIComponents.showNotification('warning', '请选择SN列');
            return;
        }

        const snColumn = parseInt(snColumnIndex);
        const headers = Object.keys(this.excelData[0]).filter(k => k !== '_rowIndex');
        const snKey = headers[snColumn] || Object.keys(this.excelData[0])[snColumn];

        const closeLoading = UIComponents.showLoading('正在生成二维码...', { overlay: true });
        const progressBar = UIComponents.createProgressBar({ showLabel: true });

        try {
            this.qrCodes = [];
            const total = this.excelData.length;

            for (let i = 0; i < total; i++) {
                const row = this.excelData[i];
                const sn = String(row[snKey] || row['_rowIndex'] || i + 1).trim();

                if (!sn) continue;

                // 生成二维码
                const canvas = document.createElement('canvas');
                await QRCode.toCanvas(canvas, sn, {
                    width: this.config.size,
                    margin: this.config.margin,
                    errorCorrectionLevel: 'M'
                });

                this.qrCodes.push({
                    sn: sn,
                    canvas: canvas,
                    data: row
                });

                // 更新进度
                const percent = ((i + 1) / total * 100).toFixed(1);
                progressBar.update(percent, `生成中 ${i + 1}/${total}`);
            }

            progressBar.complete();
            this.renderPreview();

            // 进入下一步
            setTimeout(() => {
                closeLoading();
                this.goToStep(3);
                UIComponents.showNotification('success', `成功生成${this.qrCodes.length}个二维码`);
            }, 500);

        } catch (err) {
            closeLoading();
            UIComponents.showNotification('error', `生成失败: ${err.message}`);
        }
    }

    /**
     * 渲染预览
     */
    renderPreview() {
        const container = document.getElementById('qrPreview');
        if (!container) return;

        container.innerHTML = '';
        container.className = `qrcode-grid cols-${this.config.columns}`;

        this.qrCodes.forEach(qr => {
            const item = document.createElement('div');
            item.className = 'qrcode-item';

            const img = document.createElement('img');
            img.src = qr.canvas.toDataURL();
            img.className = 'qrcode-image';

            const label = document.createElement('div');
            label.className = 'qrcode-label';

            const sn = document.createElement('div');
            sn.className = 'qrcode-sn';
            sn.textContent = qr.sn;

            label.appendChild(sn);
            item.appendChild(img);
            item.appendChild(label);
            container.appendChild(item);
        });
    }

    /**
     * 导出到Word
     */
    async exportToWord() {
        if (this.qrCodes.length === 0) {
            UIComponents.showNotification('warning', '没有可导出的二维码');
            return;
        }

        const closeLoading = UIComponents.showLoading('正在生成Word文档...');

        try {
            // 创建新文档
            const doc = new jspdf.jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const qrSize = 40;
            const spacing = 10;

            const cols = this.config.columns;
            const itemWidth = (pageWidth - 2 * margin) / cols;
            const itemHeight = qrSize + 15;

            let x = margin;
            let y = margin;
            let col = 0;

            this.qrCodes.forEach((qr, index) => {
                // 检查是否需要换页
                if (y + itemHeight > pageHeight - margin) {
                    doc.addPage();
                    y = margin;
                    col = 0;
                    x = margin;
                }

                // 添加二维码图片
                const imgData = qr.canvas.toDataURL('image/png');
                doc.addImage(imgData, 'PNG', x + (itemWidth - qrSize) / 2, y, qrSize, qrSize);

                // 添加SN文本
                doc.setFontSize(8);
                doc.text(qr.sn, x + itemWidth / 2, y + qrSize + 8, { align: 'center' });

                // 移动到下一个位置
                col++;
                if (col >= cols) {
                    col = 0;
                    x = margin;
                    y += itemHeight + spacing;
                } else {
                    x += itemWidth;
                }
            });

            // 保存
            const filename = `二维码_${Utils.formatDateTime(new Date(), 'YYYYMMDD_HHmmss')}.pdf`;
            doc.save(filename);

            UIComponents.showNotification('success', 'Word文档生成成功');
        } catch (err) {
            UIComponents.showNotification('error', `导出失败: ${err.message}`);
        } finally {
            closeLoading();
        }
    }

    /**
     * 导出为图片
     */
    async exportToImage() {
        if (this.qrCodes.length === 0) {
            UIComponents.showNotification('warning', '没有可导出的二维码');
            return;
        }

        const closeLoading = UIComponents.showLoading('正在生成图片...');

        try {
            const container = document.getElementById('qrPreview');
            const canvas = await html2canvas(container, {
                scale: 2,
                backgroundColor: '#ffffff'
            });

            canvas.toBlob(blob => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `二维码_${Utils.formatDateTime(new Date(), 'YYYYMMDD_HHmmss')}.png`;
                a.click();
                URL.revokeObjectURL(url);

                UIComponents.showNotification('success', '图片生成成功');
                closeLoading();
            });
        } catch (err) {
            UIComponents.showNotification('error', `导出失败: ${err.message}`);
            closeLoading();
        }
    }
}

// 导出
export default QRCodeTool;
