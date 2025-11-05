document.addEventListener('DOMContentLoaded', function () {
    // --- 模拟数据库 ---

    // 用户表 (Users Table)
    let users = JSON.parse(localStorage.getItem('blogUsers')) || [
        // 预置一个编辑者账户和一个游客账户
        { id: 0, username: 'admin', role: 'admin', password: '1234' },
        { id: 1, username: 'editor', role: 'editor', password: '1234' },
        { id: 2, username: 'visitor1', role: 'visitor', password: '4567' }
    ];

    const EDITOR_INVITATION_CODE = 'moonglow2025';

    // 当前会话 (Session)
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    // 注意：用 sessionStorage，这样关闭浏览器标签页后会自动“登出”

    // 投票记录表 (Votes Table) - 现在与 userId 关联
    let votes = JSON.parse(localStorage.getItem('blogVotes')) || [
        { userId: 2, postId: 1, value: 1 }
    ];

    function saveUsers() { localStorage.setItem('blogUsers', JSON.stringify(users)); }
    function saveVotes() { localStorage.setItem('blogVotes', JSON.stringify(votes)); }

    function createAuthModal() {
        const modalHtml = `
        <div id="auth-modal" class="modal-overlay">
            <div class="modal-content">
                <button class="close-modal-btn" title="关闭">×</button>
                <h2 id="modal-title">登录您的账户</h2>
                <form id="auth-form">
                    <div class="form-group">
                        <label for="auth-username">用户名</label>
                        <input type="text" id="auth-username" required>
                    </div>
                    <div class="form-group">
                        <label for="auth-password">密码</label>
                        <input type="password" id="auth-password" required>
                    </div>
                    <!-- 确认密码框，仅在注册模式下显示 -->
                    <div class="form-group" id="confirm-password-group" style="display:none;">
                        <label for="auth-confirm-password">确认密码</label>
                        <input type="password" id="auth-confirm-password">
                    </div>
                    <!-- === 新增：邀请码输入框，仅在注册模式下显示 === -->
                    <div class="form-group" id="invitation-code-group" style="display:none;">
                        <label for="auth-invitation-code">邀请码 (可选)</label>
                        <input type="text" id="auth-invitation-code" placeholder="填写邀请码以注册为编辑者">
                    </div>
                    <div id="auth-error-msg" class="error-msg"></div>
                    <button type="submit" id="auth-submit-btn">登录</button>
                </form>
                <div class="modal-footer">
                    <span id="modal-switch-text">没有账户？</span>
                    <a href="#" id="switch-to-register">立即注册</a>
                </div>
            </div>
        </div>
    `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    createAuthModal();

    function setupAuthSystem() {
        const authModal = document.getElementById('auth-modal');
        const authForm = document.getElementById('auth-form');
        const modalTitle = document.getElementById('modal-title');
        const submitBtn = document.getElementById('auth-submit-btn');
        const switchLink = document.getElementById('switch-to-register');
        const switchText = document.getElementById('modal-switch-text');
        const confirmPasswordGroup = document.getElementById('confirm-password-group');
        const passwordInput = document.getElementById('auth-password');

        const navUl = document.querySelector('.main-nav ul');
        if (!navUl) return;

        const authLi = document.createElement('li');
        authLi.className = 'nav-auth-item';

        let isRegisterMode = false;

        if (currentUser) {
            // --- 已登录状态 ---
            const welcomeMsg = document.createElement('span');
            welcomeMsg.className = 'nav-welcome-msg';
            welcomeMsg.textContent = `欢迎, ${currentUser.username}`;

            const logoutBtn = document.createElement('button');
            logoutBtn.textContent = '登出';
            logoutBtn.className = 'nav-logout-btn';
            logoutBtn.addEventListener('click', () => {
                setCurrentUser(null);
            });

            authLi.appendChild(welcomeMsg);
            authLi.appendChild(logoutBtn);
        } else {
            // --- 未登录状态 ---
            const loginBtn = document.createElement('button');
            loginBtn.textContent = '登录';
            loginBtn.className = 'nav-login-btn';
            loginBtn.addEventListener('click', () => {
                authModal.classList.add('active');
            });
            authLi.appendChild(loginBtn);

        }

        navUl.appendChild(authLi);

        // 模态框事件监听器
        const closeModalBtn = document.querySelector('.close-modal-btn');
        const modal = document.querySelector('.modal-overlay');
        closeModalBtn.addEventListener('click', () => {
            authModal.classList.remove('active');
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                authModal.classList.remove('active');
            }
        });


        // --- 登录/注册逻辑 ---
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('auth-username').value.trim();
            const password = document.getElementById('auth-password').value;

            const errorMsg = document.getElementById('auth-error-msg');

            if (isRegisterMode) {
                // --- 注册逻辑 ---

                const confirmPassword = document.getElementById('auth-confirm-password').value;
                const invitationCode = document.getElementById('auth-invitation-code').value.trim();


                // a. 验证密码
                if (password.length < 4) {
                    errorMsg.textContent = '密码不能少于4位！';
                    return;
                }
                if (password !== confirmPassword) {
                    errorMsg.textContent = '两次输入的密码不一致！';
                    return;
                }
                if (users.find(u => u.username === username)) {
                    errorMsg.textContent = '用户名已存在！';
                    return;
                }

                // b. 确定用户角色
                let role = 'visitor'; // 默认为游客
                if (invitationCode) {
                    if (invitationCode === EDITOR_INVITATION_CODE) {
                        role = 'editor';
                    } else {
                        errorMsg.textContent = '邀请码无效！';
                        return; // 如果填写了错误的邀请码，则中断注册
                    }
                }

                const newUser = {
                    id: Date.now(),
                    username,
                    role: role,
                    password: password // 保存密码
                };

                users.push(newUser);
                saveUsers();

                if (role === 'editor') {
                    showToast('编辑者账户注册成功！已自动为您登录。');
                } else {
                    showToast('游客账户注册成功！已自动为您登录。');
                }

                setCurrentUser(newUser); // 注册后直接登录
            } else {
                // --- 登录逻辑 ---

                const user = users.find(u => u.username === username);
                if (!user || user.password !== password) {
                    errorMsg.textContent = '用户名或密码错误！';
                    return;
                }
                setCurrentUser(user);
            }
        });

        // --- 切换登录/注册模式的函数 ---
        function toggleMode(register = false) {
            isRegisterMode = register;
            authForm.reset();
            document.getElementById('auth-error-msg').textContent = '';
            const invitationCodeGroup = document.getElementById('invitation-code-group');

            if (isRegisterMode) {
                modalTitle.textContent = '创建新账户';
                passwordInput.placeholder = '设置密码 (至少4位)';
                confirmPasswordGroup.style.display = 'block';
                invitationCodeGroup.style.display = 'block'; // 显示邀请码输入框
                document.getElementById('auth-confirm-password').required = true;
                submitBtn.textContent = '注册';
                switchText.textContent = '已有账户？';
                switchLink.textContent = '立即登录';
            } else {
                modalTitle.textContent = '登录您的账户';
                passwordInput.placeholder = '输入您的密码';
                confirmPasswordGroup.style.display = 'none';
                invitationCodeGroup.style.display = 'none'; // 隐藏邀请码输入框
                document.getElementById('auth-confirm-password').required = false;
                submitBtn.textContent = '登录';
                switchText.textContent = '没有账户？';
                switchLink.textContent = '立即注册';
            }
        }



        // --- 切换登录/注册模式 ---
        switchLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleMode(!isRegisterMode); // 切换模式
        });
        // ... 更新UI，比如标题、按钮文字等 ...

        function setCurrentUser(user) {
            currentUser = user;
            /* sessionStorage.setItem('currentUser', JSON.stringify(user)); */
            if (user) {
                localStorage.setItem('currentUser', JSON.stringify(user));
            } else {
                localStorage.removeItem('currentUser'); // 登出时，明确地移除
            }
            location.reload();
        }
    }
    setupAuthSystem();


    function checkUserRole() {
        if (currentUser && currentUser.role === 'editor') {
            document.body.classList.add('role-editor');
        } else {
            document.body.classList.add('role-visitor');
        }
    }

    checkUserRole();

    //节流
    function throttle(fn, delay) {
        let lastCall = 0;
        return function (...args) {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                fn.apply(this, args);
            }
        };
    }

    function initSmartNavbar() {
        const nav = document.querySelector('.main-nav');
        const body = document.body;

        if (!nav) return;

        // --- 定义过渡的参数 ---
        const startCompactScrollY = 200;  // 开始收缩的滚动位置
        const endCompactScrollY = 260;   // 完全收缩的滚动位置
        const transitionRange = endCompactScrollY - startCompactScrollY;

        // 定义导航栏链接的 padding 变化范围
        const initialPadding = 15; // px
        const compactPadding = 8;  // px
        const paddingRange = initialPadding - compactPadding;

        // 定义字体大小变化范围
        const initialFontSize = 1.15; // em
        const compactFontSize = 0.95;  // em
        const fontSizeRange = initialFontSize - compactFontSize;

        // 定义导航栏无序列表的 margin 变化范围
        const initialMarginBlockStart = 1; // em
        const compactMarginBlockStart = 0;  // em
        const marginBlockStartRange = initialMarginBlockStart - compactMarginBlockStart;

        const initialMarginBlockEnd = 1; // em
        const compactMarginBlockEnd = 0;  // em
        const marginBlockEndRange = initialMarginBlockEnd - compactMarginBlockEnd;

        // --- 滚动事件监听器 ---
        window.addEventListener('scroll', throttle(() => {
            const scrollY = window.scrollY;

            // 1. 在过渡区域之外
            if (scrollY < startCompactScrollY) {
                // 完全展开状态
                nav.classList.remove('compact'); // 移除 compact 类以应用默认背景等
                setNavStyles(initialPadding, initialFontSize, initialMarginBlockStart, initialMarginBlockEnd);
                return;
            }
            if (scrollY > endCompactScrollY) {
                // 完全收缩状态
                nav.classList.add('compact'); // 添加 compact 类以应用模糊背景等
                setNavStyles(compactPadding, compactFontSize, compactMarginBlockStart, compactMarginBlockEnd);
                return;
            }

            // 2. 正在过渡区域内
            nav.classList.add('compact'); // 在过渡时也应用模糊背景等

            // 计算当前在过渡区间的进度 (0.0 到 1.0)
            const progress = (scrollY - startCompactScrollY) / transitionRange;

            // 根据进度计算当前的 padding 和 font-size
            const currentPadding = initialPadding - (paddingRange * progress);
            const currentFontSize = initialFontSize - (fontSizeRange * progress);
            const currentMarginBlockStart = initialMarginBlockStart - (marginBlockStartRange * progress);
            const currentMarginBlockEnd = initialMarginBlockEnd - (marginBlockEndRange * progress);

            setNavStyles(currentPadding, currentFontSize, currentMarginBlockStart, currentMarginBlockEnd);

        }, 6), { passive: true });

        // --- 封装一个设置样式的函数，避免重复代码 ---
        function setNavStyles(padding, fontSize, marginBlockStart, marginBlockEnd) {
            const links = nav.querySelectorAll('li a');
            const ul = nav.querySelector('ul');
            links.forEach(link => {
                link.style.padding = `${padding}px 20px`; // 上下padding动态变化
                link.style.fontSize = `${fontSize}em`;
            });
            ul.style.marginBlockStart = `${marginBlockStart}em`;
            ul.style.marginBlockEnd = `${marginBlockEnd}em`;
        }
    }

    // 读取所有文章数据or使用默认数据
    let posts = JSON.parse(localStorage.getItem('blogPosts')) || [

        {
            author: {
                id: 1,
                username: "editor",
                role: "editor",
                password: "1234"
            },
            id: 1751731200000,
            categoryId: 1,
            isFeatured: false,
            featuredDate: null,
            title: "关于月华庭",
            date: new Date(1751731200000),
            lastUpdated: null,
            imageUrl: "",
            editorType: "markdown",
            content: "这是戌月制作的个人博客网页。使用了HTML、CSS、JavaScript技术。\n",
            tags: [
                "关于"
            ],
            comments: [],
            votes: 0,
            views: 0
        }
        ,
        {
            id: 1,
            categoryId: 1,
            author: users[1],
            isFeatured: true,
            featuredDate: null,
            title: "月亮升起来了。",
            date: new Date(1686240000000),
            lastUpdated: new Date(1686240000000),
            imageUrl: "../imgs/moon1.jpg",
            editorType: 'tinymce', // 'tinymce' 或 'markdown'
            content: `
    <h1 style="font-size: 2em; font-weight: bold; color: #d9534f; text-shadow: 1px 1px 2px rgba(0,0,0,0.2); margin-bottom: 20px; border-bottom: 2px solid #0056b3; padding-bottom: 5px; margin-top: 30px;">HTML 彩色字符与大小测试文本</h1>

    <p style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">如果你仔细看，会发现，哇哦，这居然是一段<span style="color: #ff5733; font-weight: bold; font-size: 1.1em;">测试文本</span>！你仔细看了这一段文字，然后发现它是一段测试文本，这是多么巧合的事情！</p>

    <div style="border-left: 5px solid #5cb85c; padding-left: 15px; margin: 15px 0; background-color: #e6ffe6; color: #333; font-style: italic; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6;">
        <p>这是一段引用，正如你所见，它包含了原始文本的第一句话。</p>
        <p>如果你再仔细看，会发现，哇哦，这居然是第二段测试文本！</p>
    </div>

    <p style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;"><span style="font-size: 1.5em; color: #6a0572; font-weight: bold;">你又仔细看了这一段文字，然后发现它还是一段测试文本，这是多么多么巧合的事情！</span></p>

    <h2 style="color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 5px; margin-top: 30px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">列表示例</h2>

    <ul style="margin-bottom: 15px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6;">
        <li style="color: #34495e;">这是一个无序列表项
            <ul style="margin-bottom: 0;">
                <li style="color: #2c3e50;">嵌套的列表项
                    <ul style="margin-bottom: 0;">
                        <li style="color: #1a242f;">更深层次的嵌套</li>
                    </ul>
                </li>
            </ul>
        </li>
        <li style="color: #34495e;">另一个无序列表项</li>
    </ul>

    <ol style="margin-bottom: 15px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6;">
        <li style="color: #2980b9;">这是一个有序列表项</li>
        <li style="color: #2980b9;">第二个有序列表项
            <ol style="margin-bottom: 0;">
                <li style="color: #1abc9c;">嵌套的有序列表</li>
                <li style="color: #1abc9c;">再一个嵌套项</li>
            </ol>
        </li>
    </ol>

    <h2 style="color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 5px; margin-top: 30px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">代码与链接</h2>

    <p style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">这是 <code style="background-color: #e0e0e0; padding: 2px 4px; border-radius: 3px; font-family: 'Courier New', Courier, monospace; color: #c7254e;">行内代码</code> 的一个例子。</p>

    <pre style="background-color: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; margin-bottom: 20px;"><code class="language-python" style="background-color: transparent; color: #f8f8f2; padding: 0;"># 这是一个代码块
def greet(name):
    print(f"Hello, {name}!")

greet("Markdown")
</code></pre>

    <p style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">你可以在 <a href="https://www.markdownguide.org/" target="_blank" style="color: #007bff; text-decoration: none; transition: color 0.3s ease;">这里</a> 找到更多关于 Markdown 的信息。</p>

    <h2 style="color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 5px; margin-top: 30px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">图片与表格</h2>

    <div style="text-align: center; margin: 20px 0;">
        <p style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">这是一张图片：</p>
        <img src="../imgs/moon1.jpg" alt="月亮图片" style="max-width: 100%; height: auto; border: 3px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1); font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <thead>
            <tr>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left; background-color: #f2f2f2; color: #333; font-weight: bold;">表头一</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center; background-color: #f2f2f2; color: #333; font-weight: bold;">表头二</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right; background-color: #f2f2f2; color: #333; font-weight: bold;">表头三</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: left;">左对齐</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">居中</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">右对齐</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: left;">内容 A</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">内容 B</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">内容 C</td>
            </tr>
            <tr>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: left;">内容 D</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: center;">内容 E</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right;">内容 F</td>
            </tr>
        </tbody>
    </table>

    <h2 style="color: #0056b3; border-bottom: 2px solid #0056b3; padding-bottom: 5px; margin-top: 30px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">强调与删除线</h2>

    <p style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">你也可以使用 <span style="font-style: italic; color: #e67e22;">斜体</span> 或 <span style="font-style: italic; color: #e67e22;">斜体</span> 来强调文字。</p>
    <p style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">或者使用 <span style="font-weight: bold; color: #c0392b; font-size: 1.2em;">粗体</span> 或 <span style="font-weight: bold; color: #c0392b; font-size: 1.2em;">粗体</span> 来更强烈的强调。</p>
    <p style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">当然，还可以同时使用 <span style="font-weight: bold; font-style: italic; color: #8e44ad; font-size: 1.3em; text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.1);">粗斜体</span> 或 <span style="font-weight: bold; font-style: italic; color: #8e44ad; font-size: 1.3em; text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.1);">粗斜体</span>。</p>

    <p style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;">这是 <span style="text-decoration: line-through; color: #95a5a6;">被删除的文本</span>。</p>
    <p style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;"><a href="post.html?id=2" target="_blank" style="display: inline-block; padding: 10px 15px; margin-top: 15px; background-color: #28a745; color: white; border-radius: 5px; text-decoration: none; font-weight: bold; transition: background-color 0.3s ease;">预览卡片测试</a></p>

    <p style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333;"><a href="#" style="color: #6c757d; font-style: italic; text-decoration: underline dotted;">自指链接</a></p>

    `,
            tags: ['测试', '生活', '科幻', '奇幻'],
            comments: [
                {
                    commentId: 123,
                    userId: 1,
                    username: 'editor',
                    text: '这是父评论！',
                    date: Date.now(),
                    votes: 1,         // 评论的净票数
                    parentId: null,     // 父评论ID，null表示是顶级评论
                    replies: []       // 存放回复的数组 (虽然我们这次不直接用，但为未来做准备)
                },
                {
                    commentId: 124,
                    userId: 2,
                    username: 'visitor1',
                    text: '这是对楼上的回复。',
                    date: Date.now() + 1000,
                    votes: 0,
                    parentId: 123,   // 指向父评论的ID
                    replies: []
                }
            ]
            ,
            votes: -1,
            views: 150

        },
        {
            id: 2,
            categoryId: 2,
            author: users[0],
            isFeatured: true,
            featuredDate: null,
            title: "月亮落下去了。",
            date: new Date(1686240000000),
            lastUpdated: new Date(1686240000000),
            imageUrl: "../imgs/moon2.gif",
            editorType: 'markdown',
            content: `-----

## Markdown 语法测试文本

如果你仔细看，会发现，哇哦，这居然是一段**测试文本**！你仔细看了这一段文字，然后发现它是一段测试文本，这是多么巧合的事情！

> 这是一段引用，正如你所见，它包含了原始文本的第一句话。
> 如果你再仔细看，会发现，哇哦，这居然是第二段测试文本！

你又仔细看了这一段文字，然后发现它还是一段测试文本，这是多么多么巧合的事情！

-----

### **列表示例**

  * 这是一个无序列表项
      * 嵌套的列表项
          * 更深层次的嵌套
  * 另一个无序列表项

<!-- end list -->

1.  这是一个有序列表项
2.  第二个有序列表项
    1.  嵌套的有序列表
    2.  再一个嵌套项

-----

### **代码与链接**

这是 \`行内代码\` 的一个例子。

\`\`\`python
# 这是一个代码块
def greet(name):
    print(f"Hello, {name}!")

greet("Markdown")
\`\`\`

你可以在 [这里](https://www.markdownguide.org/) 找到更多关于 Markdown 的信息。

-----

### **图片与表格**

这是一张图片：![](../imgs/moon1.jpg)

| 表头一 | 表头二 | 表头三 |
| :----- | :----: | -----: |
| 左对齐 | 居中   | 右对齐 |
| 内容 A | 内容 B | 内容 C |
| 内容 D | 内容 E | 内容 F |

-----

### **强调与删除线**

你也可以使用 *斜体* 或 *斜体* 来强调文字。
或者使用 **粗体** 或 **粗体** 来更强烈的强调。
当然，还可以同时使用 ***粗斜体*** 或 ***粗斜体***。

这是 ~~被删除的文本~~。
[预览卡片测试](post.html?id=1)

[自指链接]()

-----

`,
            tags: ["测试", "生活", "科幻", "奇幻", "测试1", "测试2"],
            comments: [
                {
                    commentId: 125,
                    userId: 1,
                    username: 'editor',
                    text: '这是父评论！',
                    date: Date.now(),
                    votes: 0,         // <--- 新增：评论的净票数
                    parentId: null,     // <--- 新增：父评论ID，null表示是顶级评论
                    replies: []       // <--- 新增：存放回复的数组 (虽然我们这次不直接用，但为未来做准备)
                },
                {
                    commentId: 126,
                    userId: 2,
                    username: 'visitor1',
                    text: '这是对楼上的回复。',
                    date: Date.now() + 1000,
                    votes: 0,
                    parentId: 125,   // <--- 指向父评论的ID
                    replies: []
                }
            ]
            ,
            votes: 0,
            views: 280
        }

    ];

    let categories = JSON.parse(localStorage.getItem('blogCategories')) || [
        { id: 1, name: '未分类' },
        { id: 2, name: '技术分享' },
        { id: 3, name: '生活随笔' }
    ];

    let commentVotes = JSON.parse(localStorage.getItem('blogCommentVotes')) || [
        { userId: 2, commentId: 123, value: 1 }
    ];
    function saveCommentVotes() { localStorage.setItem('blogCommentVotes', JSON.stringify(commentVotes)); }


    /*     let userVotes = JSON.parse(localStorage.getItem('userVotes')) || [
            // 存储该用户对每个post的投票值
            { postId: 1, value: 1 },
            { postId: 2, value: -1 }
        ]; */

    //保存文章到localStorage
    function savePosts() {
        localStorage.setItem('blogPosts', JSON.stringify(posts));
    }

    function saveCategories() {
        localStorage.setItem('blogCategories', JSON.stringify(categories));
    }

    function saveVotes() {
        localStorage.setItem('blogVotes', JSON.stringify(votes));
    }

    // --- 创建一个自定义的 Marked.js 渲染器 ---
    const renderer = new marked.Renderer();

    /**
     * 统一处理文章内容，将其转换为可安全渲染的、带增强链接的HTML
     * @param {object} post - 文章对象
     * @returns {string} - 最终的HTML字符串
     */
    function processContent(post) {
        let rawHtml = '';
        // --- 将不同格式的内容统一转换为HTML字符串 ---
        if (post.editorType === 'markdown') {
            // 对于Markdown，使用我们之前定义的、带自定义渲染器的marked.js
            rawHtml = marked.parse(post.content || '', { renderer: renderer });
        } else { // 'tinymce' 或其他默认为HTML
            rawHtml = post.content || '';
        }

        // --- 扫描并增强HTML中的链接 (如果marked的renderer没处理的话) ---
        // 为了创建一个能处理任何HTML的通用方法，我们使用DOM解析器。
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawHtml;

        const links = tempDiv.querySelectorAll('a');
        links.forEach(link => {
            try {
                // 使用 new URL() 来健壮地解析链接
                const url = new URL(link.href, window.location.origin); // 第二个参数是基础URL
                if (url.pathname.endsWith('/post.html') && url.searchParams.has('id')) {
                    // 这是我们的站内链接
                    const postId = url.searchParams.get('id');
                    link.classList.add('internal-link');
                    link.dataset.postId = postId;
                }
            } catch (e) {
                // 忽略无效的URL，比如 'javascript:void(0)'
            }
        });

        return tempDiv.innerHTML;
    }

    /**
     * 为单个 select 元素添加包裹器 div
     * @param {HTMLElement} selectElement - 要被包裹的 select 元素
     */
    function wrapSelect(selectElement) {
        // 如果已经包裹过了，就直接返回，防止重复
        if (selectElement.parentElement.classList.contains('select-wrapper')) {
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'select-wrapper';

        /*const prevSibling = selectElement.previousElementSibling;

         

        if (prevSibling && prevSibling.tagName === 'LABEL'  && prevSibling.getAttribute('for') === selectElement.id ) {
            wrapper.appendChild(prevSibling);
        } */
        // 将 select 元素移动到包裹器内部
        selectElement.parentNode.insertBefore(wrapper, selectElement);
        wrapper.appendChild(selectElement);

    }


    /**
     * 截取字符串并添加省略号
     * @param {string} text - 要截取的文本
     * @param {number} maxLength - 最大长度
     * @returns {string} - 截取后的文本
     */
    function truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '……';
    }

    /**
 * 智能截断HTML字符串，确保标签闭合
 * @param {string} htmlString - 要截断的HTML字符串
 * @param {number} maxLength - 最大文本长度
 * @returns {string} - 截断并修正后的HTML字符串
 */
    function truncateHtml(htmlString, maxLength) {
        if (!htmlString) return '';

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;

        let charCount = 0;
        let nodeToTruncate = null;
        let lengthToTruncate = 0;

        // 1. 第一次遍历：查找截断点，不修改DOM
        function findTruncatePoint(node) {
            if (charCount >= maxLength) return true; // 全局停止标志

            if (node.nodeType === 3) { // 文本节点
                const remainingLength = maxLength - charCount;
                if (node.textContent.trim().length > remainingLength) {
                    nodeToTruncate = node; // 记录下需要被截断的节点
                    lengthToTruncate = remainingLength; // 记录需要保留的长度
                    charCount = maxLength;
                    return true; // 停止
                } else {
                    charCount += node.textContent.trim().length;
                }
            } else if (node.nodeType === 1) { // 元素节点
                // 使用 for...of 循环，可以配合 break 或 return
                for (const childNode of Array.from(node.childNodes)) {
                    if (findTruncatePoint(childNode)) {
                        return true; // 向上层传递“停止”信号
                    }
                }
            }
            return false; // 继续
        }

        findTruncatePoint(tempDiv);

        // 2. 如果找到了截断点，进行DOM操作
        if (nodeToTruncate) {
            // 截断目标文本节点
            nodeToTruncate.textContent = nodeToTruncate.textContent.substring(0, lengthToTruncate);

            // 移除截断点之后的所有节点
            let currentNode = nodeToTruncate;
            while (currentNode) {
                // 移除所有后续的兄弟节点
                let nextSibling = currentNode.nextSibling;
                while (nextSibling) {
                    const toRemove = nextSibling;
                    nextSibling = nextSibling.nextSibling;
                    toRemove.parentNode.removeChild(toRemove);
                }

                // 移动到父节点，继续清理父节点的后续兄弟节点
                currentNode = currentNode.parentNode;

                // 如果回到根节点，则停止
                if (currentNode === tempDiv) break;
            }
        }

        // 3. 在末尾添加省略号
        // 我们检查返回的HTML是否真的比原始HTML短，如果是，才加省略号
        const resultHtml = tempDiv.innerHTML;
        if (resultHtml.length < htmlString.length) {
            return resultHtml + '...';
        }

        return resultHtml;
    }

    /*    function truncateHtml(htmlString, maxLength) {
           if (!htmlString) return '';
   
           // 1. 创建一个临时的div来解析HTML
           const tempDiv = document.createElement('div');
           tempDiv.innerHTML = htmlString;
   
           let truncatedLength = 0;
           let openTags = []; // 用于追踪未闭合的标签
   
           function traverseNodes(node) {
               // 如果已经达到或超过长度，则停止
               if (truncatedLength >= maxLength) {
                   // 移除当前节点及其后的所有兄弟节点
                   while (node) {
                       const next = node.nextSibling;
                       node.parentNode.removeChild(node);
                       node = next;
                   }
                   return;
               }
   
               if (node.nodeType === 3) { // 文本节点
                   const remainingLength = maxLength - truncatedLength;
                   if (node.textContent.length > remainingLength) {
                       // 截断当前文本节点
                       node.textContent = node.textContent.substring(0, remainingLength) + '...';
                       truncatedLength = maxLength;
                   } else {
                       truncatedLength += node.textContent.length;
                   }
               } else if (node.nodeType === 1) { // 元素节点
                   // 递归遍历子节点
                   for (let i = 0; i < node.childNodes.length; i++) {
                       traverseNodes(node.childNodes[i]);
                   }
               }
           }
   
           // 从根节点开始遍历
           traverseNodes(tempDiv);
   
           // 返回处理后的HTML
           return tempDiv.innerHTML;
       } */


    function stripAttributes(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // 递归处理所有元素节点
        function clean(node) {
            if (node.nodeType === 1) { // 元素节点
                // 只保留标签名，移除所有属性
                for (let i = node.attributes.length - 1; i >= 0; i--) {
                    node.removeAttribute(node.attributes[i].name);
                }
            }
            // 递归处理子节点
            node.childNodes.forEach(child => clean(child));
        }
        tempDiv.childNodes.forEach(child => clean(child));
        return tempDiv.innerHTML;
    }



    // 创建一个新的辅助函数，专门用来获取首页要展示的“亮月相”文章
    function getHomepageFeatures(posts) {
        /* const featuredPosts = posts.filter(p => p.isFeatured);

        // 按浏览数排序，找到浏览量最高的文章
        const topViewedPost = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0))[0];

        // 按点赞数排序，找到点赞数最高的文章
        const topVotedPost = [...posts].sort((a, b) => (b.votes || 0) - (a.votes || 0))[0];
        */

        // --- 初始化 ---
        const featureMap = new Map();

        posts.forEach(post => {
            featureMap.set(post.id, { ...post, featureReasons: [] });
        });


        /*
        if (topVotedPost && !featureMap.has(topVotedPost.id)) {
            featureMap.set(topVotedPost.id, { ...topVotedPost, featureReason: 'top-voted' });
        }

        if (topViewedPost && !featureMap.has(topViewedPost.id)) {
            featureMap.set(topViewedPost.id, { ...topViewedPost, featureReason: 'top-viewed' });
        }

        return Array.from(featureMap.values()); */

        // --- 依次检查各种上榜条件，并添加理由 ---

        // 添加“编辑精选”理由
        const featuredPosts = posts.filter(p => p.isFeatured);
        featuredPosts.forEach(post => {
            featureMap.get(post.id).featureReasons.push('featured');
        });

        // 添加“热门高赞”理由
        // 先对所有文章按点赞数排序，只取前几篇，比如前2篇
        const topVotedPosts = [...posts]
            .filter(p => (p.votes || 0) > 0) // 至少有1个赞
            .sort((a, b) => (b.votes || 0) - (a.votes || 0))
            .slice(0, 2); // 只取前2名

        topVotedPosts.forEach(post => {
            const postInMap = featureMap.get(post.id);
            // 避免重复添加
            if (!postInMap.featureReasons.includes('top-voted')) {
                postInMap.featureReasons.push('top-voted');
            }
        });

        // 添加“热门浏览”理由
        const topViewedPosts = [...posts]
            .filter(p => (p.views || 0) > 0) // 可调整上榜所需数量
            .sort((a, b) => (b.views || 0) - (a.views || 0))
            .slice(0, 2); // 只取前2名

        topViewedPosts.forEach(post => {
            const postInMap = featureMap.get(post.id);
            if (!postInMap.featureReasons.includes('top-viewed')) {
                postInMap.featureReasons.push('top-viewed');
            }
        });

        // --- 筛选出最终要展示的文章 ---
        // 只要一篇文章有任何一个上榜理由，它就应该被展示
        const finalFeatures = Array.from(featureMap.values())
            .filter(post => post.featureReasons.length > 0);

        // 对最终结果进行排序，让理由更多的排在前面
        finalFeatures.sort((a, b) => b.featureReasons.length - a.featureReasons.length);

        return finalFeatures;
    }

    /**
     * 为首页卡片渲染带高亮原因的状态栏
     * @param {object} post - 带有 featureReasons 数组的文章对象
     * @param {boolean} ifTime - 是否显示时间
     * @returns {string} - 状态栏的HTML字符串
     */
    function renderCardStatusbar(post, ifTime = false) {
        const { id, votes, comments, views, featureReasons } = post;

        const votesCount = votes || 0;
        const commentsCount = (comments || []).length;
        const viewsCount = views || 0;

        let featuredClass = '';
        let votedClass = '';
        let viewedClass = '';
        let timeHtml = '';
        let lastUpdatedHtml = '';
        // 根据 featureReasons 添加高亮 class
        if (typeof featureReasons !== 'undefined') {
            featuredClass = featureReasons.includes('featured') ? 'highlight' : '';
            votedClass = featureReasons.includes('top-voted') ? 'highlight' : '';
            viewedClass = featureReasons.includes('top-viewed') ? 'highlight' : '';
        }
        if (ifTime) {
            dateHtml = `<span class="meta-item published-date">${new Date(post.date).toLocaleDateString('zh-CN')}</span>`;
            lastUpdatedHtml = post.lastUpdated ? `<span class="meta-item last-updated">（${new Date(post.lastUpdated).toLocaleDateString('zh-CN')}）</span>` : '';
        }

        return `
        <div class="card-statusbar">
            <!-- 只有被精选时，才显示“精选”标签 -->
            ${(featureReasons !== undefined && featureReasons.includes('featured')) ? `
            <span class="card-status-item ${featuredClass}">
                <span class="iconfont icon-star"></span> 精选
            </span>` : ''}

            <span class="card-status-item ${votedClass}">
                <span class="iconfont icon-upvote2"></span> ${votesCount}
            </span>
            <span class="card-status-item ${viewedClass}">
                <span class="iconfont icon-view"></span> ${viewsCount}
            </span>
            <span class="card-status-item">
                <span class="iconfont icon-comment"></span> ${commentsCount}
            </span>
            ${ifTime ? `
                <span class="card-status-item">
                    ${dateHtml}
                </span>
                ${lastUpdatedHtml ? `
                    <span class="card-status-item">
                        ${lastUpdatedHtml}
                    </span>
                    ` : ''}
                `: ''}

        </div>
    `;
    }

    function renderFeaturedPosts(features) { // 现在接收的是带有 reason 的数据
        const container = document.querySelector('.featured-posts-container');
        if (!container) return;

        /*         const featuredPosts = posts.filter(post => post.isFeatured);
        
                featuredPosts.sort((a, b) => {
                    return a.featuredDate - b.featuredDate || b.id - a.id; // 按 featuredDate 升序排序，如果相同则按 id 降序
                }); */

        // 清空容器
        container.innerHTML = '';

        features.forEach(featurePost => { // featurePost 是 { ...post, featureReason: '...' }
            const linkWrapper = document.createElement('a');
            linkWrapper.href = `post.html?id=${featurePost.id}`;
            linkWrapper.className = 'blog-card';
            let contentToRender = '';

            if (featurePost.imageUrl) {
                linkWrapper.style.backgroundImage = `url(${featurePost.imageUrl})`;
            } else {
                linkWrapper.style.backgroundColor = '#555';
            }

            contentToRender = `<p>${stripAttributes(processContent(featurePost))}</p>`;


            linkWrapper.innerHTML = `
            <div class="card-content-wrapper">
                <div class="post-head">
                    <h3>${featurePost.title}</h3>
                    <div class="card-summary">${truncateHtml(contentToRender, 60)}</div>
                </div>
                <!-- 调用新的卡片状态栏渲染函数 -->
                ${renderCardStatusbar(featurePost)}
            </div>
        `;

            container.appendChild(linkWrapper);
        });
    }

    /**
 * 渲染文章的状态栏 (投票、评论、标签)
 * @param {object} post - 文章对象
 * @returns {string} - 状态栏的HTML字符串
 */
    function renderPostStatusbar(post) {
        // 渲染标签部分
        // 确保 post.tags 是一个数组
        const tagsArray = post.tags || [];
        const tagsHtml = tagsArray.map(tag =>
            `<a href="archive.html?tag=${encodeURIComponent(tag)}" class="post-tag">${tag}</a>`
        ).join('');

        // 渲染评论数部分
        // 确保 post.comments 是一个数组
        const commentsCount = (post.comments || []).length;
        const commentsHtml = `
        <span class="status-item comment-count">
            <span class="iconfont icon-comment"></span> ${commentsCount}
        </span>
    `;

        // 渲染投票数部分
        const userVoteObj = votes.find(v => v.userId === (currentUser && currentUser.id) && v.postId === post.id);
        const userVote = userVoteObj ? userVoteObj.value : 0;
        const votesHtml = `
        <span class="status-item vote-control">
            <button class="vote-btn up-vote ${userVote === 1 ? 'voted' : ''}" data-post-id="${post.id}" data-value="1">▲</button>
            <span class="vote-count">${post.votes || 0}</span>
            <button class="vote-btn down-vote ${userVote === -1 ? 'voted' : ''}" data-post-id="${post.id}" data-value="-1">▼</button>
        </span>
        `;

        const viewsHtml = `
        <span class="status-item view-count">
            <span class="iconfont icon-view"></span> ${post.views || 0}
        </span>
    `;


        // 组装成完整的状态栏
        return `
        <div class="post-statusbar" data-post-id="${post.id}">
            <div class="statusbar-left">
                ${votesHtml}
                ${commentsHtml}
                ${viewsHtml}
            </div>
            </div>
            <div class="statusbar-right">
                ${tagsHtml}
            </div>
        </div>
    `;
    }

    function handleGlobalVoting() {
        document.querySelector('.main-content').addEventListener('click', function (event) {
            if (event.target.matches('.vote-btn')) {
                const button = event.target;
                const postId = parseInt(button.dataset.postId);
                const value = parseInt(button.dataset.value);

                handleVote(postId, value); // 调用你之前写的 handleVote 核心逻辑
            }
        });
    }


    //渲染文章列表
    function renderPosts(data, container, searchTerm = '', options = {}) {

        const { limit = null, order = null } = options;

        if (!container) return;
        container.innerHTML = ''; // 清空容器

        if (data.length === 0) {
            container.innerHTML = '<h3>没有找到匹配的文章。</h3>';
            return;
        }

        let postsToRender = [...data];

        // 限制
        if (limit) {
            postsToRender = postsToRender.slice(0, limit);
        }

        // --- 遍历渲染 ---
        postsToRender.forEach(post => {
            const article = document.createElement('article');
            article.className = 'blog-post';
            let contentToRender = '';

            contentToRender = processContent(post);

            let titleHtml = post.title;
            let contentHtml = '';

            const category = categories.find(c => c.id === post.categoryId);
            const categoryHtml = category ? `<a href="archive.html?category=${category.id}" class="meta-item post-category-link">${category.name}</a>` : '';

            const hasBeenUpdated = post.lastUpdated && post.lastUpdated > post.id;
            const dateHtml = `<span class="meta-item published-date">· 发布于 ${new Date(post.date).toLocaleDateString('zh-CN')}</span>`
            const lastUpdatedHtml = hasBeenUpdated ? `<span class="meta-item last-updated">· 更新于 ${new Date(post.lastUpdated).toLocaleDateString('zh-CN')}</span>` : '';

            // --- 如果存在搜索词，则进行高亮和上下文处理 ---
            if (searchTerm) {
                // 创建不区分大小写的全局正则表达式
                //    RegExp(string, flags): 'i' for case-insensitive, 'g' for global (replace all)

                // 支持多关键词高亮
                const keywords = searchTerm.split(/\s+/).filter(Boolean);
                // 构建正则，转义特殊字符，忽略大小写
                const regex = new RegExp(
                    keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
                    'gi'
                );

                const fullHtml = contentToRender;  // 先获取带增强链接的HTML
                const plainText = new DOMParser().parseFromString(fullHtml, 'text/html').body.textContent || ""; // 提取纯文本用于搜索

                // 高亮标题
                titleHtml = post.title.replace(regex, match => `<span class="search-highlight">${match}</span>`);
                // '$&' 在 replace 方法中是一个特殊标记，代表匹配到的原始字符串

                // 3. 生成上下文预览（只显示第一个关键词的片段）
                let firstMatchIndex = -1;
                let firstKeyword = '';
                for (const kw of keywords) {
                    const idx = plainText.toLowerCase().indexOf(kw.toLowerCase());
                    if (idx !== -1 && (firstMatchIndex === -1 || idx < firstMatchIndex)) {
                        firstMatchIndex = idx;
                        firstKeyword = kw;
                    }
                }

                if (firstMatchIndex !== -1) {

                    const contextLength = 80; // 上下文预览长度
                    const startIndex = Math.max(0, firstMatchIndex - (contextLength / 2));
                    const endIndex = startIndex + contextLength;

                    let contextSnippet = plainText.substring(startIndex, endIndex);

                    // 添加省略号
                    if (startIndex > 0) contextSnippet = '...' + contextSnippet;
                    if (endIndex < plainText.length) contextSnippet += '...';

                    // 在截取的片段中对所有关键词进行高亮替换
                    const highlightedContext = contextSnippet.replace(regex, match => `<span class="search-highlight">${match}</span>`);


                    // 将上下文包裹在p标签里
                    contentHtml = `<p class="context-preview">${highlightedContext}</p>`;

                } else {
                    // 如果内容没有找到，正常显示摘要
                    contentHtml = `<p>${truncateHtml(fullHtml, 80)}</p>`;
                }
            } else {

                // --- 如果文章没有搜索词，正常显示摘要 ---
                const fullHtml = processContent(post); // 先获取完整的、增强链接后
                contentHtml = `<p>${truncateHtml(fullHtml, 500)}</p>`;
            }


            // 4. 填充 innerHTML
            article.innerHTML = `
            <div class="post-head">
                <h3><a href="post.html?id=${post.id}">${titleHtml}</a></h3>
            </div>
            <div class="post-meta-container">
                <div class="post-basic-meta">
                    <span class="meta-item author">${post.author.username}</span>
                    ${categoryHtml ? `<span>/</span> ${categoryHtml}` : ''}
                    ${dateHtml}
                    ${lastUpdatedHtml}
                </div>
                
                <!-- 调用我们已有的状态栏渲染函数 -->
                ${renderPostStatusbar(post)}
            </div>
            <hr>
            ${(!searchTerm && post.imageUrl) ? `<img src="${post.imageUrl}" alt="文章配图" class="post-image">` : ''}
            <div class="post-main">
                <div class="markdown-body">
                    ${contentHtml}
                </div>
                <div class="post-actions">
                    <a href="post.html?id=${post.id}" class="action-btn read-more-btn">
                        <span>展窗仰看</span>
                        <span class="iconfont icon-rightarrow "></span>
                    </a>
                    <div class="editor-actions">
                        <button class="action-btn feature-btn" data-id="${post.id}">${post.isFeatured ? '<span class="iconfont icon-star"></span>' : '<span class="iconfont icon-star1"></span>'}</button>
                        <a href="workspace.html?editId=${post.id}"  class="action-btn edit-btn"><span class="iconfont icon-edit"></span></a>
                        <button class="action-btn delete-btn" data-id="${post.id}"><span class="iconfont icon-trashcan"></span></button>
                    </div>
                </div>
            </div>
        `;
            container.appendChild(article);
        });
    }

    // 新文章发布
    function handlePostSubmission() {
        const form = document.getElementById('new-post-form');

        if (form) {
            form.addEventListener('submit', async function (event) {
                event.preventDefault();

                const editorType = document.getElementById('editor-choice').value;
                let content = '';
                if (editorType === 'markdown') {
                    // 从 EasyMDE 获取 Markdown
                    content = activeEditorInstance.value();
                } else {
                    // 从 TinyMCE 获取 HTML
                    content = tinymce.get('post-content').getContent();
                }

                /*                 tinymce.triggerSave(); // 确保 TinyMCE 编辑器的内容被保存到 textarea */


                const title = document.getElementById('post-title').value;
                const imageUrl = document.getElementById('post-image-url').value;

                const editingIdInput = document.getElementById('editing-post-id');
                const editingId = editingIdInput ? parseInt(editingIdInput.value) : null;

                const author = currentUser ? currentUser : { id: null, username: '匿名用户' };

                const tagsInput = document.getElementById('post-tags').value;
                // 将输入的字符串按逗号分割，并清理掉多余的空格和空标签
                const tags = tagsInput.split(',')
                    .map(tag => tag.trim()) // 去掉每个标签首尾的空格
                    .filter(tag => tag !== ''); // 过滤掉空标签

                if (!content) {
                    showToast('文章内容是空的！', 'error', 1000);
                    document.getElementById('post-content').focus();
                    tinymce.get('post-content').focus();
                    return;
                }
                if (!title) {
                    showToast('文章需要一个标题！', 'error', 1000);
                    document.getElementById('post-title').focus();
                    return;
                }

                const statusDiv = document.getElementById('publish-status');

                const categoryId = parseInt(document.getElementById('post-category').value);

                if (editingId) {
                    // --- 更新逻辑 ---
                    const postToUpdate = posts.find(p => p.id === editingId);
                    if (postToUpdate) {
                        postToUpdate.title = title;
                        postToUpdate.editorType = editorType;
                        postToUpdate.content = content;
                        postToUpdate.categoryId = categoryId;
                        postToUpdate.imageUrl = imageUrl;
                        postToUpdate.tags = tags;
                        postToUpdate.lastUpdated = Date.now();
                    }
                    statusDiv.style.display = 'block';
                    showToast('文章更新成功！前往首页……', 'success');
                } else {
                    // 创建新文章对象
                    const newPost = {
                        author: author,
                        id: Date.now(), // 使用时间戳作为唯一标识符
                        categoryId: categoryId,
                        isFeatured: false,
                        featuredDate: null,
                        title: title,
                        date: new Date().toLocaleDateString('zh-CN'), // 自动生成当前日期
                        lastUpdated: null,
                        imageUrl: imageUrl,
                        editorType: editorType,
                        content: content,
                        tags: tags,
                        comments: [],
                        votes: 0,
                        views: 0

                    };
                    statusDiv.style.display = 'block';
                    showToast('文章发布成功！前往首页……', 'success');
                    posts.unshift(newPost);

                }
                savePosts();

                form.reset();

                setTimeout(function () {
                    window.location.href = 'index.html';
                }, 1000);

            });
        }

        const contentTextarea = document.getElementById('post-content');
        const livePreview = document.getElementById('live-preview');
        contentTextarea.addEventListener('keyup', () => {
            // 简单的把文本放进去，用CSS的 white-space 来保留换行和空格
            /*             livePreview.style.whiteSpace = 'pre-wrap';
                        livePreview.textContent = contentTextarea.value; */

            // 或者，如果你想预览最终的HTML效果
            const formatted = contentTextarea.value.trim().split(/\n+/).filter(p => p.trim() !== '').map(p => `<p>${p}</p>`).join('');
            livePreview.innerHTML = formatted;
        });
    }

    //渲染文章详情页
    function renderPostDetail(post) {
        const container = document.getElementById('post-full-content');
        // 只有在详情页（即这个容器存在时）才执行
        if (!container || !post) return;

        //获取URL中的ID
        const urlParams = new URLSearchParams(window.location.search);
        const postId = parseInt(urlParams.get('id'));

        if (!postId) {
            container.innerHTML = '<h2>错误：未找到文章ID。</h2>';
            return;
        }

        //渲染
        if (post) {
            // 增加浏览次数
            if (typeof post.views !== 'number') {
                post.views = 0;
            }
            // 浏览数加一
            post.views++;
            // 立即保存回 localStorage
            savePosts();
            document.title = post.title + " - 月华庭";

            let formattedContent = '';

            const dateHtml = `<span class="meta-item published-date">· 发布于 ${new Date(post.date).toLocaleDateString('zh-CN')}</span>`
            const hasBeenUpdated = post.lastUpdated && post.lastUpdated > post.id;
            const lastUpdatedHtml = hasBeenUpdated
                ? `<span class="meta-item last-updated">· 更新于 ${new Date(post.lastUpdated).toLocaleDateString('zh-CN')}</span>`
                : '';

            formattedContent = processContent(post);

            container.innerHTML = `

        <!-- 文章内容 -->
        <h1>${post.title}</h1>
        
        <!-- === 在详情页也使用统一的元信息容器 === -->
        <div class="post-meta-container detail-view">
            <div class="post-basic-meta">
                <span class="meta-item author">月华</span>
                ${dateHtml}
                ${lastUpdatedHtml}
            </div>
            ${renderPostStatusbar(post)}
        </div>
        
        <hr>
        
        ${post.imageUrl ? `<img src="${post.imageUrl}" alt="文章配图" class="post-image">` : ''}
        <div class="markdown-body">
            ${formattedContent}
        </div>
            `;
        } else {
            container.innerHTML = '<h2>错误：文章不存在或已被删除。</h2>';
        }

        // 处理删除逻辑

    }

    // 处理用户投票
    function handleVote(postId, value) {
        if (!currentUser) {
            showToast('请先登录才能投票！', 'error');
            // 可以选择打开登录模态框
            document.getElementById('auth-modal').style.display = 'flex';
            return;
        }

        const userId = currentUser.id;
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        let userVote = votes.find(v => v.userId === userId && v.postId === postId);

        if (userVote && userVote.value === value) { // 重复点击，取消投票
            votes = votes.filter(v => !(v.userId === userId && v.postId === postId));
        } else if (userVote) { // 改票
            userVote.value = value;
        } else { // 新投票
            votes.push({ userId, postId, value });
        }

        // 重新计算总票数
        const postTotalVotes = votes.filter(v => v.postId === postId)
            .reduce((sum, vote) => sum + vote.value, 0);
        post.votes = postTotalVotes;

        // 从document找到body的类
        const bodyClassList = document.body.classList;
        if (bodyClassList.contains('archive-page')) {
            pagesManager.updateView();
        }

        if (bodyClassList.contains('index-page')) {
            updatePostVotes(postId);
            initIndexPage();
        }

        if (bodyClassList.contains('post-page')) {
            updatePostVotes(postId);
        }

        saveVotes();

    }

    function updatePostVotes(postId) {
        const post = posts.find(p => p.id === postId);
        if (!post) return;



        savePosts();

        // --- 动态更新UI，而不是刷新整个页面 ---
        // 找到页面上所有与这篇文章相关的状态栏
        const statusbars = document.querySelectorAll(`.post-statusbar[data-post-id="${postId}"]`);
        statusbars.forEach(bar => {
            const voteCountSpan = bar.querySelector('.vote-count');
            const upBtn = bar.querySelector('.up-vote');
            const downBtn = bar.querySelector('.down-vote');

            if (voteCountSpan) voteCountSpan.textContent = post.votes;

            const userVoteObj = votes.find(v => v.userId === (currentUser && currentUser.id) && v.postId === postId);
            const userVote = userVoteObj ? userVoteObj.value : 0;
            upBtn.classList.toggle('voted', userVote === 1);
            downBtn.classList.toggle('voted', userVote === -1);
        });

        const toolbar = document.querySelector('.footer-toolbar');
        if (toolbar) {
            const voteCountSpan = toolbar.querySelector('.vote-count');
            const upBtn = toolbar.querySelector('.up-vote');
            const downBtn = toolbar.querySelector('.down-vote');

            if (voteCountSpan) voteCountSpan.textContent = post.votes;

            const userVoteObj = votes.find(v => v.userId === (currentUser && currentUser.id) && v.postId === postId);
            const userVote = userVoteObj ? userVoteObj.value : 0;
            upBtn.classList.toggle('voted', userVote === 1);
            downBtn.classList.toggle('voted', userVote === -1);
        }

    }

    /**
     * 动态渲染粘性底部工具栏
     * @param {string} pageType - 'post' 或 'workspace'
     * @param {object} [data] - 额外数据，比如 post 对象
     * @param {string} [mode] - 工作区模式，'edit','default','managePostsDefault', 'managePostsMultiSelect','hidden'
     */
    function renderFooterToolbar(pageType, data = {}, mode = 'default') {
        const toolbar = document.querySelector('.footer-toolbar');
        if (!toolbar) return;

        if (mode === 'hidden') {
            toolbar.style.display = 'none';
            return;
        } else {
            toolbar.style.display = 'flex';
        }
        let toolbarHtml = '';

        const backToTopHtml = `<button id="back-to-top" title="返回顶部" class="btn toolbar-btn fade-in hidden"><span class="iconfont icon-back-to-top"></span></button>`;

        // --- 根据页面类型生成不同的按钮 ---
        if (pageType === 'post' && data.post) {
            const post = data.post;
            // 文章详情页的工具栏
            const userVote = (votes.find(v => v.userId === currentUser?.id && v.postId === post.id) || {}).value;
            toolbarHtml = `
            <div id="publish-status" style="display:none"></div>
            <button class="btn toolbar-btn vote-btn up-vote ${userVote === 1 ? 'voted' : ''}" data-post-id="${post.id}" data-value="1"><span class="iconfont">▲</span> <span class="btn-text"> 赞</span></button>
            <button class="btn toolbar-btn vote-btn down-vote ${userVote === -1 ? 'voted' : ''}" data-post-id="${post.id}" data-value="-1"><span class="iconfont">▼</span><span class="btn-text"> 踩</span></button>
            
            <div class="toolbar-comment-indicator" id="toolbar-comment-btn">
                <span class="iconfont icon-comment"></span><span class="btn-text"> 写下你的评论...</span>
            </div>
            ${currentUser?.role === 'editor' ? `
            <div class="toolbar-editor-actions">
                <button class="btn toolbar-btn feature-btn" data-id="${post.id}">
                    ${post.isFeatured ? '<span class="iconfont icon-star"></span>' : '<span class="iconfont icon-star1"></span>'}
                    <span class="btn-text"> 精选</span>
                </button>                
                <a href="workspace.html?editId=${post.id}" class="btn toolbar-btn">
                    <span class="iconfont icon-edit"></span>
                    <span class="btn-text"> 编辑</span>
                </a>
                <button class="btn toolbar-btn delete-btn" data-id="${post.id}">
                    <span class="iconfont icon-trashcan"></span>
                    <span class="btn-text"> 删除</span>
                </button>
            </div>
            ` : ''}
            
        `;

        } else if (pageType === 'workspace' && mode === 'edit') {
            // 工作区（编辑模式）的工具栏
            toolbarHtml = `
            <a href="workspace.html" class="btn toolbar-btn exit-edit-btn">
                <span class="iconfont icon-exit"></span><span class="btn-text">退出编辑</span>
            </a>
            <div id="publish-status"></div>
            <div class="edit-actions">
            <button id="toggle-preview-btn" type="button" class="btn toolbar-btn">
                <span class="iconfont icon-view"></span><span class="btn-text"> 预览</span>
            </button>
            <button id="submit-form-btn" type="button" class="btn toolbar-btn primary">
                <span class="iconfont 
icon-icon_exercise_submit"></span><span class="btn-text"> ${data.editId !== 'new' ? '更新' : '发布'}</span>
            </button>
            </div>
            
        `;
        } else if (pageType === 'workspace' && mode === 'managePostsDefault') {
            // 工作区（管理文章模式）的工具栏
            /*             toolbarHtml = `
                        <a href="workspace.html?editId=new" class="toolbar-btn primary"><span class="iconfont icon-edit"></span>&nbsp;写新文章</a>
                        <button id="start-multiselect-btn" class="toolbar-btn">多选</button>
                    `; */

        } else if (pageType === 'workspace' && mode === 'managePostsMultiSelect') {
            /* toolbarHtml = `
            <button id="cancel-multiselect-btn" class="toolbar-btn">取消</button>
            <button class="toolbar-btn" id="multiselect-select-all-btn">全选</button>
            <span class="selection-count"><span class="number-selected"></span>&nbsp;项已选择</span>
            <div class="multiselect-actions">
                <button class="toolbar-btn" id="multiselect-delete-btn">删除</button>
                <button class="toolbar-btn" id="multiselect-feature-btn">精选</button>
                <button class="toolbar-btn" id="multiselect-unfeature-btn">取消精选</button>
                <button class="toolbar-btn" id="multiselect-move-btn">移动分类</button>
                <button class="toolbar-btn" id="multiselect-add-tag-btn">添加标签</button>
                <button class="toolbar-btn" id="multiselect-remove-tag-btn">移除标签</button>
                <button class="toolbar-btn primary" id="multiselect-apply-btn">应用</botton>
                <!-- 可以添加更多批量操作 -->
            </div>
        `; */
        }

        toolbarHtml = backToTopHtml + toolbarHtml;
        // --- 填充工具栏并绑定通用事件 ---
        if (toolbarHtml) {
            toolbar.innerHTML = `<div class="toolbar-content">${toolbarHtml}</div>`;
            /* toolbar.style.display = 'flex'; */ // 确保可见

            // 绑定详情页工具栏的特定事件
            if (pageType === 'post') {
                bindPostToolbarEvents(data.post.id);
            }
            // 工作区工具栏的事件在 initWorkspacePage 中绑定，因为它们与表单紧密相关

        } else {
            toolbar.style.display = 'none'; // 如果没有内容，则隐藏
        }
    }

    /**
 * 为文章详情页的工具栏绑定事件
 * @param {number} postId 
 */
    function bindPostToolbarEvents(postId) {
        const toolbar = document.querySelector('.footer-toolbar');
        if (!toolbar) return;

        // 评论按钮点击事件
        const commentBtn = document.getElementById('toolbar-comment-btn');
        const commentFormTextarea = document.querySelector('#comment-form textarea');
        if (commentBtn && commentFormTextarea) {
            commentBtn.addEventListener('click', () => {
                // 平滑滚动到评论表单并聚焦
                commentFormTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                commentFormTextarea.focus();
            });
        }


        toolbar.addEventListener('click', function (event) {
            // 投票按钮事件
            if (event.target.classList.contains('up-vote') || event.target.classList.contains('down-vote')) {
                const value = parseInt(event.target.dataset.value);
                handleVote(postId, value);
            }
            // 删除按钮
            if (event.target.closest('.delete-btn')) {
                if (confirm('你确定要删除这篇文章吗？这个操作不可撤销。')) {
                    posts = posts.filter(post => post.id !== postId);
                    savePosts();
                    location.href = 'index.html';
                }
            }
            const featureBtn = event.target.closest('.feature-btn');
            // 精选按钮事件 
            if (featureBtn) {
                const post = posts.find(p => p.id === postId);
                if (post) {
                    post.isFeatured = !post.isFeatured;
                    post.featuredDate = post.isFeatured ? Date.now() : null;
                    // 更改按钮文字
                    const iconSpan = featureBtn.querySelector('span.iconfont');
                    if (iconSpan) {
                        iconSpan.className = post.isFeatured ? 'iconfont icon-star' : 'iconfont icon-star1';
                    }
                    savePosts();
                    renderFeaturedPosts(getHomepageFeatures(posts));
                }
            }
        });


    }

    /**
 * 解析搜索框的输入，分离普通文本和结构化查询
 * @param {string} input - 搜索框的完整输入字符串
 * @returns {object} - 一个包含 textSearch 和 structured 数组的查询对象
 */
    function parseSearchInput(input) {

        // 正则表达式，用来匹配 "key:operator:value" 或 "key:value" 格式
        // 例如： votes:>=10, tag:javascript, category:技术分享
        const structuredRegex = /(\w+):([<>=!]*)([^ ]+)/g;
        let structured = [];
        // 1. 先提取所有结构化查询
        let textOnly = input.replace(structuredRegex, (match, field, operator, value) => {
            // 如果操作符为空，默认为等于
            if (!operator) operator = '=';
            structured.push({
                id: 0,
                field: field.toLowerCase(),
                operator: operator,
                value: value
            });
            return ''; // 从原始字符串中移除这部分
        }).trim();

        // 2. 剩下的就是普通文本搜索=

        return { textSearch: textOnly, structured: structured };
    }

    /**
     * 解析用户输入的日期查询字符串
     * @param {string} dateString - 用户输入的日期，格式可以是 YYYY, YYYY/MM, YYYY/MM/DD
     * @returns {{start: number, end: number}|null} - 包含起始和结束时间戳的对象，或在无效时返回null
     */
    function parseDateQuery(dateString) {
        const parts = dateString.split(/[\/-]/).map(p => parseInt(p, 10));

        const year = parts[0];
        // 月份和日期从1开始，但在Date对象中月份是从0开始的，所以要-1
        const month = parts.length > 1 ? parts[1] - 1 : 0;
        const day = parts.length > 2 ? parts[2] : 1;

        if (isNaN(year)) return null; // 无效年份

        // --- 根据输入精度，计算时间范围 ---
        let startDate, endDate;

        if (parts.length === 1) { // 只输入了年份，如 "2025"
            startDate = new Date(year, 0, 1); // 2025年1月1日 00:00:00
            endDate = new Date(year + 1, 0, 1); // 2026年1月1日 00:00:00
        } else if (parts.length === 2) { // 输入了年份和月份，如 "2025/6"
            startDate = new Date(year, month, 1); // 2025年6月1日 00:00:00
            // 月份+1，日期设为0，可以巧妙地得到当月的最后一天
            endDate = new Date(year, month + 1, 1); // 2025年7月1日 00:00:00
        } else { // 输入了完整的年月日，如 "2025/6/8"
            startDate = new Date(year, month, day); // 2025年6月8日 00:00:00
            endDate = new Date(year, month, day + 1); // 2025年6月9日 00:00:00
        }

        // 返回时间戳范围 [start, end) 左闭右开区间
        return {
            start: startDate.getTime(),
            end: endDate.getTime()
        };
    }


    /**
     * 创建一个可筛选、排序、搜索的列表实例
     * @param {object} config - 配置对象
     * @param {HTMLElement} config.tabsContainer - 分类标签页容器
     * @param {HTMLElement} config.postsContainer - 文章列表容器
     * @param {HTMLElement} config.searchInput - 搜索输入框
     * @param {HTMLElement} config.sortSelect - 排序标准下拉菜单
     * @param {HTMLElement} config.orderSelect - 排序顺序下拉菜单
     * @param {HTMLElement} config.filterStatusContainer - 激活的标签筛选状态容器
     * @param {string} config.initialSortBy - 初始排序标准
     * @param {string} config.initialOrder - 初始排序顺序
     * @param {function} config.renderFunction - 用于渲染最终数据的函数
     * @return {object} - 一个包含 updateView, getFilters, getPosts 方法的对象
     * updateView: updateView,
        getFilters: () => filters, // 允许外部获取当前筛选状态
        getPosts: () => postsToRender // 允许外部获取当前渲染的文章列表
     */
