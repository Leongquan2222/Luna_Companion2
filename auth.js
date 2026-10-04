document.addEventListener('DOMContentLoaded', () => {
  const signUpButton = document.getElementById('signUpBtn');
  const signInButton = document.getElementById('signInBtn');
  const authContainer = document.getElementById('authContainer');

  const signUpForm = document.getElementById('signUpForm');
  const signInForm = document.getElementById('signInForm');

  // Chuyển đổi giữa Đăng ký & Đăng nhập
  if (signUpButton && signInButton && authContainer) {
    signUpButton.addEventListener('click', () => {
      authContainer.classList.add('right-panel-active');
    });

    signInButton.addEventListener('click', () => {
      authContainer.classList.remove('right-panel-active');
    });
  }

  // Xử lý sự kiện Submit Form Đăng ký
  signUpForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('signUpName').value.trim();
    const email = document.getElementById('signUpEmail').value.trim();
    const password = document.getElementById('signUpPassword').value.trim();

    // Lưu tài khoản vào LocalStorage (giả lập backend)
    const user = { name, email, password };
    localStorage.setItem('user_' + email, JSON.stringify(user));

    alert('Đăng ký thành công! Hãy đăng nhập ngay.');
    authContainer.classList.remove('right-panel-active');
    signUpForm.reset();
  });

  // Xử lý sự kiện Submit Form Đăng nhập
  signInForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('signInEmail').value.trim();
    const password = document.getElementById('signInPassword').value.trim();

    const storedUser = localStorage.getItem('user_' + email);

    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData.password === password) {
        localStorage.setItem('currentUser', JSON.stringify(userData));
        alert(`Chào mừng ${userData.name} đã quay trở lại!`);
        window.location.href = 'index.html'; // Chuyển về trang chính
      } else {
        alert('Mật khẩu không chính xác!');
      }
    } else {
      alert('Tài khoản không tồn tại trên hệ thống!');
    }
  });
});