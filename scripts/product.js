// ---------- Переключение изображений в галерее ----------
const mainImage = document.getElementById('main-image');
const thumbs = document.querySelectorAll('.product-gallery__thumb');

thumbs.forEach((thumb) => {
  thumb.addEventListener('click', () => {
    // Снимаем активный класс у всех
    thumbs.forEach((t) => t.classList.remove('active'));
    // Ставим активный класс на нажатую миниатюру
    thumb.classList.add('active');
    // Меняем главное изображение
    const newSrc = thumb.dataset.img;
    if (mainImage && newSrc) {
      mainImage.src = newSrc;
      mainImage.alt = thumb.querySelector('img')?.alt || '';
    }
  });
});

// ---------- Переключение табов ----------
const tabButtons = document.querySelectorAll('.product-tabs__tab');
const tabPanels = document.querySelectorAll('.product-tabs__content');

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const targetId = 'tab-' + btn.dataset.tab;

    // Сброс всех табов
    tabButtons.forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    tabPanels.forEach((panel) => {
      panel.classList.remove('active');
      panel.hidden = true;
    });

    // Активируем нужный
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    const target = document.getElementById(targetId);
    if (target) {
      target.classList.add('active');
      target.hidden = false;
    }
  });
});
