document.addEventListener('DOMContentLoaded', function() {
    // Инициализация Feather icons
    feather.replace();
    
    // Показываем прелоадер
    const pageLoader = document.createElement('div');
    pageLoader.className = 'loading-overlay';
    pageLoader.id = 'page-loader';
    pageLoader.innerHTML = '<div class="loader"></div>';
    document.body.prepend(pageLoader);
    
    // Плавная загрузка секций
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.classList.add('section-loading');
    });

    // Убираем прелоадер после загрузки
    window.addEventListener('load', function() {
        setTimeout(() => {
            if (pageLoader) {
                pageLoader.style.opacity = '0';
                setTimeout(() => {
                    pageLoader.style.display = 'none';
                    sections.forEach(section => {
                        section.classList.add('section-loaded');
                    });
                }, 300);
            }
        }, 800);
    });

    // Загрузка компонентов
    loadComponents();
    
    // Инициализация кнопки "Наверх"
    setupScrollToTop();

    // Инициализация модального окна статей
    if (document.querySelector('.article-btn')) {
        setupArticleModal();
    }

    // Инициализация фильтра портфолио
    if (document.querySelector('.portfolio-filter-btn')) {
        setupPortfolioFilter();
    }
});

function loadComponents() {
    // Загружаем header если контейнер существует
    const headerContainer = document.getElementById('header-container');
    if (headerContainer) {
        fetch('components/header.html')
            .then(response => response.text())
            .then(html => {
                headerContainer.innerHTML = html;
                feather.replace();
                setupMobileMenu(); // Инициализируем мобильное меню
                setupNavigation(); // Инициализируем навигацию
                setupScrollLinks(); // Инициализируем плавную прокрутку
            })
            .catch(error => console.error('Error loading header:', error));
    }

    // Загружаем footer если контейнер существует
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
        fetch('components/footer.html')
            .then(response => response.text())
            .then(html => {
                footerContainer.innerHTML = html;
                feather.replace();
            })
            .catch(error => console.error('Error loading footer:', error));
    }
}

function setupMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const menuClose = document.getElementById('mobile-menu-close');
    const menuOverlay = document.getElementById('mobile-menu-overlay');
    const menu = document.getElementById('mobile-menu');

    if (!menuBtn || !menu) {
        console.log('Mobile menu elements not found');
        return;
    }

    console.log('Mobile menu initialized');

    let isMenuOpen = false;

    function openMenu() {
        console.log('Opening mobile menu');
        menu.classList.add('active');
        menuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        isMenuOpen = true;

        // Меняем иконку на крестик
        const icon = menuBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-feather', 'x');
            feather.replace();
        }

        // Обновляем ARIA атрибуты
        menuBtn.setAttribute('aria-expanded', 'true');
        menu.setAttribute('aria-hidden', 'false');
    }

    function closeMenu() {
        console.log('Closing mobile menu');
        menu.classList.remove('active');
        menuOverlay.classList.remove('active');
        document.body.style.overflow = '';
        isMenuOpen = false;

        // Меняем иконку обратно на меню
        const icon = menuBtn.querySelector('i');
        if (icon) {
            icon.setAttribute('data-feather', 'menu');
            feather.replace();
        }

        // Обновляем ARIA атрибуты
        menuBtn.setAttribute('aria-expanded', 'false');
        menu.setAttribute('aria-hidden', 'true');
    }

    function toggleMenu() {
        if (isMenuOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    // Обработчики событий
    menuBtn.addEventListener('click', toggleMenu);

    if (menuClose) {
        menuClose.addEventListener('click', closeMenu);
    }

    if (menuOverlay) {
        menuOverlay.addEventListener('click', closeMenu);
    }

    // Закрытие по клавише Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isMenuOpen) {
            closeMenu();
        }
    });

    // Закрытие при ресайзе на десктоп
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768 && isMenuOpen) {
            closeMenu();
        }
    });

    // Закрытие при клике на ссылку в мобильном меню
    const menuLinks = document.querySelectorAll('.mobile-menu-link');
    menuLinks.forEach(link => {
        link.addEventListener('click', function() {
            setTimeout(closeMenu, 300);
        });
    });
}

function setupNavigation() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav a, .nav-link, .mobile-menu-link');

    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (linkPage === currentPage || (currentPage === '' && linkPage === 'index.html')) {
            link.classList.add('nav-active', 'active');
        } else {
            link.classList.remove('nav-active', 'active');
        }
    });
}

