(function () {
    const SLIDES = [
        "images/slider/Slide 1.png",
        "images/slider/Slide 2.png",
        "images/slider/Slide 3.png",
        "images/slider/Slide 4.png",
        "images/slider/Slide 5.png",
    ];

    const slider = document.querySelector(".slider");
    if (!slider) return;

    const prevSlideEl = slider.querySelector(".prev-slide");
    const curSlideEl = slider.querySelector(".cur-slide");
    const nextSlideEl = slider.querySelector(".next-slide");
    const btnPrev = slider.querySelector(".slider-buttons .prev");
    const btnNext = slider.querySelector(".slider-buttons .next");
    const dotsContainer = slider.querySelector(".slider-status");

    if (!prevSlideEl || !curSlideEl || !nextSlideEl || !btnPrev || !btnNext || !dotsContainer) {
        return;
    }

    let current = 0;

    function slideUrl(index) {
        const path = SLIDES[index];
        const encoded = path
            .split("/")
            .map((part) => encodeURIComponent(part))
            .join("/");
        return `url("${encoded}")`;
    }

    function mod(n, m) {
        return ((n % m) + m) % m;
    }

    function render() {
        const n = SLIDES.length;
        const prevIdx = mod(current - 1, n);
        const nextIdx = mod(current + 1, n);

        prevSlideEl.style.backgroundImage = slideUrl(prevIdx);
        curSlideEl.style.backgroundImage = slideUrl(current);
        nextSlideEl.style.backgroundImage = slideUrl(nextIdx);

        const dots = dotsContainer.querySelectorAll(".slider-dot");
        dots.forEach((dot, i) => {
            const active = i === current;
            dot.classList.toggle("is-active", active);
            dot.setAttribute("aria-selected", active ? "true" : "false");
        });
    }

    function goTo(index) {
        const n = SLIDES.length;
        current = mod(index, n);
        render();
    }

    btnPrev.addEventListener("click", () => goTo(current - 1));
    btnNext.addEventListener("click", () => goTo(current + 1));

    dotsContainer.addEventListener("click", (e) => {
        const dot = e.target.closest(".slider-dot");
        if (!dot || !dotsContainer.contains(dot)) return;
        const idx = parseInt(dot.dataset.slide, 10);
        if (!Number.isNaN(idx)) goTo(idx);
    });

    slider.tabIndex = 0;
    slider.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            goTo(current - 1);
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            goTo(current + 1);
        }
    });

    render();
})();
