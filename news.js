const userToggle = document.querySelector('.user-menu-toggle');
const userMenu = document.getElementById('user-menu-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const writeArticleBtn = document.getElementById('write-article-btn');
const homeMainArticle = document.getElementById('home-main-article');
const homeArticleList = document.getElementById('home-article-list');

if (userToggle && userMenu) {
    userToggle.addEventListener('click', () => {
        userMenu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!userMenu.contains(e.target) && e.target !== userToggle) {
            userMenu.classList.remove('open');
        }
    });
}

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        try {
            localStorage.removeItem('vnarUser');
        } catch (e) {
        }
        window.location.href = '/';
    });
}

if (writeArticleBtn) {
    writeArticleBtn.addEventListener('click', () => {
        window.location.href = '/editor.html';
    });
}

async function loadHomeArticles() {
    if (!homeMainArticle || !homeArticleList) return;

    try {
        const res = await fetch('/api/articles');
        const data = await res.json().catch(() => []);

        if (!Array.isArray(data) || data.length === 0) {
            homeMainArticle.innerHTML = '<p>Chưa có bài viết nào.</p>';
            return;
        }

        const articles = data.slice().sort((a, b) => {
            const ad = new Date(a.createdAt || 0).getTime();
            const bd = new Date(b.createdAt || 0).getTime();
            return bd - ad;
        });

        const [first, ...rest] = articles;
        const mainCover = first.cover || (first.media && first.media[0]) || '';
        const mainExcerpt = (first.content || '').split('\n')[0];

        homeMainArticle.innerHTML = `
            <a href="/article/${first.id}">
                ${mainCover ? `<img class="home-main-image" src="${mainCover}" alt="">` : ''}
                <div class="home-main-body">
                    <div class="home-main-title">${first.title || ''}</div>
                    <div class="home-main-meta">${first.authorName || ''}</div>
                    <div class="home-main-excerpt">${mainExcerpt || ''}</div>
                </div>
            </a>
        `;

        homeArticleList.innerHTML = '';
        rest.forEach((a) => {
            const thumb = a.cover || (a.media && a.media[0]) || '';
            const div = document.createElement('a');
            div.href = `/article/${a.id}`;
            div.className = 'home-article-card';
            div.innerHTML = `
                ${thumb ? `<img class="home-article-thumb" src="${thumb}" alt="">` : '<div class="home-article-thumb"></div>'}
                <div class="home-article-info">
                    <div class="home-article-title">${a.title || ''}</div>
                    <div class="home-article-meta">${a.authorName || ''}</div>
                </div>
            `;
            homeArticleList.appendChild(div);
        });
    } catch (e) {
        homeMainArticle.innerHTML = '<p>Không tải được danh sách bài viết.</p>';
    }
}

loadHomeArticles();


