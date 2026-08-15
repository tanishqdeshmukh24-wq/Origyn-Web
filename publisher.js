/* ORIGYN PUBLISHER — seller-only experience */
document.addEventListener("DOMContentLoaded", () => {
  "use strict";
  const $ = (selector) => document.querySelector(selector);
  const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
  const commissionRates = { technology: 0.08, fashion: 0.12, home: 0.10, gaming: 0.12, beauty: 0.12, sports: 0.10, automotive: 0.08, books: 0.08, toys: 0.12, jewellery: 0.15, kitchen: 0.10, art: 0.12, pets: 0.10, garden: 0.10, other: 0.10 };
  const categoryLabels = { technology: "Technology", fashion: "Fashion", home: "Home & Living", gaming: "Gaming", beauty: "Beauty & Personal Care", sports: "Sports & Fitness", automotive: "Automotive", books: "Books & Education", toys: "Toys & Hobbies", jewellery: "Jewellery & Accessories", kitchen: "Kitchen & Appliances", art: "Art & Collectibles", pets: "Pet Supplies", garden: "Garden & Outdoor", other: "Other" };
  const typeLabels = { physical: "Physical Product", digital: "Digital Product", software: "Software", ai_model: "AI Model", dataset: "Dataset", api: "API / Developer Tool", service: "Service", other: "Other" };
  const imageLabels = { technology: "TECH", fashion: "FASHION", home: "HOME", gaming: "GAME", beauty: "BEAUTY", sports: "SPORT", automotive: "AUTO", books: "BOOK", toys: "TOY", jewellery: "JEWEL", kitchen: "KITCHEN", art: "ART", pets: "PETS", garden: "GARDEN", other: "OTHER" };
  const header = $("header"), form = $("#product-form"), preview = $("#listing-preview");
  let currentListing = null;
  let imageUrls = [];
  let activeImageIndex = 0;

  function scrollToSection(id) { const target = document.getElementById(id); if (!target) return; const offset = header ? header.offsetHeight + 15 : 90; window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" }); }
  function scrollToPreview() {
    if (!preview) return;
    const headerOffset = header ? header.offsetHeight + 30 : 110;
    const targetTop = preview.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  }
  document.querySelectorAll(".nav-links a").forEach(link => link.addEventListener("click", event => { const href = link.getAttribute("href"); if (!href?.startsWith("#")) return; event.preventDefault(); scrollToSection(href.slice(1)); }));
  document.querySelectorAll("[data-target]").forEach(button => button.addEventListener("click", () => scrollToSection(button.dataset.target.replace("#", ""))));
  const guideDots = [...document.querySelectorAll(".guide-dot")];
  const sections = ["home", "story", "sell", "publish", "about", "contact"].map(id => document.getElementById(id)).filter(Boolean);
  if ("IntersectionObserver" in window) { const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) guideDots.forEach(dot => dot.classList.toggle("active", dot.dataset.target === `#${entry.target.id}`)); }), { rootMargin: "-35% 0px -55% 0px", threshold: 0 }); sections.forEach(section => observer.observe(section)); }
  $("#publish-btn")?.addEventListener("click", () => scrollToSection("publish")); $("#start-selling-btn")?.addEventListener("click", () => scrollToSection("publish")); $("#learn-btn")?.addEventListener("click", () => scrollToSection("how-it-works"));
  window.addEventListener("scroll", () => header?.classList.toggle("scrolled", window.scrollY > 30), { passive: true });

  function renderGallery() {
    const previewImage = $("#preview-image"), dots = $("#preview-dots");
    if (!previewImage) return;
    const hasImages = imageUrls.length > 0;
    const activeUrl = imageUrls[activeImageIndex];
    if (hasImages) {
      previewImage.style.backgroundImage = `url("${activeUrl}")`;
      previewImage.classList.add("has-product-image");
      previewImage.querySelector("span")?.replaceChildren();
      previewImage.querySelector("small")?.replaceChildren();
      dots.innerHTML = imageUrls.map((_, index) => `<button type="button" class="gallery-dot ${index === activeImageIndex ? "active" : ""}" data-index="${index}" aria-label="Show image ${index + 1}"></button>`).join("");
      dots.querySelectorAll(".gallery-dot").forEach(dot => dot.addEventListener("click", () => { activeImageIndex = Number(dot.dataset.index); renderGallery(); }));
    } else {
      previewImage.style.backgroundImage = "";
      previewImage.classList.remove("has-product-image");
      dots.innerHTML = "";
      const data = currentListing;
      const label = previewImage.querySelector("span"), small = previewImage.querySelector("small");
      if (label) label.textContent = data?.image || "PRODUCT";
      if (small) small.textContent = "ORIGYN";
    }
    $("#preview-prev").hidden = imageUrls.length < 2;
    $("#preview-next").hidden = imageUrls.length < 2;
  }

  function readForm() {
    const data = { name: $("#product-name")?.value.trim(), category: $("#product-category")?.value, type: $("#product-type")?.value, description: $("#product-description")?.value.trim(), priceRaw: $("#product-price")?.value, creator: $("#product-creator")?.value.trim() };
    const price = Number(data.priceRaw);
    if (!data.name || !data.category || !data.type || !data.description || data.priceRaw === "" || !Number.isFinite(price) || price < 0 || !data.creator) { $("#form-message").textContent = "Complete every required field before previewing your product."; return null; }
    const rate = commissionRates[data.category] ?? 0.10, commission = price * rate;
    return { ...data, price, categoryLabel: categoryLabels[data.category] || "Other", typeLabel: typeLabels[data.type] || "Other", image: imageLabels[data.category] || "OTHER", imageUrls: [...imageUrls], rate, commission, sellerAmount: price - commission };
  }

  function updatePreview() {
    const data = readForm(); if (!data) return null; currentListing = data;
    renderGallery();
    $("#preview-category").textContent = `${data.categoryLabel.toUpperCase()} · ${data.typeLabel.toUpperCase()}`;
    $("#preview-name").textContent = data.name;
    $("#preview-description").textContent = data.description;
    $("#preview-price").textContent = money(data.price);
    $("#preview-creator").textContent = data.creator;
    $("#preview-commission").textContent = `${Math.round(data.rate * 100)}% · ${money(data.commission)}`;
    $("#preview-payout").textContent = money(data.sellerAmount);
    preview.style.display = "block";
    $("#form-message").textContent = "Preview ready. Review the listing and commission before publishing.";
    return data;
  }

  $("#product-images")?.addEventListener("change", event => {
    imageUrls.forEach(url => URL.revokeObjectURL(url));
    imageUrls = [...(event.target.files || [])].slice(0, 6).filter(file => ["image/png", "image/jpeg", "image/webp"].includes(file.type)).map(file => URL.createObjectURL(file));
    activeImageIndex = 0;
    const files = [...(event.target.files || [])].slice(0, 6);
    const title = $("#image-upload-title");
    if (title) title.textContent = files.length ? `${files.length} image${files.length === 1 ? "" : "s"} selected` : "Add product images";
    const thumbs = $("#image-thumbnails");
    thumbs.innerHTML = files.map((file, index) => `<button type="button" class="image-thumb ${index === 0 ? "active" : ""}" data-index="${index}" title="${file.name}"><img src="${imageUrls[index]}" alt="Product image ${index + 1}"><span>${index === 0 ? "MAIN" : index + 1}</span></button>`).join("");
    thumbs.querySelectorAll(".image-thumb").forEach(button => button.addEventListener("click", () => { activeImageIndex = Number(button.dataset.index); thumbs.querySelectorAll(".image-thumb").forEach(item => item.classList.toggle("active", item === button)); renderGallery(); }));
    renderGallery();
    $("#form-message").textContent = files.length ? `${files.length} product image${files.length === 1 ? "" : "s"} ready for preview.` : "No product images selected.";
    if (currentListing) updatePreview();
  });

  $("#preview-prev")?.addEventListener("click", () => { if (imageUrls.length < 2) return; activeImageIndex = (activeImageIndex - 1 + imageUrls.length) % imageUrls.length; renderGallery(); });
  $("#preview-next")?.addEventListener("click", () => { if (imageUrls.length < 2) return; activeImageIndex = (activeImageIndex + 1) % imageUrls.length; renderGallery(); });
  form?.addEventListener("submit", event => { event.preventDefault(); if (updatePreview()) { window.setTimeout(scrollToPreview, 80); } });
  $("#publish-listing-btn")?.addEventListener("click", event => { event.preventDefault(); const data = currentListing || updatePreview(); if (!data) return; $("#form-message").textContent = `Ready to publish “${data.name}”. API connection will submit this listing to Origyn.`; $("#publish-status")?.classList.add("visible"); });
  $("#product-category")?.addEventListener("change", () => { if (currentListing) updatePreview(); }); $("#product-type")?.addEventListener("change", () => { if (currentListing) updatePreview(); }); $("#product-price")?.addEventListener("input", () => { if (currentListing) updatePreview(); });
  renderGallery();
});
