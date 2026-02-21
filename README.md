# Litoral Verde × Vila Galé — Landing Page

Landing page para venda de resorts All Inclusive Vila Galé no Brasil, direcionada ao público argentino.

---

## 📁 Arquivos do Projeto

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | Estrutura completa da landing page |
| `styles.css` | Design system e estilos visuais |
| `script.js` | Interações (menu mobile, FAQ, contadores, animações) |
| `review.css` | Estilos do sistema de feedback colaborativo |
| `review.js` | Sistema de comentários com Supabase (banco compartilhado) |

---

## 🗂️ Sistema de Comentários Colaborativo (como Google Docs)

O botão **"Modo Review"** permite que qualquer pessoa acesse o site e deixe comentários por seção. Todos os comentários ficam visíveis para todos os usuários em **tempo real**, armazenados na nuvem via **Supabase**.

### Funcionalidades:
- 💬 Comentar em qualquer seção da página
- ⭐ Avaliar a seção com 1 a 5 estrelas
- 👥 Comentários visíveis para todos (tempo real)
- 📋 Exportar todos os comentários em texto formatado
- 🗑️ Excluir comentários individuais ou todos de uma vez
- 📧 Notificação por email a cada novo comentário (via EmailJS)

---

## ⚙️ Configuração do Supabase (banco de dados compartilhado)

### Passo a passo (5 minutos):

**1. Criar conta e projeto**
- Acesse [https://supabase.com/](https://supabase.com/) e crie uma conta gratuita
- Clique em "New Project" e dê um nome (ex: `litoral-verde-review`)
- Aguarde o banco inicializar (~1 minuto)

**2. Criar a tabela de comentários**
- No menu lateral, clique em **"SQL Editor"**
- Cole o SQL abaixo e clique em **"Run"**:

```sql
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
```

**3. Pegar as credenciais**
- Vá em **"Project Settings"** → **"API"**
- Copie a **Project URL** (ex: `https://xyzxyz.supabase.co`)
- Copie a chave **anon / public**

**4. Adicionar as credenciais no código**
- Abra `review.js`
- Substitua nas primeiras linhas:
```javascript
const SUPABASE_URL      = 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON';
```

**5. Testar**
- Abra o site, ative o "Modo Review", adicione um comentário
- Abra em outro navegador ou aba anônima — o comentário deve aparecer!

---

## 📧 Notificações por Email (EmailJS — opcional)

A cada novo comentário, você recebe um email em `eduardo.bueno@v4company.com`.

### Configuração:
1. Acesse [https://www.emailjs.com/](https://www.emailjs.com/) (grátis, 200 emails/mês)
2. Conecte seu email em **"Email Services"**
3. Crie um template em **"Email Templates"** com essas variáveis:
   - `{{section_name}}` — seção comentada
   - `{{author_name}}` — nome do revisor
   - `{{comment_text}}` — texto do comentário
   - `{{comment_date}}` — data/hora
   - `{{rating}}` — avaliação em estrelas
4. Vá em **"Account → General"** e copie a **Public Key**
5. Preencha em `review.js`:
```javascript
const EMAILJS_CONFIG = {
    serviceId:  'seu_service_id',
    templateId: 'seu_template_id',
    publicKey:  'sua_public_key',
    notifyEmail: 'eduardo.bueno@v4company.com'
};
```

---

## 🚀 Como usar o Modo Review

1. Compartilhe o link do site com os clientes/stakeholders
2. Eles clicam no botão roxo **"Modo Review"** (canto superior direito)
3. Cada seção ganha um botão **"💬 Comentar"**
4. Eles escrevem o feedback e dão uma nota (1-5 estrelas)
5. Todos os comentários aparecem para todo mundo em tempo real
6. Você clica em **"Copiar Todos"** para exportar o relatório de feedback
7. Repassa o relatório para o designer

---

## ⚠️ Observações antes de publicar

- Os links de WhatsApp usam número placeholder (`5511999999999`). Substituir pelo número real.
- As imagens são geradas por IA. Substituir por fotos reais dos resorts.
- O SQL de RLS está em modo "público aberto" (ideal para revisão). Em produção, restringir as políticas.
