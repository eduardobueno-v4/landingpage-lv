/* =============================================
   REVIEW MODE — Sistema de Feedback Colaborativo
   Backend: Supabase (tempo real, compartilhado)
   ============================================= */

/* ─────────────────────────────────────────────
   CONFIGURAÇÃO DO SUPABASE
   ─────────────────────────────────────────────
   INSTRUÇÕES (5 minutos):

   1. Acesse https://supabase.com/ e crie uma conta grátis
   2. Crie um novo projeto (escolha qualquer região)
   3. Aguarde o banco inicializar (~1 min)
   4. Vá em "SQL Editor" e execute o seguinte SQL para criar a tabela:

      create table comments (
        id         uuid default gen_random_uuid() primary key,
        section_id text not null,
        author     text not null,
        text       text not null,
        rating     int,
        date       text,
        created_at timestamptz default now()
      );

      alter table comments enable row level security;

      create policy "Leitura pública"  on comments for select using (true);
      create policy "Inserção pública" on comments for insert with check (true);
      create policy "Exclusão pública" on comments for delete using (true);

   5. Vá em "Project Settings" → "API"
   6. Copie a "Project URL" e cole em SUPABASE_URL abaixo
   7. Copie a "anon public" key e cole em SUPABASE_ANON_KEY abaixo
   ───────────────────────────────────────────── */
const SUPABASE_URL = 'https://mdldxswblphkpkwsrxzt.supabase.co';      // ← Ex: https://xyzxyz.supabase.co
const SUPABASE_ANON_KEY = 'sb_publishable_aTduFG3j_kNww4-CPw-Grw_PhFuc7yA'; // ← chave anon/public

/* ─────────────────────────────────────────────
   CONFIGURAÇÃO DO EMAIL (EmailJS — opcional)
   ─────────────────────────────────────────────
   Para receber email a cada novo comentário:
   1. Acesse https://www.emailjs.com/ (grátis, 200 emails/mês)
   2. Conecte seu email em "Email Services"
   3. Crie um template com as variáveis:
      {{section_name}}, {{author_name}}, {{comment_text}},
      {{comment_date}}, {{rating}}
   4. Preencha as chaves abaixo
   ───────────────────────────────────────────── */
const EMAILJS_CONFIG = {
    serviceId: 'YOUR_SERVICE_ID',
    templateId: 'YOUR_TEMPLATE_ID',
    publicKey: 'YOUR_PUBLIC_KEY',
    notifyEmail: 'eduardo.bueno@v4company.com'
};

/* ============================================= */