function createFilterableList(config) {
    const {
        tabsContainer, postsContainer, searchInput,
        sortSelect, orderSelect, filterStatusContainer, activeFiltersContainer,
        initialSortBy, initialOrder, renderFunction,
    } = config;

    const pillsContainer = config.pillsContainer;
    const textSearchInput = config.searchInput;
    const addFilterBtn = config.addFilterBtn;
    let postsToRender = [];
    if (sortSelect) wrapSelect(sortSelect);
    if (orderSelect) wrapSelect(orderSelect);

    // --- 动态生成分类标签页 ---
    if (tabsContainer) {
        // 清空已有的标签页
        while (tabsContainer.children.length > 1) {
            tabsContainer.removeChild(tabsContainer.lastChild);
        }
        categories.forEach(cat => {
            if (cat.id === 1) return;
            const tab = document.createElement('button');
            tab.className = 'workspace-tab'; // 复用样式
            tab.dataset.categoryId = cat.id;
            tab.textContent = cat.name;
            tabsContainer.appendChild(tab);
        });
    }

    // --- 核心状态管理 ---
    const urlParams = new URLSearchParams(window.location.search);
    const initialTag = urlParams.get('tag');
    const initialCategory = parseInt(urlParams.get('category'));

    /*         let currentFilters = { //粗过滤器
                tags: initialTag ? [initialTag] : [],
                sortBy: initialSortBy,
                order: initialOrder
            }; */

    /*                 let textQuery = {
                        textSearch: '',
                        structured: []
                    }; // <--- 新的查询对象
            
                    let pillQuery = {
                        textSearch: '',
                        structured: []
                    } */
    let filters = {
        category: 'all',  // 'all' 或 分类ID
        search: '',       // 普通文本搜索词
        textStructured: [], // 根据文本的结构化搜索条件
        structured: [],    // 结构化条件，每个元素是 { id, field, operator, value }
        sortBy: initialSortBy,
        order: initialOrder
        // 标签筛选也将被转换为这种结构，如 { field: 'tag', value: 'JavaScript' }
    };


    // --- 统一的视图更新函数 ---
    function updateView() {
        const query = parseSearchInput(searchInput.value);
        filters.search = query.textSearch;
        filters.textStructured = query.structured;
        renderFilterPills(filters.structured);
        postsToRender = filterPosts(filters);


        if (postsToRender.length === 0) {
            postsContainer.innerHTML = '<h3>没有找到匹配的文章。</h3>';
            return;
        }
        // --- 应用分类筛选 ---
        if (filters.category !== 'all') {
            postsToRender = postsToRender.filter(p => p.categoryId === filters.category);
        }

        // --- 应用排序  ---
        postsToRender.sort((a, b) => {
            switch (filters.sortBy) {
                case 'date':
                    return a.id - b.id; // 用id模拟时间升序
                case 'votes':
                    return (a.votes || 0) - (b.votes || 0);
                case 'views':
                    return (a.views || 0) - (b.views || 0);
                case 'comments':
                    const commentsA = a.comments ? a.comments.length : 0;
                    const commentsB = b.comments ? b.comments.length : 0;
                    return commentsA - commentsB;
                default: // 默认按时间升序
                    return a.id - b.id;
            }
        });

        if (filters.order === 'desc') {
            postsToRender.reverse();
        }

        //updateFilterStatusUI();
        renderFunction(postsToRender, postsContainer, filters.search);
    }

    function getChineseField(field) {
        switch (field) {
            case 'category':
                return '分类';
            case 'tag':
                return '标签';
            case 'votes':
                return '投票数';
            case 'views':
                return '浏览数';
            case 'comments':
                return '评论数';
            case 'isFeatured':
                return '精选';
            case 'date':
                return '发布日期';
            case 'lastUpdated':
                return '更新日期';
            case 'title':
                return '标题';
            case 'content':
                return '内容';
            case 'author':
                return '作者';
            default:
                return field;
        }
    }

    function renderFilterPills(structuredConditions) {
        const pillsContainer = config.pillsContainer;
        if (!pillsContainer) return;

        pillsContainer.innerHTML = '';
        structuredConditions.forEach(condition => {
            const pill = document.createElement('div');
            pill.className = `filter-pill filter-pill-${condition.field} active-filter-tag`;
            pill.innerHTML = `
            <span class="pill-field">${getChineseField(condition.field)}</span>
            <span class="pill-operator">&nbsp;${condition.operator}&nbsp;</span>
            <span class="pill-value">${condition.value}</span>
            <button class="remove-pill-btn remove-filter-btn" data-condition-id="${condition.id}">×</button>
        `;
            pillsContainer.appendChild(pill);
        });
        // 控制整个状态容器的显隐
        const hasActiveFilters = filters.structured.length > 0;

        filterStatusContainer.classList.toggle('hidden', structuredConditions.length === 0);
    }

    function filterPosts(filters) {
        let results = [...posts];

        //  分类筛选
        if (filters.category !== 'all') {
            results = results.filter(p => p.categoryId === filters.category);
        }

        conbineStructed = [...filters.textStructured, ...filters.structured];
        // 过滤结构化条件
        conbineStructed.forEach(cond => {
            results = results.filter(post => checkCondition(post, cond));
        });


        // 过滤文本
        if (filters.search) {
            const keywords = filters.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
            results = results.filter(post => {
                const searchableText = (post.title + ' ' + post.content).toLowerCase();
                return keywords.every(kw => searchableText.includes(kw));
            });
        }
        return results;
    }

    // 辅助函数：检查单篇文章是否满足单个条件
    function checkCondition(post, condition) {
        const { field, operator, value } = condition;
        let postValue;
        // 特别处理时间
        if (field === 'date' || field === 'lastUpdated') {
            const postTimestamp = (field === 'date' ? new Date(post.date) : new Date(post.lastUpdated)) || new Date(post.date);
            console.log(postTimestamp);
            // 1. 如果操作符是 `=` (或空)
            if (operator === '=' || operator === '') {
                const dateRange = parseDateQuery(value);
                console.log(dateRange);
                if (!dateRange) return true; // 无效日期输入，不匹配
                // 检查文章时间戳是否落在 [start, end) 区间内
                
                return postTimestamp >= dateRange.start && postTimestamp < dateRange.end;
            }
            if (operator === '!=') {
                const dateRange = parseDateQuery(value);
                if (!dateRange) return true; // 无效日期输入，匹配所有
                // 检查文章时间戳是否不落在 [start, end) 区间内
                return postTimestamp < dateRange.start || postTimestamp >= dateRange.end;
            }

            // 2. 如果操作符是 `>`, `<`, `>=`, `<=`
            // 我们只取用户输入日期的“起点”作为比较基准
            const parts = value.split(/[\/-]/).map(p => parseInt(p, 10));
            if (isNaN(parts[0])) return false;
            // 构造一个精确到天、月或年的起始时间戳
            const compareTimestamp = new Date(parts[0], parts[1] ? parts[1] - 1 : 0, parts[2] || 1).getTime();

            switch (operator) {
                case '>': return postTimestamp > compareTimestamp;
                case '>=': return postTimestamp >= compareTimestamp;
                case '<': return postTimestamp < compareTimestamp;
                case '<=': return postTimestamp <= compareTimestamp;
                default: return true; // 不支持其他操作符
            }
        }

        // 获取要比较的文章属性值
        switch (field) {
            case 'category':
                const category = categories.find(c => c.name.toLowerCase() === value.toLowerCase());
                postValue = category ? category.id : -1;
                return post.categoryId === postValue;
            case 'tag':
                return (post.tags || []).map(t => t.toLowerCase()).includes(value.toLowerCase());
            case 'votes':
                postValue = post.votes || 0;
                break;
            case 'views':
                postValue = post.views || 0;
                break;
            case 'comments':
                postValue = (post.comments || []).length;
                break;
            case 'isFeatured':
                postValue = post.isFeatured ? 1 : 0;
                break;
            case 'title':
                postValue = post.title.toLowerCase();
                break;
            case 'content':
                postValue = post.content.toLowerCase();
                break;
            case 'author':
                postValue = post.author.username.toLowerCase();
                break;
            default:
                return true; // 未知的字段，不进行筛选
        }

        if (isNaN(postValue)) {
            // 非数字值，按字符串比较
            const stringValue = postValue.toString().toLowerCase();
            return postValue.toString().toLowerCase().includes(value.toLowerCase());
        }

        const numericValue = parseInt(value, 10);
        // 根据操作符进行比较
        switch (operator) {
            case '>': return postValue > numericValue;
            case '>=': return postValue >= numericValue;
            case '<': return postValue < numericValue;
            case '<=': return postValue <= numericValue;
            case '=':
            case '': return postValue === numericValue;
            case '!=': return postValue !== numericValue;
            default: return true;
        }
    }

    // --- 4. 事件监听 ---
    // a. 文本搜索框
    textSearchInput.addEventListener('keyup', () => {
        filters.search = textSearchInput.value.trim().toLowerCase();
        updateView();
    });

    // b. 移除胶囊
    pillsContainer.addEventListener('click', (e) => {
        rmBtn = e.target.closest('.remove-pill-btn');
        if (rmBtn) {
            const conditionId = parseInt(rmBtn.dataset.conditionId);
            filters.structured = filters.structured.filter(c => c.id !== conditionId);
            updateView();
        }
    });

    // c. 点击“+”按钮，显示UI构建器
    addFilterBtn.addEventListener('click', () => {
        showAdvancedSearchBuilder(addFilterBtn.parentElement, (data) => { // {input, field, operator, value}
            const { input, field, operator, value } = data;
            let query = parseSearchInput(input);

            let i = 0;
            query.structured.forEach(cond => {
                cond.id = filters.structured.length + i++;
            });

            filters.search = query.textSearch;
            filters.structured = [...filters.structured, ...query.structured];

            if (value) {
                const id = filters.structured.length + query.structured.length + 1;
                const newCondition = { id: id, field: field, operator: operator, value: value };
                filters.structured.push(newCondition);
            }

            // 检查结构化数据中重合的部分并删除
            const deduped = [];
            filters.structured.forEach(c => {
                const dupe = deduped.find(dc => dc.field === c.field && dc.operator === c.operator && dc.value === c.value);
                if (!dupe) deduped.push(c);
            });
            filters.structured = deduped;
            updateView();
        });
    });


    function showAdvancedSearchBuilder(anchorElement, onAddCallback) {
        // 如果已存在，则不重复创建

        if (document.getElementById('advanced-search-builder')) return;

        const builderHtml = `
    <div id="advanced-search-builder" class="advanced-search-builder">
        <input type="text" id="adv-search-input" placeholder="批量添加搜索字段...">
        <div class="adv-search-group">
            <select id="adv-field">
                <option value="votes">投票数</option>
                <option value="views">浏览数</option>
                <option value="comments">评论数</option>
                <option value="tag">标签</option>
                <option value="category">分类</option>
                <option value="isFeatured">精选状态（1或0）</option>
                <option value="date">发布日期</option>
                <option value="lastUpdated">更新日期</option>
                <option value="title">仅标题</option>
                <option value="content">仅内容</option>
                <option value="author">作者</option>
            </select>
            <select id="adv-operator">
                <option value=">">></option>
                <option value="<"><</option>
                <option value=">=">≥</option>
                <option value="<=">≤</option>
                <option value="=">=</option>
                <option value="!=">≠</option>
            </select>
            <input type="text" id="adv-value" placeholder="值...">
        </div>
        <div class="adv-search-actions">
            <button id="adv-add-btn">添加</button>
            <button id="adv-cancel-btn" type="button">取消</button>
        </div>
    </div>
`;

        anchorElement.insertAdjacentHTML('beforeend', builderHtml);
        const builder = document.getElementById('advanced-search-builder');
        anchorElement.style.position = 'relative'; // 确保父容器是定位锚点

        const fieldSelect = builder.querySelector('#adv-field');
        const operatorSelect = builder.querySelector('#adv-operator');
        if (fieldSelect) wrapSelect(fieldSelect);
        if (operatorSelect) wrapSelect(operatorSelect);

        // --- 绑定构建器的事件 ---
        document.getElementById('adv-add-btn').addEventListener('click', () => {
            const input = document.getElementById('adv-search-input').value;
            const field = document.getElementById('adv-field').value;
            const operator = document.getElementById('adv-operator').value;
            const value = document.getElementById('adv-value').value.trim();
            if (input || value) {
                // 将构建的条件追加到搜索框
                onAddCallback({ input, field, operator, value });

            }
            builder.remove(); // 添加后移除自身
        });

        document.getElementById('adv-cancel-btn').addEventListener('click', () => {
            builder.remove(); // 取消也移除自身
        });
    }



    // --- 绑定事件监听器 ---
    // (这里的逻辑也和 archive 完全一样，只是操作的是传入的元素)
    tabsContainer.addEventListener('click', (event) => {
        if (event.target.matches('.workspace-tab')) {

            filters.category = event.target.dataset.categoryId === 'all' ? 'all' : parseInt(event.target.dataset.categoryId);
            // 重置排序选择框
            sortSelect.value = 'date';
            filters.sortBy = 'date';
            // 重置排序顺序选择框
            orderSelect.value = 'asc';
            filters.order = 'asc';

            // 移除所有标签和面板的 active 状态
            tabsContainer.querySelectorAll('.workspace-tab').forEach(tab => tab.classList.remove('active'));

            // 激活被点击的标签和对应的内容面板
            event.target.classList.add('active');


            // 更新视图
            updateView();
        }
    });


    // 监听标签与分区点击 (事件委托到文章列表容器)
    postsContainer.addEventListener('click', (event) => {
        const targetLink = event.target.closest('.post-category-link');
        if (targetLink) {
            // a. 阻止链接的默认跳转行为
            event.preventDefault();

            // b. 从链接中解析出 categoryId
            const url = new URL(targetLink.href);
            const categoryId = parseInt(url.searchParams.get('category'));

            if (categoryId) {
                // c. 找到对应的分类标签页按钮
                const targetTab = tabsContainer.querySelector(`[data-category-id="${categoryId}"]`);
                if (targetTab) {
                    // d. 手动触发该标签页的点击事件
                    targetTab.click();

                    // e. (可选) 平滑滚动到页面顶部，让用户感知到筛选已生效
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                }
            }
        }



        if (event.target.matches('.post-tag')) {
            event.preventDefault();
            const tagName = event.target.textContent;

            const tagExists = filters.structured.some(c => c.field === 'tag' && c.value === tagName);

            if (!tagExists) {
                filters.structured.push({
                    id: Date.now(),
                    field: 'tag',
                    operator: '=',
                    value: tagName
                });
                updateView();
            }

            updateView();
        }
    });

    // 监听搜索框输入与变化
    searchInput.addEventListener('input', () => {
        filters.search = searchInput.value.trim().toLowerCase();
        updateView();
    });
    searchInput.addEventListener('search', () => {
        filters.search = searchInput.value.trim().toLowerCase();
        updateView();
    });

    // 监听排序选择框的变化
    sortSelect.addEventListener('change', () => {
        filters.sortBy = sortSelect.value;
        updateView(); // 重新排序并渲染
    });

    // 监听分类选择框的变化
    orderSelect.addEventListener('change', () => {
        filters.order = orderSelect.value;
        updateView(); // 重新排序并渲染
    });

    // 监听搜索框输入
    searchInput.addEventListener('keyup', () => {
        filters.search = searchInput.value.trim().toLowerCase();
        updateView();
    });


    if (initialTag) {
        filters.structured.push({ id: Date.now(), field: 'tag', operator: '=', value: initialTag });
    }
    // --- 初始加载 ---
    if (initialCategory) {
        const targetTab = tabsContainer.querySelector(`[data-category-id="${initialCategory}"]`);
        if (targetTab) {
            // d. 手动触发该标签页的点击事件
            targetTab.click();

            // e. (可选) 平滑滚动到页面顶部，让用户感知到筛选已生效
            window.scrollTo({ top: 300, behavior: 'smooth' });
        }
    }
    updateView();

    return {
        updateView: updateView,
        getFilters: () => filters, // 允许外部获取当前筛选状态
        getPosts: () => postsToRender // 允许外部获取当前渲染的文章列表
    };

}

    /**
 * 创建一个通用的内联编辑和添加列表的实例
 * @param {object} config
 * @param {HTMLElement} config.container - 列表的容器元素
 * @param {function} config.getItems - 一个返回当前所有项目数组的函数
 * @param {function} config.saveItems - 一个接收新项目数组并保存的函数
 * @param {function} [config.onUpdate] - 当数据更新时触发的回调函数（可选）
 * @param {string} [config.itemName] - 项目的单数名称 (e.g., '分区')
 */
    function createInlineEditor(config) {
        const { container, getItems, saveItems, onUpdate, itemName = '项目' } = config;
        if (!container) return;

        // --- 1. 渲染函数 ---
        function render() {
            container.innerHTML = '';
            const items = getItems();

            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'editable-item'; // 使用通用class
                div.dataset.itemId = item.id;

                let buttonsHtml = '';
                // 只有编辑者才能看到操作按钮
                if (currentUser && currentUser.role === 'editor') {
                    buttonsHtml = `
                    <button class="edit-item-btn icon-btn" title="编辑"><span class="iconfont icon-edit"></span></button>
                    ${item.id !== 1 ? `<button class="delete-item-btn icon-btn" title="删除"><span class="iconfont icon-trashcan"></span></button>` : ''}
                    `;
                }
                div.innerHTML = `
                <span class="item-name">${item.name}</span>
                <div class="item-actions">${buttonsHtml}</div>
                `;
                container.appendChild(div);
            });

            if (currentUser && currentUser.role === 'editor') {
                const adderItem = document.createElement('div');
                adderItem.className = 'editable-item adder-item';
                adderItem.innerHTML = `<button class="btn add-new-btn" title="添加新${itemName}">+</button>`;
                container.appendChild(adderItem);
            }
        }

        // --- 2. 事件委托监听器 ---
        container.addEventListener('click', (e) => {
            const target = e.target;

            // --- 编辑逻辑 ---
            if (target.closest('.edit-item-btn')) {
                const itemDiv = target.closest('.editable-item');
                const itemId = parseInt(itemDiv.dataset.itemId);
                const nameSpan = itemDiv.querySelector('.item-name');
                const oldName = nameSpan.textContent;

                const input = document.createElement('input');
                input.type = 'text';
                input.value = oldName;
                input.className = 'edit-inline-input';
                nameSpan.replaceWith(input);
                input.focus();
                input.select();

                function saveEdit() {
                    const newName = input.value.trim();
                    let items = getItems();
                    if (newName && newName !== oldName) {
                        const itemToUpdate = items.find(i => i.id === itemId);
                        if (itemToUpdate) itemToUpdate.name = newName;
                    }
                    saveItems(items);
                    render();
                    if (onUpdate) onUpdate();
                }
                input.addEventListener('blur', saveEdit);
                input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); if (ev.key === 'Escape') render(); });
            }

            // --- 删除逻辑 ---
            if (target.closest('.delete-item-btn')) {
                const itemDiv = target.closest('.editable-item');
                const itemId = parseInt(itemDiv.dataset.itemId);
                if (confirm(`确定要删除这个${itemName}吗？`)) {
                    let items = getItems().filter(i => i.id !== itemId);
                    saveItems(items);
                    render();
                    if (onUpdate) onUpdate();
                }
            }

            // --- 添加逻辑 ---
            if (target.closest('.add-new-btn')) {
                const adderBtn = target.closest('.add-new-btn');
                const adderItem = adderBtn.parentElement;
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'edit-inline-input';
                input.placeholder = `新${itemName}名...`;
                adderItem.innerHTML = '';
                adderItem.appendChild(input);
                input.focus();

                function saveNew() {
                    const newName = input.value.trim();
                    if (newName) {
                        let items = getItems();
                        items.push({ id: Date.now(), name: newName });
                        saveItems(items);
                    }
                    render();
                    if (onUpdate) onUpdate();
                }
                input.addEventListener('blur', saveNew);
                input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') input.blur(); if (ev.key === 'Escape') render(); });
            }
        });

        // --- 初始渲染 ---
        render();
    }

    function initTagEditorForRow(row, post) {
        createInlineEditor({
            container: row.querySelector('.tags-list'),
            // getItems 和 saveItems 直接操作当前 post 对象的 tags 数组
            getItems: () => post.tags.map((tag, index) => ({ id: index * 2, name: tag })),
            saveItems: (newTagItems) => {
                post.tags = newTagItems.map(item => item.name);
                savePosts();
            },
            itemName: '标签'
        });
    }




