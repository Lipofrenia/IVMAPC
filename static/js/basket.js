function formatPrice(value) {
    return value.toLocaleString("ru-RU") + "\u00a0₽";
  }

  function parsePrice(str) {
    return parseInt(str.replace(/\s|₽|\u00a0/g, ""), 10) || 0;
  }
  
  function recalcSummary() {
    const items = document.querySelectorAll(".basket-item");
  
    let totalQty = 0;
    let totalSum = 0;
  
    items.forEach((item) => {
      const qty = getItemQty(item);
      const price = parsePrice(item.querySelector(".cell-price").textContent);
      const lineTotal = qty * price;
  
      item.querySelector(".cell-total").textContent = formatPrice(lineTotal);
  
      totalQty += qty;
      totalSum += lineTotal;
    });
  
    const subtitle = document.querySelector(".basket-subtitle");
    if (subtitle) {
      subtitle.textContent = `${totalQty}\u00a0${pluralItems(totalQty)} на сумму ${formatPrice(totalSum)}`;
    }
  
    // Боковая панель с итогами
    const summaryRows = document.querySelectorAll(".summary-row span:last-child");
    if (summaryRows.length >= 1) {

      const qtyLabel = document.querySelector(".summary-row span:first-child");
      if (qtyLabel) qtyLabel.textContent = `Товары (${totalQty})`;
      summaryRows[0].textContent = formatPrice(totalSum);
    }
    if (summaryRows.length >= 2) {
      // Итого
      summaryRows[summaryRows.length - 1].textContent = formatPrice(totalSum);
    }
  }
  
  // ─── Вспомогательные ─────────────────────────────────────────────────────────
  
 
  function getItemQty(item) {
    return parseInt(item.querySelector(".quantity-control span").textContent, 10) || 1;
  }
  
  function pluralItems(n) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return "товаров";
    if (mod10 === 1) return "товар";
    if (mod10 >= 2 && mod10 <= 4) return "товара";
    return "товаров";
  }
  
  // ─── Обработчики кнопок ───────────────────────────────────────────────────────
  
  function initItemControls(item) {
    const qtySpan = item.querySelector(".quantity-control span");
    const [btnMinus, btnPlus] = item.querySelectorAll(".quantity-control button");
  
    function updateQty(delta) {
      let qty = parseInt(qtySpan.textContent, 10) || 1;
      qty = Math.max(1, qty + delta);
      qtySpan.textContent = qty;
  
      // Блокируем «–» при количестве 1
      btnMinus.disabled = qty <= 1;
      btnMinus.style.opacity = qty <= 1 ? "0.4" : "";
  
      recalcSummary();
    }
  
    btnMinus.addEventListener("click", () => updateQty(-1));
    btnPlus.addEventListener("click", () => updateQty(+1));
  
    // Начальное состояние кнопки «–»
    const initQty = parseInt(qtySpan.textContent, 10) || 1;
    btnMinus.disabled = initQty <= 1;
    btnMinus.style.opacity = initQty <= 1 ? "0.4" : "";
  }
  
  // ─── Инициализация ────────────────────────────────────────────────────────────
  
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".basket-item").forEach(initItemControls);
    recalcSummary(); // начальный расчёт на случай, если HTML «хардкодит» цены
  });