const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = 3000;

const DATA_DIR = __dirname;
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending-users.json');
const ARTICLES_FILE = path.join(DATA_DIR, 'articles.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const MAIL_USER = 'getnukekid@gmail.com';
const MAIL_PASS = 'ofzi kcjn mmjl qxnn';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
    },
});

const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        try {
            await fs.mkdir(UPLOAD_DIR, { recursive: true });
        } catch (e) {
        }
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname || '');
        cb(null, unique + ext);
    },
});

const upload = multer({ storage });

app.use(express.json());
app.use(express.static(DATA_DIR));

async function readJson(filePath, defaultValue) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return defaultValue;
        }
        throw err;
    }
}

async function writeJson(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

app.post('/api/register/request', async (req, res) => {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Thiếu tên đăng nhập, email hoặc mật khẩu.' });
    }

    if (!email.endsWith('@gmail.com')) {
        return res.status(400).json({ error: 'Chỉ chấp nhận Gmail (@gmail.com).' });
    }

    try {
        const users = await readJson(USERS_FILE, []);
        if (users.find((u) => u.username === username || u.email === email)) {
            return res.status(400).json({ error: 'Tên đăng nhập hoặc email đã tồn tại.' });
        }

        const pending = await readJson(PENDING_FILE, []);
        const filteredPending = pending.filter(
            (p) => p.username !== username && p.email !== email
        );

        const token = crypto.randomUUID();
        const expiresAt = Date.now() + 60 * 60 * 1000;

        filteredPending.push({
            username,
            email,
            passwordHash: hashPassword(password),
            token,
            expiresAt,
        });

        await writeJson(PENDING_FILE, filteredPending);

        const verifyUrl = `http://localhost:${PORT}/api/register/verify?token=${token}`;

        await transporter.sendMail({
            from: `VNAR <${MAIL_USER}>`,
            to: email,
            subject: 'Xác minh tài khoản VNAR',
            text: `Nhấn vào link sau để xác minh tài khoản của bạn: ${verifyUrl}`,
            html: `<p>Nhấn vào link sau để xác minh tài khoản của bạn:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        });

        res.json({ message: 'Đã gửi email xác minh đến Gmail của bạn. Hãy kiểm tra hộp thư.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server hoặc lỗi gửi email. Hãy kiểm tra cấu hình Gmail.' });
    }
});

app.get('/api/register/verify', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('Thiếu token xác minh.');
    }

    try {
        const pending = await readJson(PENDING_FILE, []);
        const index = pending.findIndex((p) => p.token === token);

        if (index === -1) {
            return res.status(400).send('Token không hợp lệ hoặc đã được sử dụng.');
        }

        const record = pending[index];

        if (record.expiresAt < Date.now()) {
            return res.status(400).send('Token đã hết hạn. Vui lòng đăng ký lại.');
        }

        const users = await readJson(USERS_FILE, []);

        if (users.find((u) => u.username === record.username || u.email === record.email)) {
            const newPending = pending.filter((_, i) => i !== index);
            await writeJson(PENDING_FILE, newPending);
            return res
                .status(400)
                .send('Tài khoản đã tồn tại. Nếu đây là lỗi, hãy thử đăng ký lại.');
        }

        users.push({
            id: crypto.randomUUID(),
            username: record.username,
            email: record.email,
            passwordHash: record.passwordHash,
            createdAt: new Date().toISOString(),
        });

        const newPending = pending.filter((_, i) => i !== index);

        await writeJson(USERS_FILE, users);
        await writeJson(PENDING_FILE, newPending);

        res.send(
            'Xác minh thành công! Tài khoản đã được tạo. Bạn có thể quay lại trang VNAR và đăng nhập.'
        );
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi server khi xác minh tài khoản.');
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({ error: 'Thiếu tên đăng nhập hoặc mật khẩu.' });
    }

    try {
        const users = await readJson(USERS_FILE, []);
        const user = users.find((u) => u.username === username);

        if (!user) {
            return res.status(400).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
        }

        if (user.passwordHash !== hashPassword(password)) {
            return res.status(400).json({ error: 'Sai tên đăng nhập hoặc mật khẩu.' });
        }

        res.json({ message: 'Đăng nhập thành công.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server khi đăng nhập.' });
    }
});

app.post(
    '/api/articles',
    upload.fields([
        { name: 'media', maxCount: 10 },
        { name: 'signature', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
    ]),
    async (req, res) => {
        const { title, content, authorName } = req.body || {};

        if (!title || !content || !authorName) {
            return res.status(400).json({ error: 'Thiếu tiêu đề, nội dung hoặc tên người viết.' });
        }

        try {
            const articles = await readJson(ARTICLES_FILE, []);
            const id = crypto.randomUUID();

            const mediaFiles = (req.files.media || []).map((file) => `/uploads/${file.filename}`);
            const signatureFile =
                (req.files.signature && req.files.signature[0] && `/uploads/${req.files.signature[0].filename}`) ||
                null;
            const coverFile =
                (req.files.cover && req.files.cover[0] && `/uploads/${req.files.cover[0].filename}`) || null;

            const article = {
                id,
                title,
                content,
                authorName,
                cover: coverFile,
                media: mediaFiles,
                signature: signatureFile,
                createdAt: new Date().toISOString(),
                comments: [],
            };

            articles.push(article);
            await writeJson(ARTICLES_FILE, articles);

            res.json({ id, url: `/article/${id}` });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Lỗi server khi lưu bài viết.' });
        }
    }
);

app.get('/api/articles/:id', async (req, res) => {
    try {
        const articles = await readJson(ARTICLES_FILE, []);
        const article = articles.find((a) => a.id === req.params.id);
        if (!article) {
            return res.status(404).json({ error: 'Không tìm thấy bài viết.' });
        }
        res.json(article);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server khi tải bài viết.' });
    }
});

app.post('/api/articles/:id/comments', async (req, res) => {
    const { name, content } = req.body || {};

    if (!name || !content) {
        return res.status(400).json({ error: 'Thiếu tên hoặc nội dung bình luận.' });
    }

    try {
        const articles = await readJson(ARTICLES_FILE, []);
        const index = articles.findIndex((a) => a.id === req.params.id);
        if (index === -1) {
            return res.status(404).json({ error: 'Không tìm thấy bài viết.' });
        }

        const comment = {
            id: crypto.randomUUID(),
            name,
            content,
            createdAt: new Date().toISOString(),
        };

        articles[index].comments = articles[index].comments || [];
        articles[index].comments.push(comment);

        await writeJson(ARTICLES_FILE, articles);

        res.json(comment);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server khi lưu bình luận.' });
    }
});

app.get('/api/articles', async (req, res) => {
    try {
        const articles = await readJson(ARTICLES_FILE, []);
        articles.sort((a, b) => {
            const ad = new Date(a.createdAt || 0).getTime();
            const bd = new Date(b.createdAt || 0).getTime();
            return bd - ad;
        });
        res.json(articles);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Lỗi server khi tải danh sách bài viết.' });
    }
});

app.get('/article/:id', async (req, res) => {
    try {
        const articles = await readJson(ARTICLES_FILE, []);
        const article = articles.find((a) => a.id === req.params.id);
        if (!article) {
            return res.status(404).send('Không tìm thấy bài viết.');
        }

        const mediaHtml = (article.media || [])
            .map((src) => {
                const lower = src.toLowerCase();
                if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg')) {
                    return `<div class="article-media"><video controls src="${src}"></video></div>`;
                }
                return `<div class="article-media"><img src="${src}" alt=""></div>`;
            })
            .join('');

        const signatureHtml = article.signature
            ? `<div class="article-signature"><img src="${article.signature}" alt="Chữ ký"></div>`
            : '';

        const commentsHtml =
            (article.comments || [])
                .map(
                    (c) => `<div class="comment-item">
    <div class="comment-name">${c.name}</div>
    <div class="comment-content">${c.content}</div>
</div>`
                )
                .join('') || '<p class="no-comment">Chưa có bình luận nào.</p>';

        res.send(`<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title} - VNAR NEWS</title>
    <link rel="stylesheet" href="/news.css">
    <link rel="stylesheet" href="/article.css">
</head>
<body>
    <header class="top-bar">
        <a href="/home.html" class="logo-link">
            <div class="logo-area">
                <span class="logo-main">VNAR NEWS</span>
                <span class="logo-sub">Trang thông tin truyền thông</span>
            </div>
        </a>
        <div class="search-area">
            <input type="text" placeholder="Nhập nội dung tìm kiếm">
            <button class="search-btn">🔍</button>
        </div>
        <div class="right-actions">
            <div class="user-menu">
                <button class="icon-btn user-menu-toggle" aria-label="Tài khoản">👤</button>
                <div class="user-menu-dropdown" id="user-menu-dropdown">
                    <button class="user-menu-item" id="logout-btn">Đăng xuất</button>
                </div>
            </div>
            <button class="icon-btn">☷</button>
        </div>
    </header>

    <main class="article-page">
        <article class="article">
            <h1 class="article-title">${article.title}</h1>
            <div class="article-meta">Người viết: <strong>${article.authorName}</strong></div>
            <div class="article-content">${article.content.replace(/\n/g, '<br>')}</div>
            ${mediaHtml}
            ${signatureHtml}
        </article>

        <section class="comments-section">
            <h2>Bình luận</h2>
            <div class="comment-form">
                <input type="text" id="comment-name" placeholder="Họ tên *">
                <textarea id="comment-content" placeholder="Quan điểm của bạn về bài viết này thế nào? Hãy chia sẻ tại đây."></textarea>
                <button id="comment-submit">Gửi bình luận</button>
                <div id="comment-message" class="message"></div>
            </div>
            <div id="comment-list" class="comment-list">
                ${commentsHtml}
            </div>
        </section>
    </main>

    <script>
        window.VNAR_ARTICLE_ID = ${JSON.stringify(article.id)};
    </script>
    <script src="/news.js"></script>
    <script src="/article.js"></script>
</body>
</html>`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Lỗi server khi tải bài viết.');
    }
});
app.listen(PORT, () => {
    console.log(`VNAR server đang chạy tại http://localhost:${PORT}`);
});

