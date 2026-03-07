/**
 * BOM综合管理平台 - 微交互动画模块
 * 提供微妙的交互效果增强用户体验
 */

/**
 * 微交互效果类
 */
export class MicroInteractions {
    /**
     * 按钮涟漪效果
     */
    static buttonRipple() {
        document.addEventListener('click', (e) => {
            const button = e.target.closest('.btn, button');
            if (!button || button.disabled) return;

            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.cssText = `
                position: absolute;
                background: rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple-animation 0.6s ease-out;
                pointer-events: none;
            `;

            const rect = button.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
            ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';

            button.style.position = button.style.position || 'relative';
            button.style.overflow = 'hidden';
            button.appendChild(ripple);

            setTimeout(() => ripple.remove(), 600);
        }, true);
    }

    /**
     * 卡片3D悬停效果
     */
    static card3DTilt() {
        document.addEventListener('mousemove', (e) => {
            const card = e.target.closest('.card, .bento-item, .tool-card');
            if (!card) return;

            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        document.addEventListener('mouseleave', (e) => {
            const card = e.target.closest('.card, .bento-item, .tool-card');
            if (!card) return;
            card.style.transform = '';
        }, true);
    }

    /**
     * 元素入场交错动画
     */
    static staggeredFadeIn(selector = '.card, .bento-item, .panel') {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el, index) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';

            setTimeout(() => {
                el.style.transition = 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    /**
     * 文本打字机效果
     */
    static typewriter(element, text, options = {}) {
        const {
            speed = 50,
            delay = 0,
            cursor = true,
            onComplete = null
        } = options;

        const originalText = element.textContent;
        element.textContent = '';

        let i = 0;
        const type = () => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            } else {
                if (onComplete) onComplete();
            }
        };

        setTimeout(type, delay);
    }

    /**
     * 数字滚动动画
     */
    static countUp(element, target, options = {}) {
        const {
            duration = 1000,
            start = 0,
            decimals = 0,
            separator = ',',
            onComplete = null
        } = options;

        const startTime = performance.now();
        const difference = target - start;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out quart)
            const eased = 1 - Math.pow(1 - progress, 4);

            const current = start + difference * eased;
            element.textContent = current.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, separator);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                if (onComplete) onComplete();
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * 磁性按钮效果
     */
    static magneticButton() {
        document.addEventListener('mousemove', (e) => {
            const button = e.target.closest('.btn-magnetic');
            if (!button || button.disabled) return;

            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;

            button.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });

        document.addEventListener('mouseleave', (e) => {
            const button = e.target.closest('.btn-magnetic');
            if (!button) return;
            button.style.transform = '';
        }, true);
    }

    /**
     * 滚动触发动画
     */
    static scrollTrigger() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                    entry.target.style.animationPlayState = 'running';
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('[data-animate]').forEach(el => {
            el.style.animationPlayState = 'paused';
            observer.observe(el);
        });

        return observer;
    }

    /**
     * 进度条动画
     */
    static progressAnimate(element, target, options = {}) {
        const {
            duration = 500,
            easing = 'ease-out',
            color = '',
            backgroundColor = '',
            striped = false
        } = options;

        element.style.transition = `width ${duration}ms ${easing}`;
        element.style.width = target + '%';

        if (color) element.style.backgroundColor = color;
        if (backgroundColor) element.style.backgroundColor = backgroundColor;

        if (striped) {
            element.classList.add('progress-striped');
        }
    }

    /**
     * 震动反馈（移动端）
     */
    static vibrate(duration = 50) {
        if ('vibrate' in navigator) {
            navigator.vibrate(duration);
        }
    }

    /**
     * 音效反馈
     */
    static playSound(type = 'click') {
        const sounds = {
            click: { frequency: 800, duration: 0.05 },
            success: { frequency: 600, duration: 0.1 },
            error: { frequency: 200, duration: 0.15 },
            warning: { frequency: 400, duration: 0.1 }
        };

        const sound = sounds[type];
        if (!sound) return;

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.frequency.value = sound.frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + sound.duration);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + sound.duration);
        } catch (e) {
            // AudioContext not supported
        }
    }

    /**
     * 复制成功反馈动画
     */
    static copyFeedback(element) {
        const originalText = element.textContent;
        const originalBg = element.style.backgroundColor;

        element.textContent = '✓ 已复制';
        element.style.backgroundColor = 'var(--success-color)';
        element.style.color = 'white';

        this.vibrate(30);
        this.playSound('success');

        setTimeout(() => {
            element.textContent = originalText;
            element.style.backgroundColor = originalBg;
            element.style.color = '';
        }, 1500);
    }

    /**
     * 加载骨架屏
     */
    static skeleton(selector, count = 3) {
        const container = document.querySelector(selector);
        if (!container) return;

        const skeletons = [];

        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = 'skeleton-item';
            skeleton.innerHTML = `
                <div class="skeleton-avatar"></div>
                <div class="skeleton-content">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text short"></div>
                </div>
            `;
            skeleton.style.cssText = `
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                background: var(--bg-light);
                border-radius: var(--radius-md);
                margin-bottom: 12px;
            `;
            container.appendChild(skeleton);
            skeletons.push(skeleton);
        }

        // 添加骨架屏动画样式
        if (!document.getElementById('skeleton-styles')) {
            const style = document.createElement('style');
            style.id = 'skeleton-styles';
            style.textContent = `
                @keyframes skeleton-loading {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                .skeleton-avatar,
                .skeleton-title,
                .skeleton-text {
                    background: linear-gradient(90deg, var(--zinc-200) 25%, var(--zinc-100) 50%, var(--zinc-200) 75%);
                    background-size: 200% 100%;
                    animation: skeleton-loading 1.5s ease-in-out infinite;
                    border-radius: 4px;
                }
                .skeleton-avatar {
                    width: 48px;
                    height: 48px;
                    flex-shrink: 0;
                    border-radius: 50%;
                }
                .skeleton-title {
                    width: 60%;
                    height: 16px;
                    margin-bottom: 8px;
                }
                .skeleton-text {
                    width: 100%;
                    height: 14px;
                }
                .skeleton-text.short {
                    width: 40%;
                }
            `;
            document.head.appendChild(style);
        }

        return {
            remove() {
                skeletons.forEach(s => s.remove());
            }
        };
    }

    /**
     * 初始化所有微交互
     */
    static init(options = {}) {
        const {
            ripple = true,
            card3D = true,
            stagger = true,
            magnetic = false,
            scrollTrigger = true
        } = options;

        if (ripple) this.buttonRipple();
        if (card3D) this.card3DTilt();
        if (stagger) this.staggeredFadeIn();
        if (magnetic) this.magneticButton();
        if (scrollTrigger) this.scrollTrigger();

        // 添加触摸反馈
        if ('ontouchstart' in window) {
            document.querySelectorAll('.btn, button').forEach(btn => {
                btn.addEventListener('touchstart', () => this.vibrate(30), { passive: true });
            });
        }
    }
}

// 添加CSS动画
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes ripple-animation {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }

    @keyframes animate-in {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .animate-in {
        animation: animate-in 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    .btn-magnetic {
        transition: transform 0.2s ease-out;
    }

    .progress-striped {
        background-image: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.15) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0.15) 75%,
            transparent 75%,
            transparent
        );
        background-size: 1rem 1rem;
        animation: progress-stripes 1s linear infinite;
    }

    @keyframes progress-stripes {
        from { background-position: 1rem 0; }
        to { background-position: 0 0; }
    }
`;

document.head.appendChild(styleSheet);

export default MicroInteractions;