function setupScrollLinks() {
    // Плавная прокрутка для внутренних ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#' || href === '#!') return;

            e.preventDefault();
            const targetId = href.substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                const headerHeight = document.querySelector('header')?.offsetHeight || 80;
                const elementPosition = targetElement.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Закрываем мобильное меню если открыто
                const mobileMenu = document.getElementById('mobile-menu');
                if (mobileMenu && mobileMenu.classList.contains('active')) {
                    mobileMenu.classList.remove('active');
                    document.getElementById('mobile-menu-overlay').classList.remove('active');
                    document.body.style.overflow = '';

                    const menuBtn = document.getElementById('mobile-menu-btn');
                    if (menuBtn) {
                        const icon = menuBtn.querySelector('i');
                        if (icon) {
                            icon.setAttribute('data-feather', 'menu');
                            feather.replace();
                        }
                    }
                }
            }
        });
    });
}

function setupScrollToTop() {
    const scrollToTopBtn = document.createElement('button');
    scrollToTopBtn.innerHTML = '<i data-feather="arrow-up"></i>';
    scrollToTopBtn.id = 'scroll-to-top';
    scrollToTopBtn.setAttribute('aria-label', 'Прокрутить наверх');

    scrollToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    document.body.appendChild(scrollToTopBtn);
    feather.replace();

    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollToTopBtn.classList.add('visible');
        } else {
            scrollToTopBtn.classList.remove('visible');
        }
    });
}

function setupArticleModal() {
    const modal = document.getElementById('article-modal');
    const modalClose = document.getElementById('modal-close');
    const articleButtons = document.querySelectorAll('.article-btn');
    
    if (!modal || articleButtons.length === 0) return;
    
    const articleTitles = {
        'trends-2026.md': 'Тренды веб-разработки в 2026 году',
        'ai-bot-guide.md': 'Создание AI-бота с нуля',
        'minecraft-optimization.md': 'Оптимизация Minecraft серверов',
        'performance-optimization.md': 'Ускорение загрузки сайтов',
        'web-security.md': 'Безопасность веб-приложений',
        'it-startup-guide.md': 'Как запустить IT-проект'
    };
    
    function openModal(articleFile) {
        const modalTitle = document.getElementById('modal-title');
        const modalContent = document.getElementById('article-content');
        
        modalTitle.textContent = articleTitles[articleFile] || 'Статья';
        modalContent.innerHTML = `
            <div class="flex justify-center">
                <div class="loader" style="width: 40px; height: 40px;"></div>
            </div>
        `;
        
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        setTimeout(() => {
            fetch(`assets/markdown/${articleFile}`)
                .then(response => {
                    if (!response.ok) throw new Error('Статья не найдена');
                    return response.text();
                })
                .then(markdown => {
                    modalContent.innerHTML = marked.parse(markdown);
                    feather.replace();
                })
                .catch(error => {
                    modalContent.innerHTML = `
                        <div class="text-center py-12">
                            <div class="text-5xl mb-4">📄</div>
                            <h3 class="text-xl font-bold mb-2">Статья не найдена</h3>
                            <p class="text-gray-400">Файл ${articleFile} не найден в папке assets/markdown/</p>
                        </div>
                    `;
                });
        }, 600);
    }
    
    function closeModal() {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            const modalTitle = document.getElementById('modal-title');
            const modalContent = document.getElementById('article-content');
            if (modalTitle) modalTitle.textContent = '';
            if (modalContent) modalContent.innerHTML = '';
        }, 300);
    }
    
    articleButtons.forEach(button => {
        button.addEventListener('click', function() {
            const articleFile = this.getAttribute('data-article');
            openModal(articleFile);
        });
    });
    
    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

function setupPortfolioFilter() {
    const filterButtons = document.querySelectorAll('.portfolio-filter-btn');
    const portfolioItems = document.querySelectorAll('.portfolio-item');
    
    if (filterButtons.length === 0) return;
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            portfolioItems.forEach(item => {
                if (filter === 'all' || item.getAttribute('data-category').includes(filter)) {
                    item.style.display = 'block';
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, 10);
                } else {
                    item.style.opacity = '0';
                    item.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        item.style.display = 'none';
                    }, 300);
                }
            });
        });
    });
}