const heroSectionImagesUrl = [
    "../imgs/moon.jpg",
    "../imgs/moon1.jpg",
    "../imgs/moon2.gif"
];

    function initHeroSection() {
        const heroSection = document.getElementById('hero-section');
        const linksContainer = document.getElementById('hero-links-container');
        if (!heroSection || !linksContainer) return;

        // --- 存储默认背景图 ---
        const defaultBgImage = getComputedStyle(heroSection).backgroundImage;
        let currentTargetUrl = '#'; // 默认整个英雄区不跳转

        // --- 动态生成链接卡片 ---

        /*         // 从 categories 中筛选出要显示的，比如前3个非“未分类”的
                const categoriesToShow = categories.filter(cat => cat.id !== 1).slice(0, 3); */
        const categoriesToShow = categories.filter(cat => cat.id !== 1);

        // 根据要显示的分类数量，动态设置 grid-template-rows
        /*         linksContainer.style.gridTemplateRows = `repeat(${categoriesToShow.length}, 1fr)`; */

        linksContainer.innerHTML = ''; // 清空

        categoriesToShow.forEach(cat => {
            if (cat.id === 1) return; // 不显示"未分类"

            const card = document.createElement('a');
            card.className = 'hero-link-card';
            card.href = `archive.html?category=${cat.id}`;
            /*             card.style.backgroundImage = `url(${cat.heroImage})`; */
            card.innerHTML = `<span>${cat.name}</span>`;

            // --- 核心交互：绑定鼠标悬浮事件 ---
            card.addEventListener('mouseenter', () => {
                // 切换英雄区大背景图
/*                 heroSection.style.backgroundImage = `
                linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)),
                url(${cat.heroImage})
            `; */
                // 更新整个英雄区的目标链接
                currentTargetUrl = card.href;
            });

            linksContainer.appendChild(card);
        });

        // --- 鼠标移出链接区域时，恢复默认背景 ---
/*         linksContainer.addEventListener('mouseleave', () => {
            heroSection.style.backgroundImage = defaultBgImage;
            currentTargetUrl = '#';
        }); */

        // --- 让整个英雄区可点击 ---
        heroSection.addEventListener('click', (e) => {
            // 如果点击的是链接卡片本身，让其默认行为生效
            if (e.target.closest('.hero-link-card')) {
                return;
            }
            // 否则，如果鼠标在卡片上悬浮过，就跳转到对应的URL
            if (currentTargetUrl/*  && currentTargetUrl !== '#' */) {
                window.location.href = currentTargetUrl;
            }
        });

        // 处理轮播逻辑
        const heroImages = heroSectionImagesUrl.map(url => {
            const img = new Image();
            img.src = url;
            return img;
        });
        let currentImageIndex = 0;
        const heroImageInterval = setInterval(() => {
            currentImageIndex = (currentImageIndex + 1) % heroImages.length;
            heroSection.style.backgroundImage = `url(${heroImages[currentImageIndex].src})`;
        }, 5000);

    }



    function initIndexPage() {
        const postsContainer = document.querySelector('.post-list-container');
        const homepageFeatures = getHomepageFeatures(posts);
        renderFeaturedPosts(homepageFeatures);
        renderPosts(posts, postsContainer, '', { limit: 2, order: 'desc' });
        initHeroSection();
    }

    function initPostPage() {
        const postId = parseInt(new URLSearchParams(window.location.search).get('id'));
        const post = posts.find(p => p.id === postId);

        if (post) {
            renderPostDetail(post); // 传递 post 对象
            initComments(post.id);

            // --- 在这里调用工具栏渲染函数 ---
            renderFooterToolbar('post', { post: post });
        } else {
            // 处理文章未找到的情况
        }
    }
    function initComments(postId) {

        const MAX_REPLY_INDENT_LEVEL = 5; // 定义一个最大缩进层级

        const post = posts.find(p => p.id === postId);
        if (!post) return;
        if (!post.comments) post.comments = [];

        const listContainer = document.getElementById('comments-list');
        const form = document.getElementById('comment-form');

        function renderComments() {
            listContainer.innerHTML = '';

            // 获取所有评论并按“线索”排序
            // 我们需要一个函数来保证回复能紧跟在它们的父评论后面
            const sortedComments = sortCommentsForThreadedView(post.comments);


            // 2. 遍历这个排好序的扁平数组，并渲染
            sortedComments.forEach(comment => {
                // 我们需要知道每个评论的真实层级
                const level = getCommentLevel(comment.commentId, post.comments);


                // 创建并添加元素
                const commentElement = createCommentElement(comment, post, level > 0, level);
                listContainer.appendChild(commentElement);
            });
        }

        /**
 * 辅助函数：将评论数组排序成线索化的、扁平的数组
 * @param {Array} comments - 原始评论数组
 * @returns {Array} - 排序后的扁平评论数组
 */
        function sortCommentsForThreadedView(comments) {
            const commentMap = new Map(comments.map(c => [c.commentId, { ...c, children: [] }]));
            const topLevelComments = [];

            // 建立父子关系
            for (const comment of commentMap.values()) {
                if (comment.parentId && commentMap.has(comment.parentId)) {
                    commentMap.get(comment.parentId).children.push(comment);
                } else {
                    topLevelComments.push(comment);
                }
            }

            // 按票数对顶级评论排序
            topLevelComments.sort((a, b) => (b.votes || 0) - (a.votes || 0));

            // 递归地将子评论展平
            const flatSorted = [];
            function flatten(comment) {
                flatSorted.push(comment);
                // 回复按时间排序
                comment.children.sort((a, b) => a.date - b.date).forEach(flatten);
            }
            topLevelComments.forEach(flatten);

            return flatSorted;
        }

        /**
 * 辅助函数：计算一个评论的嵌套层级
 * @param {number} commentId 
 * @param {Array} allComments 
 * @returns {number}
 */
        function getCommentLevel(commentId, allComments) {
            let level = 0;
            let currentId = commentId;
            const commentMap = new Map(allComments.map(c => [c.commentId, c]));

            while (currentId) {
                const currentComment = commentMap.get(currentId);
                if (currentComment && currentComment.parentId) {
                    level++;
                    currentId = currentComment.parentId;
                } else {
                    break;
                }
            }
            return level;
        }

        // --- 创建单个评论元素的函数 ---
        function createCommentElement(comment, post, isReply = false, level = 0) {
            const div = document.createElement('div');
            const indentLevel = isReply ? Math.min(level, MAX_REPLY_INDENT_LEVEL) : 0;


            div.className = 'comment-item' + (isReply ? ' is-reply' : '');
            div.dataset.commentId = comment.commentId;
            div.style.setProperty('--indent-level', indentLevel);


            const userVote = (commentVotes.find(v => v.userId === currentUser?.id && v.commentId === comment.commentId) || {}).value;
            const canDelete = currentUser && (currentUser.role === 'editor' || currentUser.id === comment.userId);

            // --- 新增：检查该评论是否有回复 ---
            const hasReplies = post.comments.some(c => c.parentId === comment.commentId);

            // --- 新增：折叠按钮的HTML，只在有回复的评论上显示 ---
            const collapseBtnHtml = (hasReplies)
                ? `<button class="collapse-thread-btn" title="折叠/展开回复">[–]</button>`
                : '';



            div.innerHTML = `
            <div class="comment-body">
                <div class="comment-header">
                    <div class="comment-avatar">${comment.username.charAt(0).toUpperCase()}</div>
                    <span class="comment-author">${comment.username}</span>
                    <span class="comment-date">· ${new Date(comment.date).toLocaleString()}</span>
                    ${collapseBtnHtml}
                </div>
                <div class="comment-text markdown-body">${marked.parse(comment.text)}</div>
                <div class="comment-actions">
                    <div class="comment-vote-control">
                        <button class="comment-vote-btn up ${userVote === 1 ? 'voted' : ''}" data-value="1">▲</button>
                        <span class="comment-vote-count">${comment.votes || 0}</span>
                        <button class="comment-vote-btn down ${userVote === -1 ? 'voted' : ''}" data-value="-1">▼</button>
                    </div>
                    <button class="reply-btn">回复</button>
                    ${canDelete ? `<button class="delete-comment-btn"><span class="iconfont icon-trashcan"></span></button>` : ''}
                </div>
                <!-- 回复表单将动态插入到这里 -->
            </div>
        `;
            return div;
        }

        listContainer.addEventListener('click', (e) => {
            const target = e.target;
            const commentItem = target.closest('.comment-item');
            if (!commentItem) return;
            const commentId = parseInt(commentItem.dataset.commentId);

            // a. 处理投票
            if (target.matches('.comment-vote-btn')) {
                const value = parseInt(target.dataset.value);
                handleCommentVote(commentId, value);
            }

            // b. 处理删除
            if (target.closest('.delete-comment-btn')) {
                if (confirm('确定要删除这条评论吗？')) {
                    // 递归收集所有要删除的 commentId
                    function collectAllDescendants(id, arr) {
                        arr.push(id);
                        post.comments
                            .filter(c => c.parentId === id)
                            .forEach(child => collectAllDescendants(child.commentId, arr));
                    }
                    const idsToDelete = [];
                    collectAllDescendants(commentId, idsToDelete);

                    // 过滤掉所有要删除的评论
                    post.comments = post.comments.filter(c => !idsToDelete.includes(c.commentId));
                    savePosts();
                    renderComments();

                }
            }

            // c. 处理回复
            if (target.matches('.reply-btn')) {
                // 先移除所有已存在的回复表单
                document.querySelectorAll('.reply-form-container').forEach(form => form.remove());

                const commentItem = target.closest('.comment-item');
                const authorToReply = commentItem.querySelector('.comment-author').textContent;

                // 创建并插入一个新的回复表单
                const replyFormContainer = document.createElement('div');
                replyFormContainer.className = 'reply-form-container comment-form-wrapper';
                replyFormContainer.innerHTML = `
            <form class="comment-reply-form">
                <h4>回复 ${authorToReply}</h4>
                <textarea placeholder="写下你的回复..." required></textarea>
                <div class="reply-form-actions">
                    <button type="submit">提交回复</button>
                    <button type="button" class="cancel-reply-btn">取消</button>
                </div>
            </form>
        `;
                commentItem.querySelector('.comment-actions').insertAdjacentElement('afterend', replyFormContainer);
                replyFormContainer.querySelector('textarea').focus();
            }

            // d. 处理取消回复
            if (target.matches('.cancel-reply-btn')) {
                target.closest('.reply-form-container').remove();
            }

            // --- 新增：处理评论折叠 ---
            if (e.target.matches('.collapse-thread-btn')) {
                const button = e.target;
                const parentCommentItem = button.closest('.comment-item');
                const parentId = parseInt(parentCommentItem.dataset.commentId);

                // 切换折叠状态
                const isCollapsed = parentCommentItem.classList.toggle('thread-collapsed');
                button.textContent = isCollapsed ? '[+]' : '[–]';

                // 找到所有子孙回复并切换它们的 .collapsed 类
                const allReplyElements = listContainer.querySelectorAll('.comment-item.is-reply');

                // 递归函数，用来切换一个评论及其所有子孙评论的折叠状态
                function toggleReplies(pId, shouldCollapse) {
                    allReplyElements.forEach(replyEl => {
                        const replyData = posts.find(p => p.id === postId)
                            .comments.find(c => c.commentId === parseInt(replyEl.dataset.commentId));

                        if (replyData && replyData.parentId === pId) {
                            replyEl.classList.toggle('collapsed', shouldCollapse);
                            // 递归处理子孙
                            toggleReplies(replyData.commentId, shouldCollapse);
                        }
                    });
                }

                toggleReplies(parentId, isCollapsed);
            }
        });

        // 处理回复表单的提交 (事件委托到整个评论列表)
        listContainer.addEventListener('submit', (e) => {
            if (e.target.matches('.comment-reply-form')) {
                e.preventDefault();
                if (!currentUser) { showToast('请先登录再回复！', 'error'); return; }

                const parentCommentItem = e.target.closest('.comment-item');
                const parentId = parseInt(parentCommentItem.dataset.commentId);
                const text = e.target.querySelector('textarea').value;

                const newReply = {
                    commentId: Date.now(),
                    userId: currentUser.id,
                    username: currentUser.username,
                    text,
                    date: Date.now(),
                    votes: 0,
                    parentId: parentId,
                    replies: []
                };

                post.comments.push(newReply);
                savePosts();
                renderComments(); // 重新渲染整个评论区以显示新回复
            }
        });


        // --- 新增：处理评论投票的核心逻辑 ---
        function handleCommentVote(commentId, value) {
            if (!currentUser) { showToast('请先登录才能投票！', 'error'); return; }

            const userId = currentUser.id;
            let vote = commentVotes.find(v => v.userId === userId && v.commentId === commentId);

            if (vote && vote.value === value) {
                commentVotes = commentVotes.filter(v => !(v.userId === userId && v.commentId === commentId));
            } else if (vote) {
                vote.value = value;
            } else {
                commentVotes.push({ userId, commentId, value });
            }
            saveCommentVotes();

            // 更新对应评论的总票数并刷新UI
            const targetPost = posts.find(p => p.comments.some(c => c.commentId === commentId));
            if (targetPost) {
                const targetComment = targetPost.comments.find(c => c.commentId === commentId);
                if (targetComment) {
                    targetComment.votes = commentVotes.filter(v => v.commentId === commentId).reduce((sum, v) => sum + v.value, 0);
                    savePosts();
                    renderComments(); // 重新渲染以更新票数和按钮状态
                }
            }
        }




        // 提交新评论
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentUser) {
                showToast('请先登录再发表评论！', 'error');
                return;
            }
            const text = document.getElementById('comment-text').value;

            const newComment = {
                commentId: Date.now(),
                userId: currentUser.id,
                username: currentUser.username,
                text: text,
                date: Date.now(),
                votes: 0,         // 评论的净票数
                parentId: null,     // 父评论ID，null表示是顶级评论
                replies: []
            };

            post.comments.push(newComment);
            savePosts(); // 保存整个 posts 数组
            renderComments(); // 重新渲染评论区
            form.reset();
            authorInput.disabled = false; // 提交后恢复
        });

        renderComments(); // 初始加载
    }

    /**
     * @return pagesManager - 一个 FilterableListManager 实例，管理文章列表的分页、排序、过滤功能
     */
    function initArchivePage() {
        const pagesManager = createFilterableList({
            tabsContainer: document.querySelector('.archive-tabs'),
            postsContainer: document.getElementById('archive-post-list'),
            searchInput: document.getElementById('search-input'),
            filterStatusContainer: document.querySelector('.filter-status-container'),
            activeFiltersContainer: document.querySelector('.active-filters-container'),
            sortSelect: document.getElementById('sort-by-select'),
            orderSelect: document.getElementById('order-by-select'),
            addFilterBtn: document.getElementById('add-filter-btn'),
            pillsContainer: document.getElementById('filter-pills-container'),
            initialSortBy: 'date',
            initialOrder: 'desc',
            renderFunction: (data, container, searchTerm) => {
                renderPosts(data, container, searchTerm);
            }
        });

        return pagesManager;
    }

    let activeEditorInstance = null; // 全局变量，持有当前激活的编辑器实例
    let activeEditorType = null;

    let lastScrollY = 0; // 全局变量，持有最后一次滚动的位置
    function initWorkspacePage() {

        const editorPane = document.querySelector('.editor-pane');
        const previewPane = document.querySelector('.preview-pane');
        const togglePreviewBtn = document.getElementById('toggle-preview-btn');
        const titleInput = document.getElementById('post-title');
        const previewTitle = document.getElementById('preview-title');
        const previewContent = document.getElementById('preview-content');
        const form = document.getElementById('new-post-form');
        const submitBtnToolbar = document.getElementById('submit-form-btn');
        const postImageInput = document.getElementById('post-image-url');
        const previewImage = document.querySelector('.preview-image');
        const tabsContainer = document.querySelector('.workspace-tabs');
        const contentPanes = document.querySelectorAll('.workspace-section');
        const editorSection = document.getElementById('post-editor-section');
        const toolbar = document.querySelector('.footer-toolbar');
        const gridContainer = document.getElementById('post-management-grid');
        const mainContainer = document.getElementById('post-management-section');


        // 标签页切换功能
        function initTabs() {
            if (!tabsContainer) return;

            tabsContainer.addEventListener('click', (event) => {
                if (event.target.matches('.workspace-tab')) {
                    const targetId = event.target.dataset.target;

                    // 移除所有标签和面板的 active 状态
                    tabsContainer.querySelectorAll('.workspace-tab').forEach(tab => tab.classList.remove('active'));
                    contentPanes.forEach(pane => pane.classList.remove('active'));

                    // 激活被点击的标签和对应的内容面板
                    event.target.classList.add('active');
                    document.getElementById(targetId).classList.add('active');

                    // 切换底部工具栏
                    if (targetId === 'category-manager-section') {
                        renderFooterToolbar('workspace', null, 'hidden');
                    } else if (targetId === 'post-management-section') {
                        toolbar.style.display = 'flex';
                    }

                }
            });
        }

        // 分区管理逻辑
        function initCategoryManager() {
            createInlineEditor({
                container: document.getElementById('category-manager').querySelector('.category-list-container'),
                getItems: () => categories,
                saveItems: (newCategories) => {
                    categories = newCategories;
                    saveCategories();
                }, onUpdate: () => {
                    // 当分区更新时，刷新文章管理表格
                    initPostManagementList();
                },
                itemName: '分区'
            });
        }




        // 文章管理卡片逻辑
        function initPostManagementList() {
            const mainContainer = document.getElementById('post-management-section');
            const postsContainer = document.getElementById('post-management-grid');
            const toolbar = document.querySelector('.footer-toolbar');

            let bulkEditState = {
                // 例如: { action: 'move', categoryId: 3 }
                // 或: { action: 'addTags', tags: ['新标签1', '新标签2'] }
                // 或: { action: 'removeTags', tags: ['要移除的标签'] }
                pendingAction: null
            };

            const config = {
                tabsContainer: document.querySelector('.management-tabs'),
                searchInput: document.getElementById('search-input'),
                sortSelect: document.getElementById('sort-by-select'),
                orderSelect: document.getElementById('order-by-select'),
                filterStatusContainer: document.querySelector('.filter-status-container'),
                activeFiltersContainer: document.querySelector('.active-filters-container'),
                initialSortBy: 'date',
                initialOrder: 'desc',
                addFilterBtn: document.getElementById('add-filter-btn'),
                pillsContainer: document.getElementById('filter-pills-container'),
                postsContainer: document.getElementById('post-management-grid'),

                renderFunction: (data, container) => {
                    container.innerHTML = '';
                    data.forEach(post => {

                        const cardWrapper = document.createElement('a');
                        cardWrapper.className = 'management-card';
                        cardWrapper.dataset.postId = post.id;
                        if (post.imageUrl) {
                            cardWrapper.style.backgroundImage = `url(${post.imageUrl})`;
                        } else {
                            cardWrapper.style.backgroundColor = '#555';
                        }

                        let contentToRender = '';

                        contentToRender = `<p>${stripAttributes(processContent(post))}</p>`;
                        // --- 准备分区和标签的HTML (复用之前的逻辑) ---
                        const categoryOptions = categories.map(cat =>
                            `<option value="${cat.id}" ${post.categoryId === cat.id ? 'selected' : ''}>${cat.name}</option>`
                        ).join('');

                        // --- 新的管理卡片HTML模板 ---
                        cardWrapper.innerHTML = `
                    <!-- 1. 文章显示区域 (复用blog-card) -->
                    <a href="post.html?id=${post.id}"style="background-image: url(${post.imageUrl});" class="blog-card" target="_blank">
                        <!-- ... 这里可以复用你之前 renderFeaturedPosts 的卡片内部HTML ... -->
                        <div class="card-content-wrapper">
                            <div class="post-head">
                                <h3>${post.title}</h3>
                                <div class="card-summary">${truncateHtml(contentToRender, 60)}</div>
                            </div>
                            ${renderCardStatusbar(post, true)}
                        </div>
                        <!-- 新增：多选模式下的覆盖层和勾选框 -->
                        <div class="selection-overlay">
                            <span class="selection-checkmark">✓</span>
                        </div>
                    </a>

                    <!-- 2. 操作控件区域 -->
                    <div class="management-controls">
                        <div class="control-group">
                            <label>分区:</label>
                            <select class="category-select" data-post-id="${post.id}">${categoryOptions}</select>
                        </div>
                        <div class="control-group tags-control">
                            <label>标签:</label>
                            <div class="tags-list"></div> <!-- 标签编辑器将由JS初始化 -->
                        </div>
                        <div class="control-group">
                            <label>精选:</label>
                            <label class="switch">
                                <input type="checkbox" class="feature-toggle " data-post-id="${post.id}" ${post.isFeatured ? 'checked' : ''}>
                                <span class="slider round"></span>
                            </label>
                        </div>
                        <div class="control-group actions-group">
                            <a href="workspace.html?editId=${post.id}" class="action-btn edit-btn"><span class="iconfont icon-edit"></span> 编辑</a> 
                            <button class="action-btn delete-btn" data-id="${post.id}"><span class="iconfont icon-trashcan"></span> 删除</button>
                        </div>
                    </div>
                `;
                        container.appendChild(cardWrapper);
                        const categorySelect = cardWrapper.querySelector('.category-select');
                        if (categorySelect) {
                            wrapSelect(categorySelect);
                        }

                        initTagEditorForRow(cardWrapper, post); // 初始化标签编辑器
                    });
                }
            };
            const listManager = createFilterableList(config);

            let isMultiSelectMode = false;
            let selectedPostIds = new Set(); // 使用 Set 来存储选中的ID，高效且防重

            toolbar.style.display = 'flex';
            renderManagementToolbar();

            function renderManagementToolbar() {
                let toolbarHtml = '';
                const toolbarContent = document.querySelector('.footer-toolbar .toolbar-content');
                if (!toolbarContent) return;

                const mode = isMultiSelectMode ? 'managePostsMultiSelect' : 'managePostsDefault';

                const backToTopHtml = `<button id="back-to-top" title="返回顶部" class="btn toolbar-btn fade-in hidden"><span class="iconfont icon-back-to-top"></span></button>`;
                // 如果是多选模式，更新计数
                if (isMultiSelectMode) {
                    let multiSelectActionsHtml = '';

                    // --- 根据是否有待处理的批量操作，显示不同UI ---
                    if (bulkEditState.pendingAction) {
                        // --- “应用”模式 ---
                        const action = bulkEditState.pendingAction;
                        let actionUI = '';

                        if (action.type === 'move') {
                            const categoryOptions = categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
                            actionUI = `
                            <span class="action-label">移动到:</span>
                                <div class="select-wrapper">
                                    <select id="bulk-category-select">${categoryOptions}</select>
                                </div>
                            `;
                        } else if (action.type === 'addTags' || action.type === 'removeTags') {
                            const actionText = action.type === 'addTags' ? '添加' : '移除';
                            actionUI = `
                                <span class="action-label">${actionText}标签:</span>
                                <input type="text" id="bulk-tags-input" placeholder="标签, 用逗号分隔">
                            `;
                        }

                        multiSelectActionsHtml = `
                            <div class="action-ui-wrapper">${actionUI}</div>
                            <button id="multiselect-apply-btn" class="btn toolbar-btn primary">应用</button>
                            <button id="multiselect-cancel-action-btn" class="btn toolbar-btn">返回</button>
                        `;
                    } else {
                        // --- “选择操作”模式 ---
                        multiSelectActionsHtml = `
                            <button class="btn toolbar-btn" data-action-type="move">移动分类</button>
                            <button class="btn toolbar-btn" data-action-type="addTags">添加标签</button>
                            <button class="btn toolbar-btn" data-action-type="removeTags">移除标签</button>
                            <button class="btn toolbar-btn" id="multiselect-feature-btn">精选</button>
                            <button class="btn toolbar-btn" id="multiselect-unfeature-btn">取消精选</button>
                            <button class="btn toolbar-btn" id="multiselect-delete-btn">删除</button>
                        `;
                    }


                    toolbarHtml = `
                        <div class="multiselect-actions">
                            ${multiSelectActionsHtml}
                        </div>
                        <div class="multiselect-primary-controls">
                            ${backToTopHtml}
                            <button id="multiselect-select-all-btn" class="btn toolbar-btn">全选</button>
                            <button id="multiselect-invert-selection-btn" class="btn toolbar-btn">反选</button>
                            <button id="cancel-multiselect-btn" class="btn toolbar-btn">取消<span class="selection-count"><span class="number-selected">（${selectedPostIds.size}）</span></span></button>
                        </div>
                    `;

                } else {
                    toolbarHtml = `
                        ${backToTopHtml}
                        <div class="post-management-controls"> 
                        <a href="workspace.html?editId=new" class="btn toolbar-btn primary"><span class="iconfont icon-edit"></span>&nbsp;写新文章</a>
                        <button id="start-multiselect-btn" class="btn toolbar-btn"><span class="iconfont icon-multiselect"></span>多选</button>
                        </div>
                    `
                }

                toolbarContent.innerHTML = toolbarHtml;
            }


            function toggleMultiSelectMode(enable = false) {
                isMultiSelectMode = enable;

                // 清理状态并更新UI
                selectedPostIds.clear();
                mainContainer.classList.toggle('multi-select-mode', isMultiSelectMode);
                postsContainer.querySelectorAll('.management-card.selected').forEach(card => {
                    card.classList.remove('selected');
                });

                renderManagementToolbar();
            }

            // 为表格中的所有控件添加事件监听 (事件委托)
            postsContainer.addEventListener('change', (e) => {
                if (isMultiSelectMode) return;
                const postId = parseInt(e.target.closest('.management-card')?.dataset.postId);
                const post = posts.find(p => p.id === postId);
                if (!post) return;

                // 处理分区更改
                if (e.target.matches('.category-select')) {
                    post.categoryId = parseInt(e.target.value);
                    savePosts();
                    showToast('分区已更新！', 'success', 1000);
                }
                // 处理精选开关
                if (e.target.matches('.feature-toggle')) {
                    post.isFeatured = e.target.checked;
                    post.featuredDate = post.isFeatured ? Date.now() : null;
                    savePosts();
                }

            });

            // 监听卡片点击 (多选模式)

            postsContainer.addEventListener('click', (e) => {
                // 删除按钮的逻辑
                if (e.target.closest('.delete-btn')) {
                    if (confirm('确定删除？')) {
                        const postId = parseInt(e.target.closest('.delete-btn').dataset.id);
                        posts = posts.filter(p => p.id !== postId);
                        savePosts();
                        listManager.updateView(); // <-- 调用实例的方法来刷新列表
                    }
                    return;
                }

                // 卡片选择逻辑
                if (isMultiSelectMode) {
                    const card = e.target.closest('.management-card');
                    if (card) {
                        e.preventDefault(); // 阻止a标签跳转
                        const postId = parseInt(card.dataset.postId);

                        card.classList.toggle('selected');
                        if (card.classList.contains('selected')) {
                            selectedPostIds.add(postId);
                        } else {
                            selectedPostIds.delete(postId);
                        }
                        renderManagementToolbar(); // 更新计数
                    }
                }
            });


            toolbar.addEventListener('click', (e) => {
                const target = e.target;
                const targetId = target.id;
                if (target.id === 'start-multiselect-btn') {
                    toggleMultiSelectMode(true);
                }
                if (target.id === 'cancel-multiselect-btn') {
                    toggleMultiSelectMode(false);
                }
                if (target.id === 'multiselect-select-all-btn') {
                    // 从list manager获取所有文章ID
                    postInList = listManager.getPosts().map(p => p.id);
                    selectedPostIds = new Set(postInList);
                    postsContainer.querySelectorAll('.management-card').forEach(card => {
                        card.classList.add('selected');
                    });
                    renderManagementToolbar();
                }
                if (target.id === 'multiselect-invert-selection-btn') {
                    postInList = listManager.getPosts().map(p => p.id);
                    selectedPostIds = new Set(postInList.filter(id => !selectedPostIds.has(id)));
                    postsContainer.querySelectorAll('.management-card').forEach(card => {
                        if (selectedPostIds.has(parseInt(card.dataset.postId))) {
                            card.classList.add('selected');
                        } else {
                            card.classList.remove('selected');
                        }
                    });
                    renderManagementToolbar();
                }
                // --- 进入二级操作界面 ---
                if (target.dataset.actionType) {
                    bulkEditState.pendingAction = { type: target.dataset.actionType };
                    renderManagementToolbar(); // 重新渲染工具栏以显示新UI
                    return;
                }

                // --- 从二级操作界面返回 ---
                if (target.id === 'multiselect-cancel-action-btn') {
                    bulkEditState.pendingAction = null;
                    renderManagementToolbar();
                    return;
                }

                // --- 核心：应用批量修改 ---
                if (target.id === 'multiselect-apply-btn') {
                    if (selectedPostIds.size === 0) {
                        showToast('请至少选择一篇文章。', 'error');
                        return;
                    }

                    const action = bulkEditState.pendingAction;
                    if (!action) return;

                    let successMessage = '';

                    // 遍历所有选中的文章并应用修改
                    selectedPostIds.forEach(id => {
                        const post = posts.find(p => p.id === id);
                        if (!post) return;

                        switch (action.type) {
                            case 'move':
                                const categoryId = parseInt(document.getElementById('bulk-category-select').value);
                                post.categoryId = categoryId;
                                successMessage = `已将 ${selectedPostIds.size} 篇文章移动到新分区。`;
                                break;
                            case 'addTags':
                            case 'removeTags':
                                const tagsInput = document.getElementById('bulk-tags-input').value.trim();
                                const tagsToProcess = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
                                if (tagsToProcess.length === 0) return;

                                if (!post.tags) post.tags = [];
                                const postTagsSet = new Set(post.tags);

                                if (action.type === 'addTags') {
                                    tagsToProcess.forEach(tag => postTagsSet.add(tag));
                                    successMessage = `已为 ${selectedPostIds.size} 篇文章添加标签。`;
                                } else { // removeTags
                                    tagsToProcess.forEach(tag => postTagsSet.delete(tag));
                                    successMessage = `已从 ${selectedPostIds.size} 篇文章中移除标签。`;
                                }
                                post.tags = Array.from(postTagsSet);
                                break;
                        }
                    });

                    savePosts();
                    showToast(successMessage, 'success');

                    // 操作完成后，退出多选模式并刷新列表
                    toggleMultiSelectMode(false);
                    listManager.updateView(); // 调用实例的方法刷新

                    return;
                }

                if (targetId === 'multiselect-delete-btn') {
                    if (selectedPostIds.size > 0 && confirm(`确定要删除所选的 ${selectedPostIds.size} 篇文章吗？`)) {
                        posts = posts.filter(post => !selectedPostIds.has(post.id));
                        savePosts();
                        showToast('所选文章已删除！', 'success');
                        toggleMultiSelectMode(false); // 退出多选模式
                        listManager.updateView(); // 刷新列表
                    }
                }
                if (targetId === 'multiselect-feature-btn' || targetId === 'multiselect-unfeature-btn') {
                    const isFeaturing = targetId === 'multiselect-feature-btn';
                    selectedPostIds.forEach(id => {
                        const post = posts.find(p => p.id === id);
                        if (post) {
                            post.isFeatured = isFeaturing;
                            post.featuredDate = isFeaturing ? Date.now() : null;
                        }
                    });
                    savePosts();
                    showToast(`批量${isFeaturing ? '精选' : '取消精选'}操作完成！`, 'success');
                    toggleMultiSelectMode(false);
                    listManager.updateView();
                }

            });

            renderManagementToolbar();
        }

        // 文章编辑器逻辑

        function initPostEditor(mode) {
            const editorChoiceSelect = document.getElementById('editor-choice');
            const contentTextarea = document.getElementById('post-content');

            const form = document.getElementById('new-post-form');
            const editorTitle = document.getElementById('editor-title');
            const categorySelect = document.getElementById('post-category');
            const titleInput = document.getElementById('post-title');
            const postImageInput = document.getElementById('post-image-url');
            const editorSection = document.getElementById('post-editor-section');
            const editorWrapper = document.getElementById('editor-wrapper');
            const tagsInput = document.getElementById('post-tags');

            categorySelect.innerHTML = categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
            if (categorySelect) wrapSelect(categorySelect);
            if (editorChoiceSelect) wrapSelect(editorChoiceSelect);

            let initialContent = '';

            let postToEdit = null;
            let initialEditorType = 'tinymce'; // 默认是TinyMCE

            // ... 填充其他表单项的逻辑 ...
            if (mode === 'new') {
                editorTitle.textContent = '发布新文章';
                form.reset(); // 确保表单是空的

            } else {
                const postId = parseInt(mode);
                const postToEdit = posts.find(p => p.id === postId);

                if (postToEdit) {
                    editorTitle.textContent = '编辑文章'; // 更改标题
                    // 填充表单
                    titleInput.value = postToEdit.title;
                    postImageInput.value = postToEdit.imageUrl || '';
                    categorySelect.value = postToEdit.categoryId;
                    tagsInput.value = (postToEdit.tags || []).join(', ');
                    initialContent = postToEdit.content; // 准备好要加载的内容

                    // 移除可能存在的旧的 hidden input，防止重复添加
                    const oldHiddenInput = document.getElementById('editing-post-id');
                    if (oldHiddenInput) oldHiddenInput.remove();


                    // 在表单中隐藏一个input，用来存储正在编辑的文章ID
                    const hiddenInput = document.createElement('input');
                    hiddenInput.type = 'hidden';
                    hiddenInput.id = 'editing-post-id';
                    hiddenInput.value = postId;
                    form.appendChild(hiddenInput);

                } else {
                    // 如果没找到文章，可以跳转回工作区首页或显示错误
                    showToast('要编辑的文章不存在！', 'error', 2000);
                    window.location.href = 'workspace.html';
                    return;
                }
            }

            // --- 1. 判断是新建还是编辑，并确定初始编辑器类型 ---
            if (mode !== 'new') {
                const postId = parseInt(mode);
                postToEdit = posts.find(p => p.id === postId);
                if (postToEdit) {
                    initialEditorType = postToEdit.editorType;
                    // 编辑模式下，切换编辑器类型时需要转换数据 MD<-->html
                    editorChoiceSelect.value = initialEditorType;
                    /*                     editorChoiceSelect.disabled = true; */
                } else {
                    /* 错误处理 */
                    showToast('要编辑的文章不存在！', 'error', 2000);
                    window.location.href = 'workspace.html';
                    return;
                }
            } else {
                editorChoiceSelect.disabled = false;
            }

            // 配置turndown
            const turndownService = new TurndownService({ emDelimiter: '*' });
            turndownService.use(turndownPluginGfm.gfm);
            turndownService.addRule('heading', {
                filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
                replacement: function (content, node) {
                    const hLevel = Number(node.nodeName.charAt(1));
                    return '\n' + '#'.repeat(hLevel) + ' ' + content + '\n\n';
                }
            });
            // --- 切换编辑器的核心函数 ---
            function switchEditor(type) {

                // 如果要切换的类型和当前一样，则不执行任何操作
                if (type === activeEditorType) return;

                // --- 在销毁前，获取当前编辑器的内容 ---
                let contentToConvert = '';
                if (activeEditorInstance || tinymce.get('post-content')) {
                    if (activeEditorType === 'markdown') {
                        contentToConvert = activeEditorInstance.value();
                    } else if (tinymce.get('post-content')) {
                        contentToConvert = tinymce.get('post-content').getContent();
                    }
                } else if (postToEdit) {
                    // 这是第一次加载编辑器时
                    contentToConvert = postToEdit.content;
                }

                // 销毁旧实例
                if (activeEditorInstance) {
                    if (activeEditorType === 'markdown' && activeEditorInstance.toTextArea) {
                        // EasyMDE的销毁方法
                        activeEditorInstance.toTextArea();
                        activeEditorInstance = null;
                    } else if (activeEditorType === 'tinymce' && tinymce.get('post-content')) {
                        // TinyMCE的销毁方法
                        tinymce.remove('#post-content');
                        activeEditorInstance = null;
                    }
                }
                // 清空 editorWrapper 并重新插入 textarea
                editorWrapper.innerHTML = '<textarea id="post-content" rows="8"></textarea>';

                // 根据类型初始化新实例
                if (type === 'markdown') {
                    // 如果旧的是TinyMCE(HTML)，则用turndown转换
                    const markdownContent = activeEditorType === 'tinymce' ? turndownService.turndown(contentToConvert) : contentToConvert;

                    activeEditorInstance = new EasyMDE({
                        element: document.getElementById('post-content'),
                        spellChecker: false, // 禁用拼写检查
                        placeholder: "在这里使用Markdown开始写作...",
                        initialValue: markdownContent, // 直接设置初始值
                        // (可选) 配置工具栏按钮
                        toolbar: ["bold", "italic", "heading", "|", "quote", "code", "unordered-list", "ordered-list", "|", "link", "image", "|", "preview", "side-by-side", "fullscreen"]
                    });
                    setupPreview();


                    /*                     // 设置内容
                                        activeEditorInstance.value(initialContent); */
                } else { // 默认是 tinymce
                    // 如果旧的是EasyMDE(Markdown)，则用marked转换
                    const htmlContent = activeEditorType === 'markdown' ? marked.parse(contentToConvert, { renderer: renderer }) : contentToConvert;
                    tinymce.init({
                        selector: '#post-content',
                        // 其他配置，即将与workspace.html内置的配置整合
                        plugins: 'autolink lists link image charmap preview anchor stickytoolbar autoresize',
                        toolbar: 'undo redo | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent | link image',
                        toolbar_sticky: true, // 开启粘性工具栏
                        toolbar_sticky_offset: 51.6, // 工具栏粘在顶部时，距离视口顶部的距离，可以防止被你的粘性导航栏遮住
                        height: 500,
                        language: 'zh_CN',

                        setup: function (editor) {
                            editor.on('init', function () {
                                // 在编辑器完全初始化后，设置内容
                                editor.setContent(htmlContent);
                                setupPreview();
                            });
                        }
                    });
                }
                activeEditorType = type;
            }

            // --- 3. 绑定事件 ---
            editorChoiceSelect.addEventListener('change', () => {
                switchEditor(editorChoiceSelect.value);
            });

            // --- 4. 初始加载 ---
            switchEditor(initialEditorType);

            // 退出编辑按钮的逻辑
            const exitEditBtn = editorSection.querySelector('.exit-edit-btn');
            if (exitEditBtn) {
                exitEditBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    // 在退出前可以加一个确认框
                    if (confirm('有未保存的更改，确定要退出吗？')) {
                        window.location.href = 'workspace.html';
                    }
                });
            }
        }


        const setupPreview = () => {
            if (previewPane) {

                // 根据当前编辑器类型获取编辑器实例
                const editor = activeEditorType === 'markdown' ? activeEditorInstance : tinymce.get('post-content');
                /* const editor = tinymce.get('post-content'); */

                // 如果有，解绑旧的监听器
                if (previewPane.editor) {
                    previewPane.editor.off('input keyup change', updatePreview);
                }
                /*                 editor.off('input keyup change', updatePreview); */


                // 监听编辑器的内容变化事件
                if (activeEditorType === 'tinymce') {
                    editor.on('keyup', updatePreview);
                    editor.on('change', updatePreview);// 也监听粘贴等变化
                }
                else {
                    activeEditorInstance.codemirror.on('keyup', updatePreview);
                    activeEditorInstance.codemirror.on('change', updatePreview);
                }

                // 监听标题输入框的变化
                if (titleInput) {
                    titleInput.addEventListener('keyup', updatePreview);
                }

                // 监听图片输入框的变化
                if (postImageInput) {
                    postImageInput.addEventListener('change', updatePreview);
                }

                updatePreview(); // 初始化时更新一次预览
                // 统一的更新函数
                function updatePreview() {

                    if (!previewPane.classList.contains('active')) return; // 如果预览是隐藏的，就不更新

                    if (previewTitle && titleInput) {
                        previewTitle.textContent = titleInput.value;
                    }

                    if (postImageInput) {
                        previewImage.style.display = postImageInput.value ? 'block' : 'none';
                        previewImage.src = postImageInput.value;
                    }


                    if (previewContent) {
                        // --- 根据当前激活的编辑器类型来获取和处理内容 ---
                        let finalHtmlContent = '';
                        if (activeEditorType === 'markdown') {
                            if (activeEditorInstance) { // 确保EasyMDE实例存在
                                const markdownContent = activeEditorInstance.value();
                                finalHtmlContent = marked.parse(markdownContent, { renderer: renderer });
                            }

                        } else { // tinymce
                            const editor = tinymce.get('post-content');
                            if (editor) {
                                finalHtmlContent = editor.getContent();
                            }
                        }
                        previewContent.innerHTML = finalHtmlContent;
                    }

                }
            } else {
                // 如果 TinyMCE 还没准备好，等一下再试
                setTimeout(setupPreview, 100);
            }
        };

        function bindWorkspaceToolbarEvents() {
            const submitBtnToolbar = document.getElementById('submit-form-btn');
            const form = document.getElementById('new-post-form');
            const togglePreviewBtn = document.getElementById('toggle-preview-btn');
            const previewPane = document.querySelector('.preview-pane');



            // 发布按钮
            if (submitBtnToolbar && form) {
                // 手动触发表单的 submit 事件
                // form.submit() 会直接提交并刷新页面，不会触发 onsubmit 事件监听器
                // 我们需要创建一个 submit 事件并 dispatch 它
                submitBtnToolbar.addEventListener('click', () => {
                    form.requestSubmit();
                });
            }

            // 预览按钮
            togglePreviewBtn.addEventListener('click', function () {
                const isActive = previewPane.classList.contains('active');

                // 我们在切换 *之前* 判断将要发生什么
                if (!isActive) { // 如果当前是收起的，意味着即将展开
                    // 定义一个一次性的事件监听器


                    lastScrollY = window.scrollY;
                    setTimeout(() => {
                        const previewPaneTop = previewPane.getBoundingClientRect().top + window.scrollY - 80;
                        window.scrollTo({
                            top: previewPaneTop,
                            behavior: 'smooth'
                        });
                    }, 50);

                } else {
                    // 跳回原来的位置
                    window.scrollTo({ top: lastScrollY, behavior: 'smooth' });
                }

                // 正常切换 active 类来启动动画
                this.classList.toggle('active');
                previewPane.classList.toggle('active');

                const textNode = this.childNodes[2]; // 获取按钮内的文本节点
                if (textNode) {
                    textNode.textContent = isActive ? ' 预览' : ' 返回';
                }

                setupPreview();
            });

        }




        const urlParams = new URLSearchParams(window.location.search);
        const editId = urlParams.get('editId'); // 获取 'editId' 或 'new'

        // 根据URL决定显示编辑器还是标签页
        if (editId) {
            // 如果URL中有 editId，则直接显示编辑器，隐藏其他所有面板
            contentPanes.forEach(pane => pane.classList.remove('active'));
            editorSection.classList.add('active');
            tabsContainer.style.display = 'none';
            toolbar.style.display = 'flex';
            initPostEditor(editId); // 将ID或'new'传给编辑器初始化函数

            renderFooterToolbar('workspace', { isEditing: true, editId: editId }, 'edit'); // 工具栏渲染
            // 绑定工作区工具栏的特定事件 (提交、预览等)
            bindWorkspaceToolbarEvents();


        } else {
            // 否则，正常初始化标签页功能
            tabsContainer.style.display = 'flex';
            toolbar.style.display = 'none'; // 隐藏粘性工具栏
            editorSection.classList.remove('active'); // 确保编辑器是隐藏的

            initTabs();
            initPostManagementList();
            initCategoryManager();
        }

        handlePostSubmission();

        if (editId) {
            setupPreview();
        }

    }

    function initGlobal() {

    }

    let pagesManager = {};
    // 初始化文章列表和新文章发布功能
    if (document.getElementById('workspace')) {
        initWorkspacePage();
    }
    if (document.getElementById('post')) {
        initPostPage();
    }
    if (document.getElementById('index')) {
        initIndexPage();
    }
    if (document.getElementById('archive')) {
        pagesManager = initArchivePage();
    }


    function initBackToTop() {
        // 把事件监听和元素获取都封装起来
        const backToTopButton = document.getElementById('back-to-top');
        if (!backToTopButton) {
            // 如果当前页面没有工具栏，就监听全局的那个按钮
            const globalBtn = document.querySelector('body > #back-to-top');
            if (globalBtn) {
                window.addEventListener('scroll', throttle(() => {
                    globalBtn.classList.toggle('visible', window.scrollY > 300);
                }, 100));
            }
            return;
        }

        // 这是针对工具栏内按钮的逻辑
        window.addEventListener('scroll', throttle(() => {
            // classList.toggle(className, boolean) 是一个非常有用的方法
            // 如果 boolean 为 true，则添加类；如果为 false，则移除类。\

            const backToTopButtons = document.querySelectorAll('#back-to-top');
            backToTopButtons.forEach(btn => {
                btn.classList.toggle('hidden', window.scrollY <= 300);
            });
        }, 100));
        // 使用节流，避免过于频繁地操作DOM

        // 点击事件保持不变
        document.body.addEventListener('click', (e) => {
            if (e.target.closest('#back-to-top')) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }



    /* 返回顶部按钮 */
    /*     const backToTopButton = document.getElementById('back-to-top');
     
        window.addEventListener('scroll', function () {
            if (window.scrollY > 300) {
                backToTopButton.style.display = 'block';
            } else {
                backToTopButton.style.display = 'none';
            }
        });
     
        backToTopButton.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }); */

    //删除按钮
    function handleDeletePost() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.addEventListener('click', function (event) {
                // 检查被点击的元素是否是删除按钮
                if (event.target.closest('.delete-btn')) {

                    if (!confirm('你确定要删除这篇文章吗？这个操作不可撤销。')) {
                        return; // 如果用户点击“取消”，则什么都不做
                    }

                    //获取要删除的文章ID
                    const postIdToDelete = parseInt(event.target.dataset.id);

                    if (isNaN(postIdToDelete)) {
                        showToast('无效的文章ID。', 'error', 2000);
                        return;
                    }

                    //从当前的 `posts` 数组中过滤掉这篇文章
                    posts = posts.filter(post => post.id !== postIdToDelete);

                    //将更新后的数组存回 localStorage
                    savePosts();

                    //刷新页面
                    location.reload();
                }
            });
        }
    }
    handleDeletePost();

    function handleToggleFeature() {
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.addEventListener('click', function (event) {
                const featureBtn = event.target.closest('.feature-btn');
                if (featureBtn) {
                    const postIdToToggle = parseInt(featureBtn.dataset.id);

                    // 找到对应的文章
                    const postToToggle = posts.find(p => p.id === postIdToToggle);

                    if (postToToggle) {

                        postToToggle.isFeatured = !postToToggle.isFeatured;

                        postToToggle.featuredDate = postToToggle.isFeatured ? Date.now() : null;

                        // 更改按钮内文字
                        /* button.textContent = postToToggle.isFeatured ? '取消精选' : '设为精选'; */
                        //更改按钮内图标
                        featureBtn.innerHTML = postToToggle.isFeatured ? '<span class="iconfont icon-star"></span>' : '<span class="iconfont icon-star1"></span>';


                        savePosts();
                        renderFeaturedPosts(getHomepageFeatures(posts));
                    }
                }
            });
        }
    }

    // 链接预览卡片
    function initLinkPreviews() {
        const previewCard = document.getElementById('link-preview-card');
        const mainContent = document.querySelector('.main-content'); // 监听的主要区域
        if (!previewCard || !mainContent) return;

        let hideTimeout; // 用于延迟隐藏的计时器

        // --- 监听鼠标进入站内链接 ---
        mainContent.addEventListener('mouseover', (event) => {
            const link = event.target.closest('.internal-link');
            if (!link) return;

            // 清除可能存在的隐藏计时器
            clearTimeout(hideTimeout);

            // 获取文章ID并找到文章数据
            const postId = parseInt(link.dataset.postId);
            const post = posts.find(p => p.id === postId);
            if (!post) return;

            // 填充卡片内容
            updatePreviewCard(post);

            // 定位并显示卡片
            positionAndShowPreviewCard(link);
        });

        // --- 监听鼠标离开站内链接 ---
        mainContent.addEventListener('mouseout', (event) => {
            const link = event.target.closest('.internal-link');
            if (!link) return;

            // 启动一个延迟计时器，在短暂延迟后隐藏卡片
            // 这可以防止鼠标快速划过时卡片闪烁
            hideTimeout = setTimeout(() => {
                previewCard.classList.remove('visible');
            }, 200);
        });

        // --- 当鼠标进入预览卡片本身时，保持显示 ---
        previewCard.addEventListener('mouseover', () => {
            clearTimeout(hideTimeout);
        });

        // --- 当鼠标离开预览卡片时，隐藏它 ---
        previewCard.addEventListener('mouseout', () => {
            hideTimeout = setTimeout(() => {
                previewCard.classList.remove('visible');
            }, 200);
        });

        // --- 填充卡片内容的函数 ---
        function updatePreviewCard(post) {
            let summaryHtml = '';
            /*if (post.editorType === 'markdown') {
                const plainText = new DOMParser().parseFromString(marked.parse(post.content), 'text/html').body.textContent || "";
                summaryText = truncateText(plainText, 100); 
                
     
            } else { // tinymce (html)
                const plainText = new DOMParser().parseFromString(post.content, 'text/html').body.textContent || "";
                summaryText = truncateText(plainText, 100); 
            }*/
            summaryHtml = truncateHtml(stripAttributes(processContent(post)), 100);

            previewCard.innerHTML = `
            ${post.imageUrl ? `<img src="${post.imageUrl}" alt="${post.title}" class="preview-image">` : ''}
            <h4 class="preview-title">${post.title}</h4>
            <p class="preview-summary">${summaryHtml}</p>
        `;
        }

        // --- 定位卡片的函数 ---
        function positionAndShowPreviewCard(linkElement) {
            const linkRect = linkElement.getBoundingClientRect();

            // 计算卡片位置，优先显示在链接上方
            let top = linkRect.top - previewCard.offsetHeight - 10;
            let left = linkRect.left;

            // 如果上方空间不够，则显示在下方
            if (top < 0) {
                top = linkRect.bottom + 10;
            }

            // 如果右侧空间不够，则向左偏移
            if (left + previewCard.offsetWidth > window.innerWidth) {
                left = window.innerWidth - previewCard.offsetWidth - 10;
            }

            previewCard.style.top = `${top}px`;
            previewCard.style.left = `${left}px`;

            // 最后，让卡片可见
            previewCard.classList.add('visible');
        }
    }

    /**
    * 显示一个底部弹出通知
    * @param {string} message - 要显示的消息
    * @param {string} [type='info'] - 通知类型 ('success', 'error', 'info')
    * @param {number} [duration=3000] - 显示时长（毫秒）
    */
    function showToast(message, type = 'info', duration = 3000) {

        const toast = document.getElementById('toast-notification');
        const messageSpan = document.getElementById('toast-message');
        if (!toast || !messageSpan) return;

        // 1. 设置消息和类型
        messageSpan.textContent = message;
        toast.className = 'toast-notification'; // 先重置class
        if (type) {
            toast.classList.add(type);
        }

        // 2. 显示通知 (触发进入动画)
        toast.classList.add('show');

        // 3. 在指定时间后自动隐藏
        setTimeout(() => {
            toast.classList.remove('show');
        }, duration);
    }

    function initSelectAnimations() {
        document.addEventListener('click', (e) => {
            // a. 获取被点击的 .select-wrapper (如果有的话)
            const clickedWrapper = e.target.closest('.select-wrapper');

            // b. 先关闭所有不是刚刚被点击的 wrapper
            document.querySelectorAll('.select-wrapper.open').forEach(openWrapper => {
                if (openWrapper !== clickedWrapper) {
                    openWrapper.classList.remove('open');
                }
            });

            // c. 如果确实点击了一个 wrapper，则切换它的 open 状态
            if (clickedWrapper) {
                clickedWrapper.classList.toggle('open');
            }
        });

        /* document.addEventListener('click', (e) => {
            const wrapper = e.target.closest('.select-wrapper');

            // 先移除所有 select 的 open 状态
            document.querySelectorAll('select-wrapper.open').forEach(openWrapper => {
                if (openWrapper !== wrapper) {
                    openWrapper.classList.remove('open');
                }
            });

            // 如果点击的是一个 select-wrapper 或其内部元素，则切换 open 状态
            if (wrapper) {
                wrapper.classList.toggle('open');
            }
        }); */
    }

    function initCollapsibleStickyElements() {
        // --- 处理筛选器 ---
        const filtersWrapper = document.getElementById('archive-filters-sticky-wrapper') || document.getElementById('management-filters-wrapper');
        const footerToolbar = document.querySelector('.footer-toolbar');

        if (filtersWrapper) {
            // 动态添加HTML，确保有 .bottom 类
            const handleHtml = `
            <div class="sticky-handle-wrapper bottom">
                <button id="toggle-filters-btn" class="sticky-handle bottom" title="收起/展开工具栏">
                    <span class="iconfont icon-uparrow"></span>
                </button>
            </div>`;
            filtersWrapper.insertAdjacentHTML('beforeend', handleHtml);
            const toggleBtn = document.getElementById('toggle-filters-btn');
            // ...绑定事件...
            toggleBtn.addEventListener('click', () => {
                filtersWrapper.classList.toggle('collapsed');
            });
        }
        if (footerToolbar) {
            // a. 在JS中动态创建触发条
            const toolbarHandleHtml = `
            <div class="sticky-handle-wrapper top">
                <button id="toggle-toolbar-btn" class="sticky-handle top" title="收起/展开工具栏">
                    <span class="iconfont icon-a-DownArrow"></span>
                </button>
            </div>
        `;
            footerToolbar.insertAdjacentHTML('afterbegin', toolbarHandleHtml);

            // b. 绑定事件
            const toggleToolbarBtn = document.getElementById('toggle-toolbar-btn');
            toggleToolbarBtn.addEventListener('click', () => {
                footerToolbar.classList.toggle('collapsed');
            });
        }

        // --- 升级滚动事件监听器 ---
        window.addEventListener('scroll', throttle(() => { // 使用我们之前定义的节流函数
            const scrollY = window.scrollY;
            const viewportHeight = window.innerHeight;
            const pageHeight = document.documentElement.scrollHeight;

            // a. 处理顶部筛选器 (filtersWrapper)
            if (filtersWrapper) {
                const handle = filtersWrapper.querySelector('.sticky-handle');
                if (handle) {
                    handle.classList.toggle('is-hidden', scrollY < 350);
                }
                if (scrollY < 350) { // 150px 是一个可以调整的阈值
                    filtersWrapper.classList.remove('collapsed');
                    // 同样需要更新按钮状态
                    /* const toggleBtn = filtersWrapper.querySelector('.sticky-handle .iconfont');
                    if (toggleBtn) toggleBtn.style.transform = 'rotate(0deg)'; */
                }
            }

            // b. 处理底部工具栏 (footerToolbar)
            if (footerToolbar) {
                // 如果滚动到底部（留出一点缓冲区）
                const handle = footerToolbar.querySelector('.sticky-handle');
                const isAtBottom = scrollY + window.innerHeight >= document.documentElement.scrollHeight - 150;

                if (handle) {
                    handle.classList.toggle('is-hidden', isAtBottom);
                }

                if (scrollY + viewportHeight >= pageHeight - 300) {
                    footerToolbar.classList.remove('collapsed');
                }

            }

        }, 100)); // 每100毫秒检查一次，性能更好
    }






    initBackToTop();
    handleToggleFeature();

    handleGlobalVoting();

    // 全局UI初始化
    initSmartNavbar();

    initLinkPreviews();
    initSelectAnimations();
    initCollapsibleStickyElements();


});