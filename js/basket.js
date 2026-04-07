/* KOH HOUSE — Basket JavaScript (to be built) */

'use strict';

const BASKET_KEY = 'koh_basket';

function getBasket() {
  try {
    return JSON.parse(
      localStorage.getItem(BASKET_KEY)
    ) || [];
  } catch { return []; }
}

function saveBasket(basket) {
  localStorage.setItem(BASKET_KEY, JSON.stringify(basket));
}

function clearBasket() {
  localStorage.removeItem(BASKET_KEY);
}

function getBasketCount() {
  return getBasket().length;
}

function getBasketTotal() {
  return getBasket().reduce((sum, item) =>
    sum + item.price, 0
  );
}

function isInBasket(id) {
  return getBasket().some(item => item.id === id);
}

function addToBasket(artwork) {
  if (isInBasket(artwork.id)) {
    showBasketToast('Already in your basket', 'info');
    return;
  }
  const basket = getBasket();
  basket.push({
    id: artwork.id,
    title: artwork.title,
    artist: artwork.artist,
    price: artwork.price,
    imageUrl: artwork.imageUrl,
    edition: artwork.edition || ''
  });
  saveBasket(basket);
  showBasketToast(
    `${artwork.title} added to basket`, 'success'
  );
  updateNavBasketCount();
}

function removeFromBasket(id) {
  const basket = getBasket().filter(item => item.id !== id);
  saveBasket(basket);
  updateNavBasketCount();
  return basket;
}

function updateNavBasketCount() {
  const count = getBasketCount();
  document.querySelectorAll('#basket-count').forEach(el => {
    el.textContent = count;
    if (count > 0) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

function formatPrice(n) {
  return '£' + Number(n).toLocaleString('en-GB');
}

function showBasketToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavBasketCount();
});
