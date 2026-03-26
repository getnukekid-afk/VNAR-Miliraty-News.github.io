const articleId = window.VNAR_ARTICLE_ID;

const commentNameInput = document.getElementById('comment-name');
const commentContentInput = document.getElementById('comment-content');
const commentSubmitBtn = document.getElementById('comment-submit');
const commentList = document.getElementById('comment-list');
const commentMessage = document.getElementById('comment-message');

function showCommentMessage(text, isError = false) {
    if (!commentMessage) return;
    commentMessage.textContent = text;
    commentMessage.style.color = isError ? 'red' : 'green';
}

if (commentSubmitBtn && articleId) {
    commentSubmitBtn.addEventListener('click', async () => {
        const name = (commentNameInput && commentNameInput.value.trim()) || '';
        const content = (commentContentInput && commentContentInput.value.trim()) || '';

        if (!name || !content) {
            showCommentMessage('Vui lòng nhập họ tên và nội dung bình luận.', true);
            return;
        }

        try {
            const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, content }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                showCommentMessage(data.error || 'Lỗi khi gửi bình luận.', true);
                return;
            }

            showCommentMessage('Đã gửi bình luận.');

            if (commentNameInput) commentNameInput.value = '';
            if (commentContentInput) commentContentInput.value = '';

            if (commentList) {
                if (commentList.querySelector('.no-comment')) {
                    commentList.innerHTML = '';
                }
                const div = document.createElement('div');
                div.className = 'comment-item';
                div.innerHTML = `<div class="comment-name">${data.name}</div>
                                 <div class="comment-content">${data.content}</div>`;
                commentList.prepend(div);
            }
        } catch (e) {
            showCommentMessage('Không kết nối được tới server.', true);
        }
    });
}

