(function () {
    'use strict';

    function initHeroSwiper() {
        if (typeof Swiper === 'undefined') {
            return;
        }

        const el = document.querySelector('.hero-swiper');
        if (!el) {
            return;
        }

        new Swiper('.hero-swiper', {
            loop: true,
            loopAdditionalSlides: 0,
            speed: 650,
            centeredSlides: true,
            slidesPerView: 'auto',
            spaceBetween: 20,
            grabCursor: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
            },
            navigation: {
                nextEl: '.hero-swiper-next',
                prevEl: '.hero-swiper-prev',
            },
            pagination: {
                el: '.hero-swiper-pagination',
                clickable: true,
            },
            keyboard: {
                enabled: true,
                onlyInViewport: true,
            },
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeroSwiper);
    } else {
        initHeroSwiper();
    }
})();
