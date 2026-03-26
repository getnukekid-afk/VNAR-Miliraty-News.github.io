const articleForm = document.getElementById('article-form');
const editorMessage = document.getElementById('editor-message');

function showEditorMessage(text, isError = false) {
    if (!editorMessage) return;
    editorMessage.textContent = text;
    editorMessage.style.color = isError ? 'red' : 'green';
}

if (articleForm) {
    articleForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(articleForm);

        try {
            const res = await fetch('/api/articles', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                showEditorMessage(data.error || 'Lỗi khi lưu bài viết.', true);
                return;
            }

            showEditorMessage('Đã đăng bài thành công, đang chuyển trang...');

            if (data.url) {
                setTimeout(() => {
                    window.location.href = data.url;
                }, 600);
            }
        } catch (e) {
            showEditorMessage('Không kết nối được tới server.', true);
        }
    });
}

