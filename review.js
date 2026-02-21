/* =============================================
   REVIEW MODE — Feedback System JS
   Commenting & Export functionality
   ============================================= */

(function () {
    'use strict';

    // ---- Section Configuration ----
    const SECTIONS = [
        { selector: '#hero', label: 'Seção 1 — Hero' },
        { selector: '.social-proof-bar', label: 'Seção 2 — Social Proof' },
        { selector: '.problem-section', label: 'Seção 3 — Problema / Empatia' },
        { selector: '#solucion', label: 'Seção 4 — La Solución' },
        { selector: '.why-brazil', label: 'Seção 5 — Por Qué Brasil' },
        { selector: '.resorts-hero', label: 'Seção 6 — Resorts Overview' },
        { selector: '.resort-cards-section', label: 'Seção 7 — Cards de Resorts' },
        { selector: '#por-que-litoral', label: 'Seção 8 — Por Qué Litoral Verde' },
        { selector: '.inclusions-section', label: 'Seção 9 — All Inclusive' },
        { selector: '#testimonios', label: 'Seção 10 — Testimonios' },
        { selector: '.how-it-works', label: 'Seção 11 — Paso a Paso' },
        { selector: '#faq', label: 'Seção 12 — FAQ' },
        { selector: '.final-cta-section', label: 'Seção 13 — CTA Final' },
        { selector: '.main-footer', label: 'Seção 14 — Footer' }
    ];

    const STORAGE_KEY = 'lp_review_comments';

    // ---- EmailJS Configuration ----
    // INSTRUÇÕES DE CONFIGURAÇÃO:
    // 1. Acesse https://www.emailjs.com/ e crie uma conta gratuita (200 emails/mês)
    // 2. Em "Email Services", conecte seu email (Gmail, Outlook, etc.)
    // 3. Copie o "Service ID" e cole abaixo em EMAILJS_SERVICE_ID
    // 4. Em "Email Templates", crie um template com estas variáveis:
    //    - {{section_name}} = nome da seção comentada
    //    - {{author_name}} = nome de quem comentou
    //    - {{comment_text}} = texto do comentário
    //    - {{comment_date}} = data do comentário
    //    - {{to_email}} = email de destino (preenchido automaticamente)
    // 5. Copie o "Template ID" e cole abaixo em EMAILJS_TEMPLATE_ID
    // 6. Em "Account" > "General", copie o "Public Key" e cole em EMAILJS_PUBLIC_KEY
    const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';   // ← Substituir
    const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID'; // ← Substituir
    const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';    // ← Substituir
    const NOTIFY_EMAIL = 'eduardo.bueno@v4company.com';

    // ---- State ----
    let reviewActive = false;
    let currentSectionId = null;

    // ---- Init ----
    document.addEventListener('DOMContentLoaded', initReviewMode);

    function initReviewMode() {
        initEmailJS();
        createToggleButton();
        createModal();
        createExportBar();
        createToast();
        prepareSections();
        loadAndRenderComments();
    }

    // ---- Initialize EmailJS ----
    function initEmailJS() {
        if (typeof emailjs !== 'undefined' && EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') {
            emailjs.init(EMAILJS_PUBLIC_KEY);
            console.log('✅ EmailJS inicializado — notificações por email ativas');
        } else if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
            console.warn('⚠️ EmailJS não configurado. Configure as chaves em review.js para ativar notificações por email.');
        }
    }

    // ---- Create Toggle Button ----
    function createToggleButton() {
        const btn = document.createElement('button');
        btn.className = 'review-toggle';
        btn.id = 'reviewToggle';
        btn.innerHTML = '<i class="fas fa-comments"></i> <span>Modo Review</span>';
        btn.addEventListener('click', toggleReviewMode);
        document.body.appendChild(btn);
    }

    // ---- Toggle Review Mode ----
    function toggleReviewMode() {
        reviewActive = !reviewActive;
        const btn = document.getElementById('reviewToggle');
        const body = document.body;

        if (reviewActive) {
            body.classList.add('review-active');
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-times"></i> <span>Sair do Review</span>';
        } else {
            body.classList.remove('review-active');
            btn.classList.remove('active');
            btn.innerHTML = '<i class="fas fa-comments"></i> <span>Modo Review</span>';
        }

        updateExportBar();
    }

    // ---- Prepare Sections ----
    function prepareSections() {
        SECTIONS.forEach((sec, index) => {
            const el = document.querySelector(sec.selector);
            if (!el) return;

            // Mark as review section
            el.classList.add('review-section');
            el.dataset.reviewId = sec.selector;
            el.style.position = el.style.position || 'relative';

            // Label
            const label = document.createElement('div');
            label.className = 'review-section-label';
            label.innerHTML = '<i class="fas fa-layer-group"></i> ' + sec.label;
            el.appendChild(label);

            // Comment button
            const commentBtn = document.createElement('button');
            commentBtn.className = 'review-comment-btn';
            commentBtn.innerHTML = '💬 Comentar';
            commentBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                openModal(sec.selector, sec.label);
            });
            el.appendChild(commentBtn);

            // Comments list container
            const commentsList = document.createElement('div');
            commentsList.className = 'review-comments-list';
            commentsList.id = 'comments-' + sanitizeId(sec.selector);
            el.appendChild(commentsList);
        });
    }

    // ---- Modal ----
    function createModal() {
        const overlay = document.createElement('div');
        overlay.className = 'review-modal-overlay';
        overlay.id = 'reviewModalOverlay';
        overlay.innerHTML = `
            <div class="review-modal">
                <div class="review-modal-header">
                    <div>
                        <h3>💬 Novo Comentário</h3>
                        <span class="section-name" id="modalSectionName"></span>
                    </div>
                    <button class="review-modal-close" id="modalClose" aria-label="Fechar">&times;</button>
                </div>
                <div class="review-modal-body">
                    <label for="reviewAuthor">Seu Nome</label>
                    <input type="text" id="reviewAuthor" placeholder="Ex: Eduardo, Maria..." autocomplete="off" />

                    <label for="reviewComment">Comentário</label>
                    <textarea id="reviewComment" placeholder="Escreva seu feedback sobre copy, layout, texto..."></textarea>

                    <button class="review-modal-submit" id="reviewSubmit">
                        <i class="fas fa-paper-plane"></i> Enviar Comentário
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Close modal on overlay click
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });

        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('reviewSubmit').addEventListener('click', submitComment);

        // Submit on Enter (in textarea with Ctrl/Cmd+Enter)
        document.getElementById('reviewComment').addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                submitComment();
            }
        });
    }

    function openModal(sectionId, sectionLabel) {
        currentSectionId = sectionId;
        document.getElementById('modalSectionName').textContent = sectionLabel;
        document.getElementById('reviewModalOverlay').classList.add('visible');

        // Focus on name input
        setTimeout(() => {
            const authorInput = document.getElementById('reviewAuthor');
            // Keep last used name
            authorInput.focus();
        }, 100);
    }

    function closeModal() {
        document.getElementById('reviewModalOverlay').classList.remove('visible');
        document.getElementById('reviewComment').value = '';
        currentSectionId = null;
    }

    function submitComment() {
        const author = document.getElementById('reviewAuthor').value.trim();
        const text = document.getElementById('reviewComment').value.trim();

        if (!author) {
            document.getElementById('reviewAuthor').focus();
            document.getElementById('reviewAuthor').style.borderColor = '#ef4444';
            setTimeout(() => {
                document.getElementById('reviewAuthor').style.borderColor = '';
            }, 2000);
            return;
        }

        if (!text) {
            document.getElementById('reviewComment').focus();
            document.getElementById('reviewComment').style.borderColor = '#ef4444';
            setTimeout(() => {
                document.getElementById('reviewComment').style.borderColor = '';
            }, 2000);
            return;
        }

        const comment = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            sectionId: currentSectionId,
            author: author,
            text: text,
            date: new Date().toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        saveComment(comment);
        renderSectionComments(currentSectionId);
        updateExportBar();

        // Find section label for email
        const sectionConfig = SECTIONS.find(s => s.selector === currentSectionId);
        const sectionLabel = sectionConfig ? sectionConfig.label : currentSectionId;

        // Send email notification
        sendEmailNotification(comment, sectionLabel);

        closeModal();
        showToast('Comentário salvo com sucesso!');
    }

    // ---- LocalStorage ----
    function getComments() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveComment(comment) {
        const comments = getComments();
        comments.push(comment);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
    }

    function deleteComment(commentId) {
        let comments = getComments();
        comments = comments.filter(c => c.id !== commentId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
    }

    function clearAllComments() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // ---- Render Comments ----
    function loadAndRenderComments() {
        SECTIONS.forEach(sec => {
            renderSectionComments(sec.selector);
        });
        updateExportBar();
    }

    function renderSectionComments(sectionId) {
        const containerId = 'comments-' + sanitizeId(sectionId);
        const container = document.getElementById(containerId);
        if (!container) return;

        const comments = getComments().filter(c => c.sectionId === sectionId);

        if (comments.length === 0) {
            container.innerHTML = '';
            updateCommentCount(sectionId, 0);
            return;
        }

        let html = '<h4><i class="fas fa-comments"></i> Comentários desta seção (' + comments.length + ')</h4>';

        comments.forEach(c => {
            html += `
                <div class="review-comment-card" data-comment-id="${c.id}">
                    <div class="comment-meta">
                        <span class="comment-author"><i class="fas fa-user"></i> ${escapeHtml(c.author)}</span>
                        <span class="comment-date">${c.date}</span>
                    </div>
                    <p class="comment-text">${escapeHtml(c.text)}</p>
                    <button class="comment-delete" data-id="${c.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
                </div>
            `;
        });

        container.innerHTML = html;
        updateCommentCount(sectionId, comments.length);

        // Bind delete buttons
        container.querySelectorAll('.comment-delete').forEach(btn => {
            btn.addEventListener('click', function () {
                const id = this.dataset.id;
                deleteComment(id);
                renderSectionComments(sectionId);
                updateExportBar();
                showToast('Comentário excluído');
            });
        });
    }

    function updateCommentCount(sectionId, count) {
        const section = document.querySelector(sectionId);
        if (!section) return;

        const btn = section.querySelector('.review-comment-btn');
        if (!btn) return;

        if (count > 0) {
            btn.innerHTML = '💬 Comentar <span class="review-comment-count">' + count + '</span>';
        } else {
            btn.innerHTML = '💬 Comentar';
        }
    }

    // ---- Export Bar ----
    function createExportBar() {
        const bar = document.createElement('div');
        bar.className = 'review-export-bar';
        bar.id = 'reviewExportBar';
        bar.innerHTML = `
            <div class="export-info">
                <i class="fas fa-clipboard-list"></i>
                <strong id="exportCount">0</strong> comentário(s) no total
            </div>
            <div class="export-actions">
                <button class="review-export-btn btn-copy" id="exportCopy">
                    <i class="fas fa-copy"></i> Copiar Todos
                </button>
                <button class="review-export-btn btn-clear" id="exportClear">
                    <i class="fas fa-trash"></i> Limpar Todos
                </button>
            </div>
        `;
        document.body.appendChild(bar);

        document.getElementById('exportCopy').addEventListener('click', exportComments);
        document.getElementById('exportClear').addEventListener('click', function () {
            if (confirm('Tem certeza que deseja excluir TODOS os comentários? Essa ação não pode ser desfeita.')) {
                clearAllComments();
                SECTIONS.forEach(sec => renderSectionComments(sec.selector));
                updateExportBar();
                showToast('Todos os comentários foram removidos');
            }
        });
    }

    function updateExportBar() {
        const total = getComments().length;
        const countEl = document.getElementById('exportCount');
        if (countEl) countEl.textContent = total;
    }

    // ---- Export Comments ----
    function exportComments() {
        const comments = getComments();
        if (comments.length === 0) {
            showToast('Nenhum comentário para exportar');
            return;
        }

        // Group by section
        const grouped = {};
        SECTIONS.forEach(sec => {
            const sectionComments = comments.filter(c => c.sectionId === sec.selector);
            if (sectionComments.length > 0) {
                grouped[sec.label] = sectionComments;
            }
        });

        let output = '═══════════════════════════════════════\n';
        output += '  FEEDBACK DA LANDING PAGE\n';
        output += '  Exportado em: ' + new Date().toLocaleString('pt-BR') + '\n';
        output += '═══════════════════════════════════════\n\n';

        for (const [sectionLabel, sectionComments] of Object.entries(grouped)) {
            output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            output += '📌 ' + sectionLabel + '\n';
            output += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

            sectionComments.forEach((c, i) => {
                output += '  ✏️ Comentário ' + (i + 1) + '\n';
                output += '  Autor: ' + c.author + '\n';
                output += '  Data: ' + c.date + '\n';
                output += '  Feedback: ' + c.text + '\n\n';
            });
        }

        output += '═══════════════════════════════════════\n';
        output += '  Total de comentários: ' + comments.length + '\n';
        output += '═══════════════════════════════════════\n';

        // Copy to clipboard
        navigator.clipboard.writeText(output).then(() => {
            showToast('Feedback copiado para a área de transferência!');
        }).catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = output;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast('Feedback copiado para a área de transferência!');
        });
    }

    // ---- Toast ----
    function createToast() {
        const toast = document.createElement('div');
        toast.className = 'review-toast';
        toast.id = 'reviewToast';
        document.body.appendChild(toast);
    }

    function showToast(message) {
        const toast = document.getElementById('reviewToast');
        toast.innerHTML = '<i class="fas fa-check-circle"></i> ' + message;
        toast.classList.add('visible');
        setTimeout(() => toast.classList.remove('visible'), 3000);
    }

    // ---- Email Notification ----
    function sendEmailNotification(comment, sectionLabel) {
        // Check if EmailJS is configured
        if (typeof emailjs === 'undefined' ||
            EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY' ||
            EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' ||
            EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID') {
            console.log('📧 Email não enviado (EmailJS não configurado). Comentário salvo localmente.');
            return;
        }

        const templateParams = {
            to_email: NOTIFY_EMAIL,
            section_name: sectionLabel,
            author_name: comment.author,
            comment_text: comment.text,
            comment_date: comment.date
        };

        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
            .then(function () {
                console.log('✅ Notificação enviada para ' + NOTIFY_EMAIL);
                showToast('📧 Notificação enviada por email!');
            })
            .catch(function (error) {
                console.error('❌ Erro ao enviar email:', error);
                showToast('⚠️ Comentário salvo, mas email não foi enviado');
            });
    }

    // ---- Utilities ----
    function sanitizeId(str) {
        return str.replace(/[^a-zA-Z0-9]/g, '-').replace(/^-+|-+$/g, '');
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})();
