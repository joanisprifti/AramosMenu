// JavaScript function to change the language
function changeLanguage() {
  var currentLang = document.documentElement.lang;
  var newLang = currentLang === "en" ? "el" : "en";
  document.documentElement.lang = newLang;

  // Update text content based on the selected language
  var languageButton = document.getElementById("languageButton");
  languageButton.textContent = newLang === "el" ? "Change Language" : "Αλλαγή Γλώσσας";

  // Update text content based on the selected language
  var elements = document.querySelectorAll('[class="en"]');
  for (var i = 0; i < elements.length; i++) {
    elements[i].style.display = newLang === "en" ? "block" : "none";
  }

  elements = document.querySelectorAll('[class="el"]');
  for (var i = 0; i < elements.length; i++) {
    elements[i].style.display = newLang === "el" ? "block" : "none";
  }

  // Update price text
  elements = document.querySelectorAll('.price');
  for (var i = 0; i < elements.length; i++) {
    var priceText = elements[i].textContent;
    var updatedPriceText = currentLang === "en" ? priceText.replace("Price:", "Τιμή:") : priceText.replace("Τιμή:", "Price:");
    elements[i].textContent = updatedPriceText;
  }

  // Update myFooter text
  // elements = document.querySelectorAll('.myFooter');
  // for (var i = 0; i < elements.length; i++) {
  //   var priceText = elements[i].textContent;
  //   var updatedPriceText = currentLang === "en" ? priceText.replace("&copy; 2023 Aramos. All rights reserved.", "Κάτι") : priceText.replace("Κάτι", "&copy; 2023 Aramos. All rights reserved.");
  //   elements[i].textContent = updatedPriceText;
  // }
}
