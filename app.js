const signupBtn = document.getElementById('btn-signup');
const loginBtn = document.getElementById('btn-login');
const signupMessage = document.getElementById('signup-message');
const loginMessage = document.getElementById('login-message');

const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const loginPanel = document.getElementById('login-panel');
const signupPanel = document.getElementById('signup-panel');

function setActivePanel(panel) {
    if (!loginPanel || !signupPanel || !tabLogin || !tabSignup) return;

    if (panel === 'login') {
        loginPanel.classList.add('active');
        signupPanel.classList.remove('active');
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
    } else if (panel === 'signup') {
        signupPanel.classList.add('active');
        loginPanel.classList.remove('active');
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
    }
}

if (tabLogin && tabSignup) {
    tabLogin.addEventListener('click', () => setActivePanel('login'));
    tabSignup.addEventListener('click', () => setActivePanel('signup'));
}

function showMessage(el, message, isError = false) {
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? 'red' : 'green';
}

if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
        const username = document.getElementById('signup-username').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-password-confirm').value;

        if (!username || !email || !password || !confirmPassword) {
            showMessage(signupMessage, 'Vui lòng nhập đầy đủ thông tin.', true);
            return;
        }

        if (!email.endsWith('@gmail.com')) {
            showMessage(signupMessage, 'Vui lòng sử dụng Gmail (@gmail.com).', true);
            return;
        }

        if (password !== confirmPassword) {
            showMessage(signupMessage, 'Mật khẩu nhập lại không khớp.', true);
            return;
        }

        try {
            const res = await fetch('/api/register/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, email, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                showMessage(signupMessage, data.error || 'Có lỗi xảy ra khi đăng ký.', true);
            } else {
                showMessage(signupMessage, data.message || 'Đã gửi email xác minh đến Gmail của bạn.');
            }
        } catch (error) {
            showMessage(signupMessage, 'Không kết nối được tới server. Hãy kiểm tra xem server đã chạy chưa.', true);
        }
    });
}

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            showMessage(loginMessage, 'Vui lòng nhập tên đăng nhập và mật khẩu.', true);
            return;
        }

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                showMessage(loginMessage, data.error || 'Đăng nhập thất bại.', true);
            } else {
                showMessage(loginMessage, data.message || 'Đăng nhập thành công.');
                try {
                    localStorage.setItem('vnarUser', username);
                } catch (e) {
                }
                setTimeout(() => {
                    window.location.href = '/home.html';
                }, 400);
            }
        } catch (error) {
            showMessage(loginMessage, 'Không kết nối được tới server. Hãy kiểm tra xem server đã chạy chưa.', true);
        }
    });
}

