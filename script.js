/* =========================================================
   ORIGYN — SINGLE SOURCE OF TRUTH
   Marketplace • Product details • Favorites • Cart • Checkout
   Listing • Navigation • GSAP animations
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const money = value => `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const products = [
    { name: "NeuraVision AI", category: "ai", categoryName: "Artificial Intelligence", description: "An intelligent AI platform designed to automate everyday workflows.", price: 2499, creator: "Origyn Labs", image: "AI" },
    { name: "RoboArm X1", category: "hardware", categoryName: "Hardware", description: "A modular robotic arm built for automation and experimentation.", price: 18999, creator: "Origyn Labs", image: "HW" },
    { name: "DevFlow", category: "software", categoryName: "Software", description: "A developer productivity tool designed to simplify modern workflows.", price: 999, creator: "Origyn Labs", image: "SW" },
    { name: "HomeSense", category: "iot", categoryName: "IoT", description: "Smart sensors that bring intelligent automation to your home.", price: 3499, creator: "Origyn Labs", image: "IOT" },
    { name: "VisionCore", category: "ai", categoryName: "Machine Learning", description: "A computer vision toolkit for developers and researchers.", price: 4999, creator: "Origyn Labs", image: "ML" },
    { name: "CloudForge", category: "iot", categoryName: "Web Technology", description: "Tools for building and deploying modern web applications faster.", price: 1499, creator: "Origyn Labs", image: "WEB" }
  ];

  const categoryNames = { ai: "Artificial Intelligence", hardware: "Hardware", software: "Software", iot: "IoT / Web" };
  const imageLabels = { ai: "AI", hardware: "HW", software: "SW", iot: "IOT" };

  let cart = [];
  let favorites = [];
  let selectedProduct = null;
  let currentCategory = "all";

  const header = $("header");
  const productGrid = $(".product-grid");
  const productSearch = $("#product-search");
  const filterButtons = $$(".filter-btn");
  const productDetails = $("#product-details");
  const cartDrawer = $("#cart-drawer");
  const cartItems = $("#cart-items");
  const checkoutScreen = $("#checkout-screen");
  const checkoutItems = $("#checkout-items");
  const techForm = $("#tech-form");
  const listingPreview = $("#listing-preview");

  /* ========================= NAVIGATION ========================= */
  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const offset = header ? header.offsetHeight + 12 : 90;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }

  $$(".nav-links a").forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      event.preventDefault();
      scrollToSection(href.slice(1));
    });
  });

  $("#explore-btn")?.addEventListener("click", () => scrollToSection("discover"));
  $("#sell-btn")?.addEventListener("click", () => scrollToSection("sell"));
  $("#start-selling-btn")?.addEventListener("click", () => scrollToSection("submit-tech"));

  window.addEventListener("scroll", () => {
    header?.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });

  /* ============================== CART ============================== */
  function renderCheckout() {
    if (!checkoutItems) return;
    checkoutItems.innerHTML = "";
    let total = 0;

    if (!cart.length) {
      checkoutItems.innerHTML = `<p class="empty-checkout">Your cart is empty.</p>`;
    } else {
      cart.forEach(item => {
        const lineTotal = Number(item.price) * Number(item.quantity);
        total += lineTotal;
        const row = document.createElement("div");
        row.className = "checkout-item";
        row.innerHTML = `<div><div class="checkout-item-name">${item.name}</div><div class="checkout-item-quantity">Quantity: ${item.quantity}</div></div><div class="checkout-item-price">${money(lineTotal)}</div>`;
        checkoutItems.appendChild(row);
      });
    }

    $("#checkout-total").textContent = money(total);
  }

  function renderCart() {
    if (!cartItems) return;
    cartItems.innerHTML = "";
    let total = 0;
    let quantity = 0;

    if (!cart.length) {
      cartItems.innerHTML = `<div class="cart-empty"><p>Your cart is empty.</p><span>Discover some technology to get started.</span></div>`;
    } else {
      cart.forEach((item, index) => {
        const lineTotal = Number(item.price) * Number(item.quantity);
        total += lineTotal;
        quantity += Number(item.quantity);

        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `<div class="cart-item-info"><h3>${item.name}</h3><p>${money(item.price)}</p><div class="cart-item-controls"><button type="button" data-cart-action="dec" data-index="${index}">−</button><span>${item.quantity}</span><button type="button" data-cart-action="inc" data-index="${index}">+</button></div></div><strong class="cart-item-price">${money(lineTotal)}</strong><button class="cart-remove" type="button" data-cart-action="remove" data-index="${index}" aria-label="Remove item">×</button>`;
        cartItems.appendChild(row);
      });
    }

    $("#cart-total").textContent = money(total);
    $("#cart-count").textContent = quantity;
    $("#cart-button-count").textContent = quantity;
    renderCheckout();
  }

  function openCart() {
    checkoutScreen?.classList.remove("active");
    cartDrawer?.classList.add("active");
    cartDrawer?.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    cartDrawer?.classList.remove("active");
    cartDrawer?.setAttribute("aria-hidden", "true");
  }

  function addToCart(product) {
    if (!product) return;
    const existing = cart.find(item => item.name === product.name);
    if (existing) existing.quantity += 1;
    else cart.push({ ...product, quantity: 1 });
    renderCart();
    openCart();
  }

  $("#cart-button")?.addEventListener("click", openCart);
  $("#cart-nav")?.addEventListener("click", openCart);
  $("#close-cart")?.addEventListener("click", closeCart);

  cartItems?.addEventListener("click", event => {
    const button = event.target.closest("[data-cart-action]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();

    const index = Number(button.dataset.index);
    const item = cart[index];
    if (!item) return;

    if (button.dataset.cartAction === "inc") item.quantity += 1;
    if (button.dataset.cartAction === "dec") item.quantity -= 1;
    if (button.dataset.cartAction === "remove" || item.quantity <= 0) cart.splice(index, 1);
    renderCart();
  });

  $("#checkout-btn")?.addEventListener("click", event => {
    event.preventDefault();
    if (!cart.length) return alert("Your cart is empty.");
    renderCheckout();
    closeCart();
    checkoutScreen?.classList.add("active");
    checkoutScreen?.setAttribute("aria-hidden", "false");
    window.scrollTo({ top: 0, behavior: "instant" });
  });

  $("#back-to-cart")?.addEventListener("click", event => {
    event.preventDefault();
    checkoutScreen?.classList.remove("active");
    checkoutScreen?.setAttribute("aria-hidden", "true");
    openCart();
  });

  $("#place-order-btn")?.addEventListener("click", event => {
    event.preventDefault();
    const name = $("#checkout-name")?.value.trim();
    const email = $("#checkout-email")?.value.trim();
    const address = $("#checkout-address")?.value.trim();
    const city = $("#checkout-city")?.value.trim();
    const pin = $("#checkout-pincode")?.value.trim();

    if (!name || !email || !address || !city || !/^\d{6}$/.test(pin || "")) {
      alert("Please complete all delivery details and enter a valid 6-digit PIN code.");
      return;
    }

    alert(`Order placed successfully!\n\nThank you, ${name}!`);
    cart = [];
    renderCart();
    checkoutScreen?.classList.remove("active");
    checkoutScreen?.setAttribute("aria-hidden", "true");
    ["#checkout-name", "#checkout-email", "#checkout-address", "#checkout-city", "#checkout-pincode"].forEach(id => {
      const field = $(id);
      if (field) field.value = "";
    });
    scrollToSection("home");
  });

  /* ============================ FAVORITES ============================ */
  function refreshFavoriteButtons() {
    $$(".favorite-product-btn").forEach(button => {
      const active = favorites.some(item => item.name === button.dataset.product);
      button.classList.toggle("active", active);
      button.textContent = active ? "♥" : "♡";
    });
    $("#favorites-count").textContent = favorites.length;
  }

  function toggleFavorite(product) {
    if (!product) return;
    const index = favorites.findIndex(item => item.name === product.name);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push(product);
    refreshFavoriteButtons();
  }

  $("#favorites-nav")?.addEventListener("click", event => {
    event.preventDefault();
    alert(favorites.length ? `You have ${favorites.length} favorite technology item(s).` : "You haven't added any favorites yet.");
  });

  /* ============================= PRODUCTS ============================= */
  function decorateProductCard(card, index) {
    const product = products[index];
    if (!product || !card) return;
    card.dataset.productIndex = index;
    card.dataset.category = product.category;

    if (!card.querySelector(".favorite-product-btn")) {
      const favorite = document.createElement("button");
      favorite.type = "button";
      favorite.className = "favorite-product-btn";
      favorite.dataset.product = product.name;
      favorite.setAttribute("aria-label", `Favorite ${product.name}`);
      favorite.textContent = "♡";
      card.querySelector(".product-image")?.before(favorite);
    }
  }

  $$(".product-card").forEach(decorateProductCard);
  refreshFavoriteButtons();

  productGrid?.addEventListener("click", event => {
    const favorite = event.target.closest(".favorite-product-btn");
    const add = event.target.closest("[data-add-product]");
    const view = event.target.closest("[data-view-product]");

    if (!favorite && !add && !view) return;
    event.preventDefault();
    event.stopPropagation();

    if (favorite) {
      toggleFavorite(products.find(product => product.name === favorite.dataset.product));
      return;
    }
    if (add) {
      addToCart(products[Number(add.dataset.addProduct)]);
      return;
    }
    if (view) openProduct(products[Number(view.dataset.viewProduct)]);
  });

  function openProduct(product) {
    if (!product || !productDetails) return;
    selectedProduct = product;

    $("#detail-image").textContent = product.image;
    $("#detail-category").textContent = product.categoryName.toUpperCase();
    $("#detail-name").textContent = product.name;
    $("#detail-description").textContent = product.description;
    $("#detail-creator").textContent = product.creator;
    $("#detail-price").textContent = money(product.price);

    productDetails.classList.add("active");
    requestAnimationFrame(() => scrollToSection("product-details"));
  }

  $("#back-to-marketplace")?.addEventListener("click", event => {
    event.preventDefault();
    productDetails?.classList.remove("active");
    scrollToSection("discover");
  });

  $("#get-product-btn")?.addEventListener("click", event => {
    event.preventDefault();
    addToCart(selectedProduct);
  });

  function filterProducts() {
    const query = (productSearch?.value || "").trim().toLowerCase();
    $$(".product-card").forEach(card => {
      const product = products[Number(card.dataset.productIndex)];
      if (!product) return;
      const categoryMatch = currentCategory === "all" || product.category === currentCategory;
      const searchMatch = !query || `${product.name} ${product.categoryName} ${product.description}`.toLowerCase().includes(query);
      card.classList.toggle("hidden", !(categoryMatch && searchMatch));
    });
  }

  productSearch?.addEventListener("input", filterProducts);
  filterButtons.forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      filterButtons.forEach(item => item.classList.remove("active"));
      button.classList.add("active");
      currentCategory = button.dataset.category || "all";
      filterProducts();
    });
  });

  /* =========================== LISTING =========================== */
  function getListingData() {
    const name = $("#tech-name")?.value.trim();
    const category = $("#tech-category")?.value;
    const description = $("#tech-description")?.value.trim();
    const price = Number($("#tech-price")?.value);
    const creator = $("#tech-creator")?.value.trim();

    if (!name || !category || !description || !price || price < 0 || !creator) {
      $("#form-message").textContent = "Please complete all fields.";
      return null;
    }
    return { name, category, description, price, creator };
  }

  function updatePreview() {
    const data = getListingData();
    if (!data) return null;

    $("#preview-image").textContent = imageLabels[data.category] || "TECH";
    $("#preview-category").textContent = categoryNames[data.category] || "TECHNOLOGY";
    $("#preview-name").textContent = data.name;
    $("#preview-description").textContent = data.description;
    $("#preview-price").textContent = money(data.price);
    $("#preview-creator").textContent = data.creator;
    listingPreview.style.display = "block";
    $("#form-message").textContent = "Preview updated successfully.";
    return data;
  }

  techForm?.addEventListener("submit", event => {
    event.preventDefault();
    event.stopPropagation();
    const data = updatePreview();
    if (data) listingPreview?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  $("#publish-listing-btn")?.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const data = updatePreview();
    if (!data) return;

    const product = {
      ...data,
      categoryName: categoryNames[data.category] || "Technology",
      image: imageLabels[data.category] || "TECH"
    };

    products.push(product);
    const index = products.length - 1;
    renderDynamicProduct(product, index);
    decorateProductCard(productGrid.lastElementChild, index);
    filterProducts();
    refreshFavoriteButtons();

    $("#form-message").textContent = "Published to the marketplace successfully.";
    techForm.reset();
    listingPreview.style.display = "none";
    scrollToSection("discover");
  });

  function renderDynamicProduct(product, index) {
    if (!productGrid) return;
    const article = document.createElement("article");
    article.className = "product-card";
    article.dataset.productIndex = index;
    article.dataset.category = product.category;
    article.innerHTML = `<div class="product-image">${product.image}</div><div class="product-content"><p class="product-category">${product.categoryName}</p><h3>${product.name}</h3><p>${product.description}</p><div class="product-bottom"><strong>${money(product.price)}</strong><div class="product-actions"><a href="#product-details" data-view-product="${index}">View Product →</a><button type="button" class="add-to-cart-btn" data-add-product="${index}">Add to Cart</button></div></div></div>`;
    productGrid.appendChild(article);
  }

  /* ========================== KEYBOARD ========================== */
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    closeCart();
    checkoutScreen?.classList.remove("active");
    productDetails?.classList.remove("active");
  });

  renderCart();
  filterProducts();

  /* ===============================================================
     GSAP — ONE ANIMATION SYSTEM ONLY
     The delivery scene has ONE timeline and ONE ScrollTrigger.
  =============================================================== */
  function initAnimations() {
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.warn("Origyn: GSAP/ScrollTrigger unavailable. Static UI remains usable.");
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    /* Navigation and hero controls are never left hidden. */
    gsap.set("header, .nav-links, .nav-links a, .nav-links button, .hero-buttons, .hero-buttons button", { autoAlpha: 1 });

    /* HERO */
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".logo", { y: -20, autoAlpha: 0, duration: 0.55 })
      .from(".nav-links a, .nav-links button", { y: -12, autoAlpha: 0, duration: 0.3, stagger: 0.045 }, "-=0.25")
      .from("#home h1", { y: 55, autoAlpha: 0, duration: 0.7 }, "-=0.1")
      .from("#home p", { y: 25, autoAlpha: 0, duration: 0.45 }, "-=0.35")
      .from(".hero-buttons button", { y: 20, autoAlpha: 0, duration: 0.4, stagger: 0.08 }, "-=0.2");

    /* MARKETPLACE */
    gsap.from(".product-card", {
      y: 55,
      autoAlpha: 0,
      duration: 0.65,
      stagger: 0.1,
      ease: "power3.out",
      scrollTrigger: { trigger: "#discover", start: "top 78%", once: true }
    });

    /* OTHER SECTIONS */
    gsap.from(".sell-content", {
      x: -50, autoAlpha: 0, duration: 0.75, ease: "power3.out",
      scrollTrigger: { trigger: "#sell", start: "top 75%", once: true }
    });
    gsap.from(".sell-step", {
      y: 35, autoAlpha: 0, duration: 0.55, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ".sell-steps", start: "top 82%", once: true }
    });
    gsap.from(".about-heading", {
      x: -50, autoAlpha: 0, duration: 0.7,
      scrollTrigger: { trigger: "#about", start: "top 75%", once: true }
    });
    gsap.from(".about-text", {
      y: 35, autoAlpha: 0, duration: 0.6,
      scrollTrigger: { trigger: ".about-text", start: "top 82%", once: true }
    });
    gsap.from(".about-stat", {
      y: 35, autoAlpha: 0, duration: 0.55, stagger: 0.12,
      scrollTrigger: { trigger: ".about-stats", start: "top 82%", once: true }
    });
    gsap.from(".contact-content", {
      y: 50, autoAlpha: 0, duration: 0.75,
      scrollTrigger: { trigger: "#contact", start: "top 78%", once: true }
    });

    /* STORY — SINGLE TIMELINE, SINGLE TRIGGER. */
    const story = $("#story");
    const man = $(".delivery-man");
    const box = $(".delivery-box");
    const rock = $(".rock");
    const tech = $$(".tech-item");

    if (story && man && box && rock && tech.length) {
      gsap.set(man, { x: -160, y: 0, rotation: 0, autoAlpha: 1 });
      gsap.set(box, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1 });
      gsap.set(rock, { x: 90, autoAlpha: 1 });
      gsap.set(tech, { y: 55, scale: 0.72, autoAlpha: 0 });

      const storyTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: story,
          start: "top top",
          end: "+=1800",
          scrub: 0.8,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });

      /* 1. Walk */
      storyTimeline.to(man, { x: 0, duration: 2.2, ease: "power1.inOut" });

      /* 2. Collision — once */
      storyTimeline.to(man, { x: 18, rotation: -9, duration: 0.18, ease: "power2.out" });
      storyTimeline.to(man, { x: 5, y: 14, rotation: 8, duration: 0.18, ease: "power2.inOut" });
      storyTimeline.to(man, { x: 0, y: 0, rotation: 0, duration: 0.3, ease: "back.out(1.4)" });

      /* 3. Box reaction — once */
      storyTimeline.to(box, { x: 330, rotation: -12, scale: 1.1, duration: 0.8, ease: "power2.inOut" }, ">+0.12");
      storyTimeline.to(box, { rotation: 10, scale: 1, duration: 0.25, ease: "power2.inOut" });
      storyTimeline.to(box, { rotation: 0, duration: 0.15 });

      /* 4. Technology reveal — once */
      storyTimeline.to(tech, { y: 0, autoAlpha: 1, scale: 1, duration: 0.45, stagger: 0.28, ease: "back.out(1.6)" }, ">+0.12");
    }

    ScrollTrigger.refresh();
  }

  if (document.readyState === "complete") initAnimations();
  else window.addEventListener("load", initAnimations, { once: true });

  console.log("Origyn ready — one script, one animation system, stable navigation.");
});
