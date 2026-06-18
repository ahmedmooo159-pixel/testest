/**
 * Main application logic — بيتزا لذة الملوك
 * Handles rendering, navigation, search, and interactions
 */
(function () {
  "use strict";

  const PLACEHOLDER_IMG = "assets/images/placeholder.svg";
  let activeCategoryId = null;
  let searchTimeout = null;
  let cart = [];
  let orderCounter = Number(localStorage.getItem("orderCounter") || 1000);

  const els = {
    restaurantName: document.getElementById("restaurant-name"),
    welcomeText: document.getElementById("welcome-text"),
    tagline: document.getElementById("tagline"),
    logo: document.querySelector(".logo"),
    phones: document.getElementById("phones"),
    address: document.getElementById("address"),
    categoryNav: document.getElementById("category-nav"),
    menuGrid: document.getElementById("menu-grid"),
    emptyState: document.getElementById("empty-state"),
    categoryNote: document.getElementById("category-note"),
    searchInput: document.getElementById("search-input"),
    footerName: document.getElementById("footer-name"),
    year: document.getElementById("year"),
    whatsappBtn: document.getElementById("whatsapp-btn"),
    facebookBtn: document.getElementById("facebook-btn"),
    footerWhatsappLink: document.getElementById("footer-whatsapp-link"),
    footerFacebookLink: document.getElementById("footer-facebook-link"),
    backToTop: document.getElementById("back-to-top"),
    cartBar: document.getElementById("cart-bar"),
    cartCount: document.getElementById("cart-count"),
    cartTotal: document.getElementById("cart-total"),
    userContact: document.getElementById("user-contact"),
    dailyOfferBanner: document.getElementById("daily-offer-banner"),
    dailyOfferTitle: document.getElementById("daily-offer-title"),
    dailyOfferItem: document.getElementById("daily-offer-item"),
    dailyOfferOldPrice: document.getElementById("daily-offer-old-price"),
    dailyOfferNewPrice: document.getElementById("daily-offer-new-price"),
    dailyOfferNote: document.getElementById("daily-offer-note"),
  };

  /** Format single or multi-size prices */
  function formatPrice(item) {
    if (item.prices) {
      const parts = [];
      if (item.prices.S != null) parts.push("صغير: " + item.prices.S);
      if (item.prices.M != null) parts.push("وسط: " + item.prices.M);
      if (item.prices.L != null) parts.push("كبير: " + item.prices.L);
      if (parts.length === 0) return "اسأل عن السعر";
      return parts.join(" | ") + " ج.م";
    }
    if (item.price != null && item.price !== "") return item.price + " ج.م";
    return "اسأل عن السعر";
  }

  /** Find category by id */
  function getCategory(id) {
    return MENU_DATA.categories.find(function (c) { return c.id === id; });
  }

  /** Get display label for category button */
  function getCategoryLabel(category) {
    return category.nameAr || category.name;
  }

  function resolveImageSrc(image) {
    if (!image || String(image).indexOf("data:image/") === 0) {
      return PLACEHOLDER_IMG;
    }
    return image;
  }

  function getAvailableSizes(item) {
    if (!item.prices) return [];
    return ["S", "M", "L"].filter(function (size) {
      return item.prices[size] != null;
    });
  }

  function getDefaultSize(item) {
    var sizes = getAvailableSizes(item);
    if (sizes.indexOf("M") !== -1) return "M";
    return sizes.length ? sizes[0] : null;
  }

  function getSizeLabel(size) {
    if (size === "S") return "صغير";
    if (size === "M") return "وسط";
    if (size === "L") return "كبير";
    return size || "";
  }

  function getItemDisplayName(item, category) {
    var categoryLabel = category ? getCategoryLabel(category) : "";
    var baseName = item.name || "";
    if (!categoryLabel) return baseName;
    return categoryLabel + " - " + baseName;
  }

  function getCartItemName(item, category, size) {
    var displayName = getItemDisplayName(item, category);
    if (!size) return displayName;
    return displayName + " (" + getSizeLabel(size) + ")";
  }

  function getPriceForSize(item, size) {
    if (item.price != null) return item.price;
    if (item.prices) {
      if (size && item.prices[size] != null) return item.prices[size];
      var defaultSize = getDefaultSize(item);
      if (defaultSize && item.prices[defaultSize] != null) return item.prices[defaultSize];
    }
    return 0;
  }

  function getPriceValue(item) {
    if (item.price != null) return item.price;
    if (item.prices) return getPriceForSize(item, getDefaultSize(item));
    return 0;
  }

  function addToCart(id, name, price, options) {
    var itemKey = options && options.key ? options.key : id;
    var existing = cart.find(function (entry) {
      return entry.key === itemKey;
    });
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ id: id, key: itemKey, name: name, price: price || 0, quantity: 1 });
    }
    updateCartUI();
  }

  function updateCartUI() {
    var count = cart.reduce(function (sum, item) {
      return sum + item.quantity;
    }, 0);
    var total = cart.reduce(function (sum, item) {
      return sum + (item.price || 0) * item.quantity;
    }, 0);

    if (els.cartCount) els.cartCount.textContent = count;
    if (els.cartTotal) els.cartTotal.textContent = total;
    if (els.cartBar) els.cartBar.classList.toggle("active", count > 0);

    var drawer = document.getElementById("cart-drawer");
    if (drawer && drawer.style.display !== "none") {
      renderCartDrawerBody();
    }
  }

  function findItemImage(cartEntry) {
    var baseId = cartEntry.id;
    for (var ci = 0; ci < MENU_DATA.categories.length; ci++) {
      var items = MENU_DATA.categories[ci].items;
      for (var ii = 0; ii < items.length; ii++) {
        if (items[ii].id === baseId) {
          return resolveImageSrc(items[ii].image);
        }
      }
    }
    return PLACEHOLDER_IMG;
  }

  function renderCartDrawerBody() {
    var body = document.getElementById("cart-drawer-body");
    var footer = document.getElementById("cart-drawer-footer");
    var totalEl = document.getElementById("cart-drawer-total-value");
    if (!body) return;

    body.innerHTML = "";

    if (!cart.length) {
      body.innerHTML =
        '<div class="cart-drawer-empty">' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' +
        "<p>السلة فارغة حالياً</p>" +
        "</div>";
      if (footer) footer.style.display = "none";
      return;
    }

    if (footer) footer.style.display = "flex";

    var total = 0;
    cart.forEach(function (entry, index) {
      var imgSrc = findItemImage(entry);
      var subtotal = (entry.price || 0) * entry.quantity;
      total += subtotal;

      var card = document.createElement("div");
      card.className = "cart-item-card";
      card.dataset.index = index;

      card.innerHTML =
        '<img class="cart-item-img" src="' + imgSrc + '" alt="' + entry.name + '" loading="lazy" onerror="this.src=\'' + PLACEHOLDER_IMG + '\'">' +
        '<div class="cart-item-info">' +
          '<div class="cart-item-name" title="' + entry.name + '">' + entry.name + "</div>" +
          '<div class="cart-item-unit-price">سعر الوحدة: ' + (entry.price || 0) + " ج.م</div>" +
          '<div class="cart-item-subtotal" id="subtotal-' + index + '">' + subtotal + " ج.م</div>" +
        "</div>" +
        '<div class="cart-item-controls">' +
          '<div class="cart-qty-controls">' +
            '<button type="button" class="cart-qty-btn" data-action="dec" data-index="' + index + '" aria-label="تقليل الكمية">−</button>' +
            '<span class="cart-qty-value" id="qty-' + index + '">' + entry.quantity + "</span>" +
            '<button type="button" class="cart-qty-btn" data-action="inc" data-index="' + index + '" aria-label="زيادة الكمية">+</button>' +
          "</div>" +
          '<button type="button" class="cart-item-delete" data-index="' + index + '" aria-label="حذف العنصر" title="حذف">🗑</button>' +
        "</div>";

      body.appendChild(card);
    });

    if (totalEl) totalEl.textContent = total + " ج.م";

    body.querySelectorAll(".cart-qty-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(this.dataset.index, 10);
        var action = this.dataset.action;
        if (action === "inc") {
          cart[idx].quantity += 1;
        } else {
          cart[idx].quantity -= 1;
          if (cart[idx].quantity <= 0) {
            cart.splice(idx, 1);
            updateCartUI();
            return;
          }
        }
        updateCartUI();
      });
    });

    body.querySelectorAll(".cart-item-delete").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var idx = parseInt(this.dataset.index, 10);
        cart.splice(idx, 1);
        updateCartUI();
      });
    });
  }

  function syncDrawerContact() {
    var drawerInput = document.getElementById("user-contact-drawer");
    var mainInput = document.getElementById("user-contact");
    if (drawerInput && mainInput && drawerInput.value.trim()) {
      mainInput.value = drawerInput.value.trim();
    }
  }

  function openCartDrawer() {
    var drawer = document.getElementById("cart-drawer");
    if (!drawer) return;
    renderCartDrawerBody();
    drawer.style.display = "flex";
    document.body.style.overflow = "hidden";
  }

  function closeCartDrawer() {
    var drawer = document.getElementById("cart-drawer");
    if (!drawer) return;
    drawer.style.display = "none";
    document.body.style.overflow = "";
  }

  function clearCart() {
    cart = [];
    updateCartUI();
  }

  function getNextOrderNumber() {
    orderCounter += 1;
    localStorage.setItem("orderCounter", orderCounter);
    return orderCounter;
  }

  function sendOrderToWhatsApp() {
    if (!cart.length) return;
    window.openDeliveryModal();
  }

  // متغير مؤقت لحفظ الملاحظات
  var _pendingOrderNotes = '';

  // دالة تأكيد الطلب من مربع الحوار
  window.confirmOrderToWhatsApp = function() {
    if (!cart.length) return;

    var contactInput = document.getElementById('user-contact') ||
                       document.getElementById('user-contact-drawer');
    if (!contactInput || !contactInput.value.trim()) {
      alert('من فضلك ادخل رقم التواصل أولاً');
      return;
    }

    _pendingOrderNotes = document.getElementById('order-notes') ?
                         document.getElementById('order-notes').value.trim() : '';

    window.closeDeliveryModal();

    var deliveryType = document.querySelector('input[name="delivery-type"]:checked').value;
    if (deliveryType === 'delivery') {
      window.openAreaModal();
    } else {
      window.finalizeOrderWithArea(null, 0);
    }
  };

  // دالة إرسال الطلب النهائي بعد اختيار المنطقة
  window.finalizeOrderWithArea = function(area, deliveryFee) {
    if (!cart.length) return;

    var itemsTotal = cart.reduce(function (sum, item) {
      return sum + (item.price || 0) * item.quantity;
    }, 0);

    var grandTotal = itemsTotal + (deliveryFee || 0);

    var messageLines = ["🛒 طلب جديد من قائمة لذة الملوك:", ""];

    cart.forEach(function (entry) {
      messageLines.push("• " + entry.name + " × " + entry.quantity + " = " + ((entry.price || 0) * entry.quantity) + " ج.م");
    });

    messageLines.push("");
    messageLines.push("💰 إجمالي الأصناف: " + itemsTotal + " ج.م");

    if (area) {
      messageLines.push("📍 منطقة التوصيل: " + area);
      messageLines.push("🚗 رسوم التوصيل: " + deliveryFee + " ج.م");
      messageLines.push("🧾 الإجمالي الكلي (شامل الديليفري): " + grandTotal + " ج.م");
    } else {
      messageLines.push("🏪 طريقة الاستلام: استلام من المطعم");
      messageLines.push("🧾 الإجمالي الكلي: " + grandTotal + " ج.م");
    }

    var orderNumber = getNextOrderNumber();
    messageLines.push("🔢 رقم الطلب: " + orderNumber);

    if (els.userContact && els.userContact.value.trim()) {
      messageLines.push("📞 رقم التواصل: " + els.userContact.value.trim());
    }

    if (_pendingOrderNotes) {
      messageLines.push("");
      messageLines.push("📝 ملاحظات: " + _pendingOrderNotes);
    }

    var encodedMessage = encodeURIComponent(messageLines.join("\n"));
    window.open("https://wa.me/201034352138?text=" + encodedMessage, "_blank");
  };

  /** Build a menu card element */
  function createCard(item, index, category) {
    var article = document.createElement("article");
    article.className = "menu-card";
    article.style.animationDelay = Math.min(index * 0.04, 0.4) + "s";

    var displayName = getItemDisplayName(item, category);
    var descHtml = item.description
      ? '<p class="card-desc">' + item.description + "</p>"
      : "";
    var availableSizes = getAvailableSizes(item);
    var defaultSize = getDefaultSize(item);
    var sizePickerHtml = availableSizes.length
      ? '<div class="size-picker" role="group" aria-label="اختيار الحجم">' +
        availableSizes.map(function (size) {
          var isActive = size === defaultSize;
          return '<button type="button" class="size-btn' + (isActive ? " active" : "") + '" data-size="' + size + '" aria-pressed="' + (isActive ? "true" : "false") + '">' + getSizeLabel(size) + "</button>";
        }).join("") +
        "</div>"
      : "";

    article.innerHTML =
      '<div class="card-image-wrap">' +
      '<img src="' + resolveImageSrc(item.image) + '" alt="' + displayName + '" loading="lazy" decoding="async" class="card-image">' +
      "</div>" +
      '<div class="card-body">' +
      '<h3 class="card-title">' + displayName + "</h3>" +
      descHtml +
      '<p class="card-price">' + formatPrice(item) + "</p>" +
      sizePickerHtml +
      '<div class="card-actions">' +
      '<button type="button" class="btn-add-cart ripple-btn">أضف للسلة</button>' +
      "</div>" +
      "</div>";

    var img = article.querySelector(".card-image");
    img.addEventListener("error", function () {
      img.src = PLACEHOLDER_IMG;
      img.classList.add("is-placeholder");
    });

    var addButton = article.querySelector(".btn-add-cart");
    if (addButton) {
      addButton.addEventListener("click", function () {
        var selectedSize = defaultSize;
        var selectedSizeBtn = article.querySelector(".size-btn.active");
        if (selectedSizeBtn) {
          selectedSize = selectedSizeBtn.dataset.size;
        }
        var cartName = getCartItemName(item, category, selectedSize);
        var cartPrice = getPriceForSize(item, selectedSize);
        var cartKey = item.id + (selectedSize ? "-" + selectedSize : "");
        addToCart(item.id, cartName, cartPrice, { key: cartKey });
      });
    }

    var sizeButtons = article.querySelectorAll(".size-btn");
    sizeButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        sizeButtons.forEach(function (btn) {
          btn.classList.remove("active");
          btn.setAttribute("aria-pressed", "false");
        });
        button.classList.add("active");
        button.setAttribute("aria-pressed", "true");
      });
    });

    return article;
  }

  function renderItems(categoryId, itemsOverride) {
    var category = getCategory(categoryId);
    if (!category) return;

    var items = itemsOverride || category.items;
    items = items.filter(function (item) {
      return item.available !== false;
    });
    els.menuGrid.innerHTML = "";
    els.menuGrid.classList.remove("fade-out");

    if (category.note) {
      els.categoryNote.textContent = category.note;
      els.categoryNote.classList.remove("hidden");
    } else {
      els.categoryNote.classList.add("hidden");
    }

    if (!items || items.length === 0) {
      els.emptyState.classList.remove("hidden");
      els.menuGrid.classList.add("hidden");
      return;
    }

    els.emptyState.classList.add("hidden");
    els.menuGrid.classList.remove("hidden");

    var fragment = document.createDocumentFragment();
    items.forEach(function (item, i) {
      fragment.appendChild(createCard(item, i, category));
    });
    els.menuGrid.appendChild(fragment);
  }

  function switchCategory(id) {
    if (id === activeCategoryId) return;
    activeCategoryId = id;

    var buttons = els.categoryNav.querySelectorAll(".cat-btn");
    buttons.forEach(function (btn) {
      var isActive = btn.dataset.category === id;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    els.menuGrid.classList.add("fade-out");

    setTimeout(function () {
      var query = els.searchInput.value.trim().toLowerCase();
      if (query) {
        filterAndRender(query);
      } else {
        renderItems(id);
      }
      els.menuGrid.classList.remove("fade-out");
      els.menuGrid.classList.add("fade-in");
      requestAnimationFrame(function () {
        els.menuGrid.classList.remove("fade-in");
      });
    }, 180);
  }

  function filterAndRender(query) {
    var category = getCategory(activeCategoryId);
    if (!category) return;

    var filtered = category.items.filter(function (item) {
      var name = (item.name || "").toLowerCase();
      var nameEn = (item.nameEn || "").toLowerCase();
      return name.indexOf(query) !== -1 || nameEn.indexOf(query) !== -1;
    });

    renderItems(activeCategoryId, filtered);
  }

  function renderCategories() {
    els.categoryNav.innerHTML = "";
    var fragment = document.createDocumentFragment();

    MENU_DATA.categories.forEach(function (category, index) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-btn ripple-btn" + (index === 0 ? " active" : "");
      btn.dataset.category = category.id;
      btn.textContent = getCategoryLabel(category);
      btn.setAttribute("aria-pressed", index === 0 ? "true" : "false");

      btn.addEventListener("click", function () {
        els.searchInput.value = "";
        switchCategory(category.id);
      });

      fragment.appendChild(btn);
    });

    els.categoryNav.appendChild(fragment);
    activeCategoryId = MENU_DATA.categories[0].id;
    renderItems(activeCategoryId);
  }

  function initHeader() {
    var r = MENU_DATA.restaurant;
    if (els.restaurantName) els.restaurantName.textContent = r.name;
    if (els.welcomeText) els.welcomeText.textContent = r.welcome || "";
    if (els.tagline) els.tagline.textContent = r.tagline || "";
    if (els.footerName) els.footerName.textContent = r.name;
    if (els.year) els.year.textContent = new Date().getFullYear();
    if (els.logo && r.logo) {
      els.logo.src = r.logo;
      els.logo.addEventListener("error", function () {
        els.logo.src = "assets/images/placeholder.svg";
      });
    }

    if (els.phones && r.phones && r.phones.length) {
      els.phones.innerHTML = r.phones
        .map(function (p) {
          return '<a href="tel:' + p + '">' + p + "</a>";
        })
        .join(" &nbsp;|&nbsp; ");
    }

    if (els.address && r.address) {
      els.address.textContent = r.address;
    }
  }

  function initSocialLinks() {
    if (SOCIAL_LINKS.whatsapp) {
      els.whatsappBtn.href = SOCIAL_LINKS.whatsapp;
      if (els.footerWhatsappLink) els.footerWhatsappLink.href = SOCIAL_LINKS.whatsapp;
    } else {
      els.whatsappBtn.classList.add("is-disabled");
      els.whatsappBtn.addEventListener("click", function (e) { e.preventDefault(); });
      if (els.footerWhatsappLink) els.footerWhatsappLink.classList.add("is-disabled");
    }

    if (SOCIAL_LINKS.facebook) {
      els.facebookBtn.href = SOCIAL_LINKS.facebook;
      if (els.footerFacebookLink) els.footerFacebookLink.href = SOCIAL_LINKS.facebook;
    } else {
      els.facebookBtn.classList.add("is-disabled");
      els.facebookBtn.addEventListener("click", function (e) { e.preventDefault(); });
      if (els.footerFacebookLink) els.footerFacebookLink.classList.add("is-disabled");
    }
  }

  function getDailyOffer() {
    try {
      var raw = localStorage.getItem("admin_daily_offer");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch (e) {}

    if (typeof DAILY_OFFER !== "undefined") return DAILY_OFFER;
    return null;
  }

  function initDailyOffer() {
    if (!els.dailyOfferBanner) return;

    var offer = getDailyOffer();

    if (!offer || !offer.active || !offer.item) {
      els.dailyOfferBanner.classList.add("hidden");
      return;
    }

    if (els.dailyOfferTitle) els.dailyOfferTitle.textContent = offer.title || "عرض اليوم";
    if (els.dailyOfferItem) els.dailyOfferItem.textContent = offer.item;

    if (els.dailyOfferOldPrice) {
      if (offer.oldPrice != null && offer.oldPrice !== "") {
        els.dailyOfferOldPrice.textContent = offer.oldPrice + " ج.م";
        els.dailyOfferOldPrice.classList.remove("hidden");
      } else {
        els.dailyOfferOldPrice.textContent = "";
        els.dailyOfferOldPrice.classList.add("hidden");
      }
    }

    if (els.dailyOfferNewPrice) {
      if (offer.newPrice != null && offer.newPrice !== "") {
        els.dailyOfferNewPrice.textContent = offer.newPrice + " ج.م";
      } else {
        els.dailyOfferNewPrice.textContent = "";
      }
    }

    if (els.dailyOfferNote) {
      els.dailyOfferNote.textContent = offer.note || "";
      els.dailyOfferNote.classList.toggle("hidden", !offer.note);
    }

    els.dailyOfferBanner.classList.remove("hidden");
  }

  function initSearch() {
    els.searchInput.addEventListener("input", function (e) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(function () {
        var query = e.target.value.trim().toLowerCase();
        if (!query) {
          renderItems(activeCategoryId);
          return;
        }
        filterAndRender(query);
      }, 150);
    });
  }

  function initBackToTop() {
    window.addEventListener("scroll", function () {
      if (window.scrollY > 400) {
        els.backToTop.classList.add("visible");
      } else {
        els.backToTop.classList.remove("visible");
      }
    }, { passive: true });

    els.backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function scrollActiveCategoryIntoView() {
    var active = els.categoryNav.querySelector(".cat-btn.active");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  function init() {
    initHeader();
    initSocialLinks();
    initDailyOffer();
    renderCategories();
    initSearch();
    initBackToTop();

    els.categoryNav.addEventListener("click", function () {
      setTimeout(scrollActiveCategoryIntoView, 200);
    });
  }

  window.addToCart = addToCart;
  window.sendOrderToWhatsApp = sendOrderToWhatsApp;
  window.clearCart = clearCart;
  window.openCartDrawer = openCartDrawer;
  window.closeCartDrawer = closeCartDrawer;
  window.syncDrawerContact = syncDrawerContact;
  window._getCart = function() { return cart; };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();