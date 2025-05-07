// script.js

const menuContainer = document.getElementById('menu');
const toggleBtn    = document.getElementById('lang-toggle');
const foodNoticeText = document.getElementById('food-notice-text');

let currentLang = 'en'; // default

// Multilingual content
const translations = {
    en: {
      toggleBtnText: 'Ελληνικά',
      foodNotice: 'Please inform our staff about any allergies or dietary restrictions before ordering.'
    },
    el: {
      toggleBtnText: 'English',
      foodNotice: 'Παρακαλούμε ενημερώστε το προσωπικό μας για τυχόν αλλεργίες ή διατροφικούς περιορισμούς πριν παραγγείλετε.'
    }
  };

// Load menu.json and render
fetch('./menu.json')
  .then(res => res.json())
  .then(data => {
    window.menuData = data.menu;        // keep for re‑render on language toggle
    toggleBtn.textContent = currentLang === 'el' ? 'English' : 'Ελληνικά'; // ✅ initialize label
    foodNoticeText.textContent = translations[currentLang].foodNotice;
    renderMenu(data.menu, currentLang);
  })
  .catch(err => {
    menuContainer.innerHTML = '<p>Error loading menu.</p>';
    console.error(err);
  });

// Toggle language
toggleBtn.addEventListener('click', () => {
    currentLang = currentLang === 'el' ? 'en' : 'el';
    toggleBtn.textContent = currentLang === 'el' ? 'English' : 'Ελληνικά'; // ✅ update label
    foodNoticeText.textContent = translations[currentLang].foodNotice;
    renderMenu(window.menuData, currentLang);
  });

// Renders the menu into #menu
function renderMenu(menuArray, lang) {
    menuContainer.innerHTML = '';
  
    menuArray.forEach(category => {
      const catEl = document.createElement('section');
      catEl.classList.add('category');
      catEl.innerHTML = `<h2>${category.name[lang]}</h2>`;
  
      const ul = document.createElement('ul');
  
      if (Array.isArray(category.items)) {
        category.items.forEach(item => {
          const li = document.createElement('li');
          let html = `<span class="item-name">${item.name[lang]}</span>`;
          if (item.description) {
            html += `<span class="desc">${item.description[lang]}</span>`;
          }
          const price = Number(item.price);
          if (!isNaN(price)) {
            html += ` <span class="price">${price.toFixed(2)}€</span>`;
          }
          li.innerHTML = html;
          ul.appendChild(li);
        });
      }
  
      catEl.appendChild(ul);
      menuContainer.appendChild(catEl);
    });
  }
  
