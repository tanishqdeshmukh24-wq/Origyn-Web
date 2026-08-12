/* =========================================================
   ORIGYN — CLEAN APPLICATION SCRIPT
   One state layer • one event layer • one animation layer
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
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
  let storyAnimated = false;
  let heroAnimated = false;

  const header = $("header");
  const productGrid = $(".product-grid");
  const productDetails = $("#product-details");
  const cartDrawer = $("#cart-drawer");
  const checkoutScreen = $("#checkout-screen");
  const listingPreview = $("#listing-preview");

  /* =========================================================
     NAVIGATION
  ========================================================= */
  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const offset = header ? header.offsetHeight + 15 : 90;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  }

  $$(".nav-links a").forEach(link => {
    link.addEventListener("click", e => {
      const href = link.getAttribute("href");
      if (!href?.startsWith("#")) return;
      e.preventDefault();
      scrollToSection(href.slice(1));
    });
  });

  $("#explore-btn")?.addEventListener("click", () => scrollToSection("discover"));
  $("#sell-btn")?.addEventListener("click", () => scrollToSection("sell"));
  $("#start-selling-btn")?.addEventListener("click", () => scrollToSection("submit-tech"));

  window.addEventListener("scroll", () => {
    header?.classList.toggle("scrolled", window.scrollY > 30);
  }, { passive: true });

  /* =========================================================
     CART
  ========================================================= */
  function renderCheckout() {
    const container = $("#checkout-items");
    if (!container) return;
    container.innerHTML = "";
    let total = 0;

    if (!cart.length) {
      container.innerHTML = `<p class="empty-checkout">Your cart is empty.</p>`;
    } else {
      cart.forEach(item => {
        const lineTotal = Number(item.price) * Number(item.quantity);
        total += lineTotal;
        const row = document.createElement("div");
        row.className = "checkout-item";
        row.innerHTML = `<div><div class="checkout-item-name">${item.name}</div><div class="checkout-item-quantity">Quantity: ${item.quantity}</div></div><div class="checkout-item-price">${money(lineTotal)}</div>`;
        container.appendChild(row);
      });
    }

    $("#checkout-total").textContent = money(total);
  }

  function renderCart() {
    const container = $("#cart-items");
    if (!container) return;
    container.innerHTML = "";
    let total = 0;
    let quantity = 0;

    if (!cart.length) {
      container.innerHTML = `<div class="cart-empty"><p>Your cart is empty.</p><span>Discover some technology to get started.</span></div>`;
    } else {
      cart.forEach((item, index) => {
        const lineTotal = Number(item.price) * Number(item.quantity);
        total += lineTotal;
        quantity += Number(item.quantity);
        const row = document.createElement("div");
        row.className = "cart-item";
        row.innerHTML = `<div class="cart-item-info"><h3>${item.name}</h3><p>${money(item.price)}</p><div class="cart-item-controls"><button type="button" data-cart-action="dec" data-index="${index}">−</button><span>${item.quantity}</span><button type="button" data-cart-action="inc" data-index="${index}">+</button></div></div><strong class="cart-item-price">${money(lineTotal)}</strong><button class="cart-remove" type="button" data-cart-action="remove" data-index="${index}">×</button>`;
        container.appendChild(row);
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

  $("#cart-items")?.addEventListener("click", e => {
    const button = e.target.closest("[data-cart-action]");
    if (!button) return;
    e.preventDefault();
    e.stopPropagation();
    const index = Number(button.dataset.index);
    const item = cart[index];
    if (!item) return;
    if (button.dataset.cartAction === "inc") item.quantity += 1;
    if (button.dataset.cartAction === "dec") item.quantity -= 1;
    if (button.dataset.cartAction === "remove" || item.quantity <= 0) cart.splice(index, 1);
    renderCart();
  });

  $("#checkout-btn")?.addEventListener("click", e => {
    e.preventDefault();
    if (!cart.length) return alert("Your cart is empty.");
    renderCheckout();
    closeCart();
    checkoutScreen?.classList.add("active");
    checkoutScreen?.setAttribute("aria-hidden", "false");
    window.scrollTo({ top: 0, behavior: "auto" });
  });

  $("#back-to-cart")?.addEventListener("click", e => {
    e.preventDefault();
    checkoutScreen?.classList.remove("active");
    checkoutScreen?.setAttribute("aria-hidden", "true");
    openCart();
  });

  $("#place-order-btn")?.addEventListener("click", e => {
    e.preventDefault();
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
    ["checkout-name", "checkout-email", "checkout-address", "checkout-city", "checkout-pincode"].forEach(id => {
      const field = document.getElementById(id);
      if (field) field.value = "";
    });
    scrollToSection("home");
  });

  /* =========================================================
     FAVORITES
  ========================================================= */
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

  $("#favorites-nav")?.addEventListener("click", e => {
    e.preventDefault();
    alert(favorites.length ? `You have ${favorites.length} favorite technology item(s).` : "You haven't added any favorites yet.");
  });

  /* =========================================================
     MARKETPLACE
  ========================================================= */
  function decorateProductCard(card, index) {
    const product = products[index];
    if (!card || !product) return;
    card.dataset.productIndex = index;
    card.dataset.category = product.category;
    if (!card.querySelector(".favorite-product-btn")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "favorite-product-btn";
      button.dataset.product = product.name;
      button.textContent = "♡";
      button.setAttribute("aria-label", `Favorite ${product.name}`);
      card.querySelector(".product-image")?.before(button);
    }
  }

  $$(".product-card").forEach(decorateProductCard);
  refreshFavoriteButtons();

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
    setTimeout(() => scrollToSection("product-details"), 20);
  }

  productGrid?.addEventListener("click", e => {
    const favorite = e.target.closest(".favorite-product-btn");
    const add = e.target.closest("[data-add-product]");
    const view = e.target.closest("[data-view-product]");
    if (!favorite && !add && !view) return;
    e.preventDefault();
    e.stopPropagation();
    if (favorite) return toggleFavorite(products.find(p => p.name === favorite.dataset.product));
    if (add) return addToCart(products[Number(add.dataset.addProduct)]);
    if (view) return openProduct(products[Number(view.dataset.viewProduct)]);
  });

  $("#back-to-marketplace")?.addEventListener("click", e => {
    e.preventDefault();
    productDetails?.classList.remove("active");
    scrollToSection("discover");
  });

  $("#get-product-btn")?.addEventListener("click", e => {
    e.preventDefault();
    addToCart(selectedProduct);
  });

  function filterProducts() {
    const query = ($( "#product-search")?.value || "").trim().toLowerCase();
    $$(".product-card").forEach(card => {
      const product = products[Number(card.dataset.productIndex)];
      if (!product) return;
      const categoryMatch = currentCategory === "all" || product.category === currentCategory;
      const text = `${product.name} ${product.categoryName} ${product.description}`.toLowerCase();
      card.classList.toggle("hidden", !(categoryMatch && (!query || text.includes(query))));
    });
  }

  $("#product-search")?.addEventListener("input", filterProducts);
  $$(".filter-btn").forEach(button => {
    button.addEventListener("click", e => {
      e.preventDefault();
      $$(".filter-btn").forEach(b => b.classList.remove("active"));
      button.classList.add("active");
      currentCategory = button.dataset.category || "all";
      filterProducts();
    });
  });

  /* =========================================================
     LISTING
  ========================================================= */
  function readListing() {
    const name = $("#tech-name")?.value.trim();
    const category = $("#tech-category")?.value;
    const description = $("#tech-description")?.value.trim();
    const priceRaw = $("#tech-price")?.value;
    const creator = $("#tech-creator")?.value.trim();
    const price = Number(priceRaw);
    if (!name || !category || !description || priceRaw === "" || price < 0 || !creator) {
      $("#form-message").textContent = "Please complete all fields.";
      return null;
    }
    return { name, category, description, price, creator };
  }

  function updatePreview() {
    const data = readListing();
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

  $("#tech-form")?.addEventListener("submit", e => {
    e.preventDefault();
    e.stopPropagation();
    if (updatePreview()) listingPreview?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  $("#publish-listing-btn")?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    const data = updatePreview();
    if (!data) return;
    const product = { ...data, categoryName: categoryNames[data.category] || "Technology", image: imageLabels[data.category] || "TECH" };
    products.push(product);
    const index = products.length - 1;
    renderDynamicProduct(product, index);
    decorateProductCard(productGrid.lastElementChild, index);
    refreshFavoriteButtons();
    filterProducts();
    $("#form-message").textContent = "Published to the marketplace successfully.";
    $("#tech-form").reset();
    listingPreview.style.display = "none";
    scrollToSection("discover");
  });

  function renderDynamicProduct(product, index) {
    if (!productGrid) return;
    const article = document.createElement("article");
    article.className = "product-card";
    article.innerHTML = `<div class="product-image">${product.image}</div><div class="product-content"><p class="product-category">${product.categoryName}</p><h3>${product.name}</h3><p>${product.description}</p><div class="product-bottom"><strong>${money(product.price)}</strong><div class="product-actions"><a href="#product-details" data-view-product="${index}">View Product →</a><button type="button" class="add-to-cart-btn" data-add-product="${index}">Add to Cart</button></div></div></div>`;
    productGrid.appendChild(article);
  }

  /* =========================================================
     KEYBOARD
  ========================================================= */
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    closeCart();
    checkoutScreen?.classList.remove("active");
    productDetails?.classList.remove("active");
  });

  /* =========================================================
     ANIMATIONS
     No pinning. No duplicate timelines. No autoAlpha on buttons.
  ========================================================= */
  function initAnimations() {
    if (heroAnimated) return;
    heroAnimated = true;

    /* Defensive visibility: UI controls can never remain hidden. */
    gsap?.set?.("header, .nav-links, .nav-links a, .nav-links button, .hero-buttons, .hero-buttons button", { clearProps: "opacity,visibility,transform" });

    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    /* HERO: only text animates. Buttons stay visible and clickable. */
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".logo", { y: -18, autoAlpha: 0, duration: 0.5 })
      .from("#home h1", { y: 45, autoAlpha: 0, duration: 0.65 }, "-=0.2")
      .from("#home > p", { y: 22, autoAlpha: 0, duration: 0.4 }, "-=0.25");

    /* Buttons are explicitly made visible after the intro. */
    gsap.set(".hero-buttons, .hero-buttons button", { autoAlpha: 1, clearProps: "transform" });

    gsap.from(".product-card", {
      y: 40, autoAlpha: 0, duration: 0.55, stagger: 0.08, ease: "power3.out",
      scrollTrigger: { trigger: "#discover", start: "top 80%", once: true }
    });

    gsap.from(".sell-content", {
      x: -45, autoAlpha: 0, duration: 0.65,
      scrollTrigger: { trigger: "#sell", start: "top 78%", once: true }
    });

    gsap.from(".sell-step", {
      y: 30, autoAlpha: 0, duration: 0.5, stagger: 0.1,
      scrollTrigger: { trigger: ".sell-steps", start: "top 82%", once: true }
    });

    gsap.from(".about-heading", {
      x: -45, autoAlpha: 0, duration: 0.65,
      scrollTrigger: { trigger: "#about", start: "top 78%", once: true }
    });

    gsap.from(".about-text", {
      y: 30, autoAlpha: 0, duration: 0.55,
      scrollTrigger: { trigger: ".about-text", start: "top 82%", once: true }
    });

    gsap.from(".about-stat", {
      y: 30, autoAlpha: 0, duration: 0.5, stagger: 0.1,
      scrollTrigger: { trigger: ".about-stats", start: "top 82%", once: true }
    });

    gsap.from(".contact-content", {
      y: 35, autoAlpha: 0, duration: 0.65,
      scrollTrigger: { trigger: "#contact", start: "top 80%", once: true }
    });

    /* STORY: one entrance trigger, one timeline, one execution. */
    const story = $("#story");
    const man = $(".delivery-man");
    const box = $(".delivery-box");
    const rock = $(".rock");
    const tech = $$(".tech-item");

    if (!story || !man || !box || !rock || tech.length || storyAnimated) {
      // handled below when all story elements exist
    }

    if (story && man && box && rock && tech.length && !storyAnimated) {
      storyAnimated = true;
      gsap.set(man, { x: -140, y: 0, rotation: 0, autoAlpha: 1 });
      gsap.set(box, { x: 0, y: 0, rotation: 0, scale: 1, autoAlpha: 1 });
      gsap.set(rock, { x: 0, autoAlpha: 1 });
      gsap.set(tech, { y: 35, scale: 0.82, autoAlpha: 0 });

      const tl = gsap.timeline({
        paused: true,
        defaults: { overwrite: "auto" },
        onComplete: () => { story.dataset.animationComplete = "true"; }
      });

      tl.to(man, { x: 0, duration: 1.25, ease: "power1.inOut" })
        .to(man, { x: 15, rotation: -8, duration: 0.12, ease: "power2.out" })
        .to(man, { x: 2, y: 12, rotation: 7, duration: 0.12, ease: "power2.inOut" })
        .to(man, { x: 0, y: 0, rotation: 0, duration: 0.18, ease: "back.out(1.5)" })
        .to(box, { x: 260, rotation: -10, scale: 1.08, duration: 0.55, ease: "power2.inOut" }, "-=0.05")
        .to(box, { rotation: 5, duration: 0.16 })
        .to(box, { rotation: 0, scale: 1, duration: 0.12 })
        .to(tech, { y: 0, scale: 1, autoAlpha: 1, duration: 0.38, stagger: 0.16, ease: "back.out(1.6)" }, ">0.08");

      ScrollTrigger.create({
        trigger: story,
        start: "top 72%",
        once: true,
        onEnter: () => tl.play()
      });
    }

    ScrollTrigger.refresh();
  }

  renderCart();
  filterProducts();
  window.addEventListener("load", initAnimations, { once: true });
  if (document.readyState === "complete") initAnimations();

  console.log("Origyn initialized — clean state, navigation, marketplace, cart and animations.");
});