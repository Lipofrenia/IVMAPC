(function() {
    'use strict';
    
    const track = document.querySelector('.slider-track');
    const slides = document.querySelectorAll('.slide');
    const prevButton = document.querySelector('.prev');
    const nextButton = document.querySelector('.next');
    const dots = document.querySelectorAll('.slider-dot');
    const container = document.querySelector('.slider-container');
    
    let currentIndex = 0;
    let autoScrollInterval;
    const intervalTime = 10000;
    let slideWidth = 0;
    let gap = 50;
    let containerWidth = 0;
    let offsetCenter = 0;
    
    // Функция для получения ширины слайда и обновления отступов
    function updateDimensions() {
        if (slides.length === 0) return;
        
        slideWidth = slides[0].offsetWidth;
    
        const trackStyle = window.getComputedStyle(track);
        gap = parseFloat(trackStyle.gap) || 50;
        
        containerWidth = container ? container.offsetWidth : window.innerWidth;
        
        offsetCenter = (containerWidth - slideWidth) / 2;
        
        track.style.paddingLeft = offsetCenter + 'px';
        track.style.paddingRight = offsetCenter + 'px';
    }
    
    // Функция для получения полной ширины слайда с gap
    function getTotalSlideWidth() {
        return slideWidth + gap;
    }
    
    // Обновление позиции слайдера
    function updateSlider() {
        if (slideWidth === 0) {
            updateDimensions();
        }
        
        const totalWidth = getTotalSlideWidth();
        if (totalWidth === 0) return;
        
        // Вычисляем смещение
        const offset = -currentIndex * totalWidth;
        track.style.transform = `translateX(${offset}px)`;
        
        // Обновляем точки
        dots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.classList.add('is-active');
                dot.setAttribute('aria-selected', 'true');
            } else {
                dot.classList.remove('is-active');
                dot.setAttribute('aria-selected', 'false');
            }
        });
    }
    
    // Следующий слайд
    function nextSlide() {
        currentIndex = (currentIndex + 1) % slides.length;
        updateSlider();
        resetAutoScroll();
    }
    
    // Предыдущий слайд
    function prevSlide() {
        currentIndex = (currentIndex - 1 + slides.length) % slides.length;
        updateSlider();
        resetAutoScroll();
    }
    
    // Переход к слайду
    function goToSlide(index) {
        if (index >= 0 && index < slides.length) {
            currentIndex = index;
            updateSlider();
            resetAutoScroll();
        }
    }
    
    // Сброс автопрокрутки
    function resetAutoScroll() {
        if (autoScrollInterval) {
            clearInterval(autoScrollInterval);
        }
        autoScrollInterval = setInterval(nextSlide, intervalTime);
    }
    
    // Обработка изменения размера окна
    let resizeTimeout;
    function handleResize() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateDimensions();
            updateSlider();
        }, 100);
    }
    
    // Добавляем обработчики
    if (nextButton) nextButton.addEventListener('click', nextSlide);
    if (prevButton) prevButton.addEventListener('click', prevSlide);
    
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => goToSlide(index));
    });
    
    // Инициализация
    function init() {
        // Ждем загрузки изображений
        setTimeout(() => {
            updateDimensions();
            updateSlider();
            console.log('Слайдер инициализирован');
        }, 100);
        
        resetAutoScroll();
        
        // Пауза при наведении
        const slider = document.querySelector('.slider');
        if (slider) {
            slider.addEventListener('mouseenter', () => {
                if (autoScrollInterval) clearInterval(autoScrollInterval);
            });
            slider.addEventListener('mouseleave', resetAutoScroll);
        }
        
        window.addEventListener('resize', handleResize);
    }
    
    // Запуск
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();