/* =============================================
   VILA GALÉ + LITORAL VERDE — Landing Page JS
   Interactions & Animations
   ============================================= */

(function () {
    'use strict';

    // ---- DOM Ready ----
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        initHeader();
        initMobileMenu();
        initSmoothScroll();
        initCounterAnimation();
        initFAQ();
        initScrollReveal();
        initStickyMobileCTA();
    }

    // ---- Sticky Header ----
    function initHeader() {
        const header = document.getElementById('header');
        if (!header) return;

        let lastScroll = 0;

        window.addEventListener('scroll', function () {
            const scrollY = window.scrollY;

            if (scrollY > 60) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }

            lastScroll = scrollY;
        }, { passive: true });
    }

    // ---- Mobile Menu ----
    function initMobileMenu() {
        const toggle = document.getElementById('menuToggle');
        const nav = document.getElementById('mainNav');
        if (!toggle || !nav) return;

        toggle.addEventListener('click', function () {
            const isOpen = nav.classList.toggle('active');
            toggle.classList.toggle('active');
            toggle.setAttribute('aria-expanded', isOpen);
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        // Close on nav link click
        nav.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                nav.classList.remove('active');
                toggle.classList.remove('active');
                toggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            });
        });

        // Close on outside click
        document.addEventListener('click', function (e) {
            if (nav.classList.contains('active') && !nav.contains(e.target) && !toggle.contains(e.target)) {
                nav.classList.remove('active');
                toggle.classList.remove('active');
                toggle.setAttribute('aria-expanded', 'false');
                document.body.style.overflow = '';
            }
        });
    }

    // ---- Smooth Scroll ----
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (!target) return;

                e.preventDefault();

                const headerHeight = document.getElementById('header')?.offsetHeight || 72;
                const top = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;

                window.scrollTo({
                    top: top,
                    behavior: 'smooth'
                });
            });
        });
    }

    // ---- Counter Animation ----
    function initCounterAnimation() {
        const counters = document.querySelectorAll('.proof-number[data-target]');
        if (!counters.length) return;

        let animated = false;

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting && !animated) {
                    animated = true;
                    animateCounters(counters);
                }
            });
        }, { threshold: 0.3 });

        const proofBar = document.querySelector('.social-proof-bar');
        if (proofBar) observer.observe(proofBar);
    }

    function animateCounters(counters) {
        counters.forEach(function (counter) {
            const target = parseInt(counter.getAttribute('data-target'));
            const suffix = counter.getAttribute('data-suffix') || '';
            const duration = 2000;
            const startTime = performance.now();

            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Ease out cubic
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = Math.round(eased * target);

                if (target >= 1000) {
                    counter.textContent = '+' + current.toLocaleString('es-AR') + suffix;
                } else {
                    counter.textContent = current + suffix;
                }

                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }

            requestAnimationFrame(update);
        });
    }

    // ---- FAQ Accordion ----
    function initFAQ() {
        const items = document.querySelectorAll('.faq-item');
        if (!items.length) return;

        items.forEach(function (item) {
            const button = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            if (!button || !answer) return;

            button.addEventListener('click', function () {
                const isOpen = item.classList.contains('active');

                // Close all other items
                items.forEach(function (other) {
                    if (other !== item) {
                        other.classList.remove('active');
                        const otherBtn = other.querySelector('.faq-question');
                        const otherAnswer = other.querySelector('.faq-answer');
                        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
                        if (otherAnswer) otherAnswer.style.maxHeight = null;
                    }
                });

                // Toggle current
                if (isOpen) {
                    item.classList.remove('active');
                    button.setAttribute('aria-expanded', 'false');
                    answer.style.maxHeight = null;
                } else {
                    item.classList.add('active');
                    button.setAttribute('aria-expanded', 'true');
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                }
            });
        });
    }

    // ---- Scroll Reveal ----
    function initScrollReveal() {
        const elements = document.querySelectorAll(
            '.solution-card, .benefit-card, .resort-card, .trust-feature, ' +
            '.testimonial-card, .step-card, .faq-item, .inclusion-col, ' +
            '.resort-stat, .problem-layout, .split-layout, .emotional-copy, ' +
            '.section-header, .resort-cta-box, .transparency-note'
        );

        if (!elements.length) return;

        elements.forEach(function (el) {
            el.classList.add('reveal');
        });

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    // Stagger siblings
                    const parent = entry.target.parentElement;
                    const siblings = parent.querySelectorAll('.reveal:not(.visible)');
                    let delay = 0;

                    siblings.forEach(function (sibling) {
                        const siblingRect = sibling.getBoundingClientRect();
                        if (siblingRect.top < window.innerHeight) {
                            setTimeout(function () {
                                sibling.classList.add('visible');
                            }, delay);
                            delay += 80;
                        }
                    });

                    // Always make the observed element visible
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        elements.forEach(function (el) {
            observer.observe(el);
        });
    }

    // ---- Sticky Mobile CTA ----
    function initStickyMobileCTA() {
        const stickyBar = document.getElementById('stickyCta');
        const heroSection = document.getElementById('hero');
        if (!stickyBar || !heroSection) return;

        const observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    stickyBar.classList.remove('visible');
                    stickyBar.setAttribute('aria-hidden', 'true');
                } else {
                    stickyBar.classList.add('visible');
                    stickyBar.setAttribute('aria-hidden', 'false');
                }
            });
        }, { threshold: 0 });

        observer.observe(heroSection);
    }

})();