(function () {
    'use strict';

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

    let reviewActive = false;
    let currentSectionId = null;
    let selectedRating = 0;
    let supabase = null;
    let realtimeChannel = null;

    document.addEventListener('DOMContentLoaded', initReviewMode);

    function initReviewMode() {
        prepareSections();
        createToggleButton();
        createModal();
        createExportBar();
        createToast();
        initSupabase();
    }

    /* ─────────────────────────────────────────
       SUPABASE
    ───────────────────────────────────────── */
    function initSupabase() {
        if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
            console.warn('⚠️  Supabase não configurado. Abra review.js e preencha SUPABASE_URL e SUPABASE_ANON_KEY.');
            showConfigBanner();
            return;
        }

        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase SDK não encontrado. Verifique o index.html.');
            return;
        }

        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('✅ Supabase conectado — comentários colaborativos ativos');

        loadAllComments();
        subscribeToRealtime();
    }

    async function loadAllComments() {
        if (!supabase) return;

        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao carregar comentários:', error.message);
            return;
        }

        // Agrupa por section_id e renderiza
        const grouped = {};
        (data || []).forEach(c => {
            if (!grouped[c.section_id]) grouped[c.section_id] = [];
            grouped[c.section_id].push(c);
        });

        SECTIONS.forEach(sec => {
            const sectionComments = grouped[sec.selector] || [];
            renderSectionComments(sec.selector, sectionComments);
            updateCommentCount(sec.selector, sectionComments.length);
        });

        updateExportBar();
    }

    function subscribeToRealtime() {
        if (!supabase) return;

        // Remove canal anterior se existir
        if (realtimeChannel) supabase.removeChannel(realtimeChannel);

        realtimeChannel = supabase
            .channel('comments-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
                // Qualquer mudança → recarrega tudo
                loadAllComments();
            })
            .subscribe();
    }

    async function saveComment(sectionId, comment) {
        if (!supabase) {
            showToast('⚠️ Supabase não configurado.');
            return false;
        }

        const { error } = await supabase.from('comments').insert([{
            section_id: sectionId,
            author: comment.author,
            text: comment.text,
            rating: comment.rating || null,
            date: comment.date
        }]);

        if (error) {
            console.error('Erro ao salvar comentário:', error.message);
            showToast('❌ Erro ao salvar. Tente novamente.');
            return false;
        }
        return true;
    }

    async function deleteComment(commentId) {
        if (!supabase) return;
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);
        if (error) console.error('Erro ao excluir:', error.message);
    }

    async function fetchAllForExport() {
        if (!supabase) return [];
        const { data, error } = await supabase
            .from('comments')
            .select('*')
            .order('created_at', { ascending: true });
        if (error) return [];
        return data || [];
    }

    async function clearAll() {
        if (!supabase) return;
        // Deleta tudo (não há filtro = todos os registros)
        const { error } = await supabase
            .from('comments')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // deleta todos
        if (error) console.error('Erro ao limpar:', error.message);
    }

    /* ─────────────────────────────────────────
       TOGGLE REVIEW MODE
    ───────────────────────────────────────── */
    function createToggleButton() {
        const btn = document.createElement('button');
        btn.className = 'review-toggle';
        btn.id = 'reviewToggle';
        btn.innerHTML = '<i class="fas fa-comments"></i> <span>Modo Review</span>';
        btn.addEventListener('click', toggleReviewMode);
        document.body.appendChild(btn);
    }

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

    /* ─────────────────────────────────────────
       SECTIONS
    ───────────────────────────────────────── */
    function prepareSections() {
        SECTIONS.forEach(sec => {
            const el = document.querySelector(sec.selector);
            if (!el) return;

            el.classList.add('review-section');
            el.dataset.reviewId = sec.selector;
            el.style.position = el.style.position || 'relative';

            const label = document.createElement('div');
            label.className = 'review-section-label';
            label.innerHTML = '<i class="fas fa-layer-group"></i> ' + sec.label;
            el.appendChild(label);

            const commentBtn = document.createElement('button');
            commentBtn.className = 'review-comment-btn';
            commentBtn.innerHTML = '💬 Comentar';
            commentBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                openModal(sec.selector, sec.label);
            });
            el.appendChild(commentBtn);

            const commentsList = document.createElement('div');
            commentsList.className = 'review-comments-list';
            commentsList.id = 'comments-' + sanitizeId(sec.selector);
            el.appendChild(commentsList);
        });
    }

    /* ─────────────────────────────────────────
       MODAL
    ───────────────────────────────────────── */
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

                    <label>Avaliação desta seção</label>
                    <div class="review-rating" id="reviewRating">
                        <button class="rating-star" data-value="1" title="Ruim">★</button>
                        <button class="rating-star" data-value="2" title="Regular">★</button>
                        <button class="rating-star" data-value="3" title="Bom">★</button>
                        <button class="rating-star" data-value="4" title="Muito bom">★</button>
                        <button class="rating-star" data-value="5" title="Excelente">★</button>
                        <span class="rating-label" id="ratingLabel">Sem avaliação</span>
                    </div>

                    <label for="reviewComment">Comentário / Feedback</label>
                    <textarea id="reviewComment" placeholder="O que achou desta seção? Copy, layout, texto..."></textarea>

                    <button class="review-modal-submit" id="reviewSubmit">
                        <i class="fas fa-paper-plane"></i> Enviar Comentário
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
        document.getElementById('modalClose').addEventListener('click', closeModal);
        document.getElementById('reviewSubmit').addEventListener('click', submitComment);
        document.getElementById('reviewComment').addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment();
        });

        initRatingStars();
    }

    function initRatingStars() {
        const stars = document.querySelectorAll('.rating-star');
        const label = document.getElementById('ratingLabel');
        const labels = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente'];

        stars.forEach(star => {
            star.addEventListener('mouseover', function () {
                const v = parseInt(this.dataset.value);
                highlightStars(v);
                label.textContent = labels[v];
            });
            star.addEventListener('mouseout', function () {
                highlightStars(selectedRating);
                label.textContent = selectedRating ? labels[selectedRating] : 'Sem avaliação';
            });
            star.addEventListener('click', function () {
                selectedRating = parseInt(this.dataset.value);
                label.textContent = labels[selectedRating];
            });
        });
    }

    function highlightStars(count) {
        document.querySelectorAll('.rating-star').forEach((s, i) => {
            s.classList.toggle('active', i < count);
        });
    }

    function openModal(sectionId, sectionLabel) {
        currentSectionId = sectionId;
        selectedRating = 0;
        highlightStars(0);
        document.getElementById('ratingLabel').textContent = 'Sem avaliação';
        document.getElementById('modalSectionName').textContent = sectionLabel;
        document.getElementById('reviewComment').value = '';
        document.getElementById('reviewModalOverlay').classList.add('visible');
        setTimeout(() => document.getElementById('reviewAuthor').focus(), 100);
    }

    function closeModal() {
        document.getElementById('reviewModalOverlay').classList.remove('visible');
        document.getElementById('reviewComment').value = '';
        currentSectionId = null;
    }

    async function submitComment() {
        const author = document.getElementById('reviewAuthor').value.trim();
        const text = document.getElementById('reviewComment').value.trim();

        if (!author) { shakeInput('reviewAuthor'); return; }
        if (!text) { shakeInput('reviewComment'); return; }

        const btn = document.getElementById('reviewSubmit');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        const comment = {
            author,
            text,
            rating: selectedRating || null,
            date: new Date().toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
        };

        const sectionConfig = SECTIONS.find(s => s.selector === currentSectionId);
        const sectionLabel = sectionConfig ? sectionConfig.label : currentSectionId;

        const saved = await saveComment(currentSectionId, comment);

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Comentário';

        if (saved) {
            closeModal();
            showToast('✅ Comentário salvo e compartilhado!');
            sendEmailNotification({ ...comment, sectionLabel });
        }
    }

    function shakeInput(id) {
        const el = document.getElementById(id);
        el.style.borderColor = '#ef4444';
        el.focus();
        setTimeout(() => el.style.borderColor = '', 1200);
    }

    /* ─────────────────────────────────────────
       RENDER
    ───────────────────────────────────────── */
    function renderSectionComments(sectionId, comments) {
        const container = document.getElementById('comments-' + sanitizeId(sectionId));
        if (!container) return;

        if (!comments || comments.length === 0) {
            container.innerHTML = '';
            return;
        }

        const stars = n => n ? '<span class="comment-stars">' + '★'.repeat(n) + '☆'.repeat(5 - n) + '</span>' : '';

        let html = `<h4><i class="fas fa-comments"></i> Comentários desta seção (${comments.length})</h4>`;

        comments.forEach(c => {
            html += `
                <div class="review-comment-card" data-comment-id="${c.id}">
                    <div class="comment-meta">
                        <div class="comment-author-wrap">
                            <span class="comment-author"><i class="fas fa-user"></i> ${escapeHtml(c.author)}</span>
                            ${stars(c.rating)}
                        </div>
                        <span class="comment-date">${c.date || ''}</span>
                    </div>
                    <p class="comment-text">${escapeHtml(c.text)}</p>
                    <button class="comment-delete" data-id="${c.id}">
                        <i class="fas fa-trash-alt"></i> Excluir
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;

        container.querySelectorAll('.comment-delete').forEach(btn => {
            btn.addEventListener('click', async function () {
                if (confirm('Excluir este comentário para todos os usuários?')) {
                    await deleteComment(this.dataset.id);
                    showToast('Comentário excluído');
                }
            });
        });
    }

    function updateCommentCount(sectionId, count) {
        const section = document.querySelector(sectionId);
        if (!section) return;
        const btn = section.querySelector('.review-comment-btn');
        if (!btn) return;
        btn.innerHTML = count > 0
            ? `💬 Comentar <span class="review-comment-count">${count}</span>`
            : '💬 Comentar';
    }

    /* ─────────────────────────────────────────
       EXPORT BAR
    ───────────────────────────────────────── */
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
        document.getElementById('exportClear').addEventListener('click', async function () {
            if (confirm('Excluir TODOS os comentários para todos os usuários? Essa ação não pode ser desfeita.')) {
                await clearAll();
                showToast('Todos os comentários foram removidos');
            }
        });
    }

    function updateExportBar() {
        let total = 0;
        SECTIONS.forEach(sec => {
            const c = document.getElementById('comments-' + sanitizeId(sec.selector));
            if (c) total += c.querySelectorAll('.review-comment-card').length;
        });
        const el = document.getElementById('exportCount');
        if (el) el.textContent = total;
    }

    async function exportComments() {
        showToast('⏳ Carregando comentários...');
        const all = await fetchAllForExport();

        if (!all.length) {
            showToast('Nenhum comentário para exportar');
            return;
        }

        const sectionMap = {};
        SECTIONS.forEach(s => { sectionMap[s.selector] = s.label; });

        const grouped = {};
        all.forEach(c => {
            const label = sectionMap[c.section_id] || c.section_id;
            if (!grouped[label]) grouped[label] = [];
            grouped[label].push(c);
        });

        const ratingText = n => n ? ` | Avaliação: ${'★'.repeat(n)} (${n}/5)` : '';

        let out = '═══════════════════════════════════════\n';
        out += '  FEEDBACK DA LANDING PAGE\n';
        out += '  Exportado em: ' + new Date().toLocaleString('pt-BR') + '\n';
        out += '═══════════════════════════════════════\n\n';

        for (const [sectionLabel, comments] of Object.entries(grouped)) {
            out += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
            out += '📌 ' + sectionLabel + '\n';
            out += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
            comments.forEach((c, i) => {
                out += `  ✏️ Comentário ${i + 1}\n`;
                out += `  Autor: ${c.author}\n`;
                out += `  Data: ${c.date || 'N/A'}${ratingText(c.rating)}\n`;
                out += `  Feedback: ${c.text}\n\n`;
            });
        }

        out += '═══════════════════════════════════════\n';
        out += '  Total: ' + all.length + ' comentário(s)\n';
        out += '═══════════════════════════════════════\n';

        navigator.clipboard.writeText(out)
            .then(() => showToast('📋 Feedback copiado para a área de transferência!'))
            .catch(() => {
                const ta = document.createElement('textarea');
                ta.value = out;
                ta.style.cssText = 'position:fixed;opacity:0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showToast('📋 Feedback copiado!');
            });
    }

    /* ─────────────────────────────────────────
       EMAIL NOTIFICATION (EmailJS)
    ───────────────────────────────────────── */
    function sendEmailNotification(comment) {
        if (
            typeof emailjs === 'undefined' ||
            EMAILJS_CONFIG.publicKey === 'YOUR_PUBLIC_KEY' ||
            EMAILJS_CONFIG.serviceId === 'YOUR_SERVICE_ID'
        ) return;

        emailjs.init(EMAILJS_CONFIG.publicKey);
        emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
            to_email: EMAILJS_CONFIG.notifyEmail,
            section_name: comment.sectionLabel,
            author_name: comment.author,
            comment_text: comment.text,
            comment_date: comment.date,
            rating: comment.rating ? comment.rating + '/5 ★' : 'Sem avaliação'
        }).catch(err => console.error('EmailJS error:', err));
    }

    /* ─────────────────────────────────────────
       TOAST
    ───────────────────────────────────────── */
    function createToast() {
        if (document.getElementById('reviewToast')) return;
        const t = document.createElement('div');
        t.className = 'review-toast';
        t.id = 'reviewToast';
        document.body.appendChild(t);
    }

    function showToast(msg) {
        const t = document.getElementById('reviewToast');
        if (!t) return;
        t.innerHTML = msg;
        t.classList.add('visible');
        setTimeout(() => t.classList.remove('visible'), 3500);
    }

    /* ─────────────────────────────────────────
       CONFIG BANNER
    ───────────────────────────────────────── */
    function showConfigBanner() {
        if (document.getElementById('reviewConfigBanner')) return;
        const b = document.createElement('div');
        b.id = 'reviewConfigBanner';
        b.innerHTML = `
            <div class="config-banner-content">
                <i class="fas fa-exclamation-triangle"></i>
                <span><strong>Supabase não configurado.</strong>
                Comentários são salvos apenas localmente.
                Configure <code>review.js</code> para ativar o modo colaborativo.</span>
                <button onclick="document.getElementById('reviewConfigBanner').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.appendChild(b);
    }

    /* ─────────────────────────────────────────
       UTILITIES
    ───────────────────────────────────────── */
    function sanitizeId(str) {
        return str.replace(/[^a-zA-Z0-9]/g, '-').replace(/^-+|-+$/g, '');
    }

    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

})();
