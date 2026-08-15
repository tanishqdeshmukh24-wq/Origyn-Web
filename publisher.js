/* ORIGYN PUBLISHER — seller-only experience */
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

  const commissionRates = { technology: 0.08, fashion: 0.12, home: 0.10, gaming: 0.12, beauty: 0.12, sports: 0.10, automotive: 0.08, books: 0.08, toys: 0.12, jewellery: 0.15, kitchen: 0.10, art: 0.12, pets: 0.10, garden: 0.10, other: 0.10 };
  const categoryLabels = { technology: "Technology", fashion: "Fashion", home: "Home & Living", gaming: "Gaming", beauty: "Beauty & Personal Care", sports: "Sports & Fitness", automotive: "Automotive", books: "Books & Education", toys: "Toys & Hobbies", jewellery: "Jewellery & Accessories", kitchen: "Kitchen & Appliances", art: "Art & Collectibles", pets: "Pet Supplies", garden: "Garden & Outdoor", other: "Other" };
  const typeLabels = { physical: "Physical Product", digital: "Digital Product", software: "Software", ai_model: "AI Model", dataset: "Dataset", api: "API / Developer Tool", service: "Service", other: "Other" };
  const imageLabels = { technology: "TECH", fashion: "FASHION", home: "HOME", gaming: "GAME", beauty: "BEAUTY", sports: "SPORT", automotive: "AUTO", books: "BOOK", toys: "TOY", jewellery: "JEWEL", kitchen: "KITCHEN", art: "ART", pets: "PETS", garden: "GARDEN", other: "OTHER" };

  const header = $("header");
  const form = $("#product-form");
  const preview = $("#listing-preview");
  let currentListing = null;

  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const offset = header ? header.offsetHeight + 15 : 90;
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: "smooth" });
  }

  document.querySelectorAll(".nav-links a").forEach(link => {
    link.addEventListener("click", event => {
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;
      event.preventDefault();
      scrollToSection(href.slice(1));
    });
  });

  document.querySelectorAll("[data-target]").forEach(button => {
    button.addEventListener("click", () => scrollToSection(button.dataset.target.replace("#", "")));
  });

  const guideDots = [...document.querySelectorAll(".guide-dot")];
  const sections = ["home", "story", "sell", "publish", "about", "contact"].map(id => document.getElementById(id)).filter(Boolean);

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        guideDots.forEach(dot => dot.classList.toggle("active", dot.dataset.target === `#${entry.target.id}`));
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
    sections.forEach(section => observer.observe(section));
  }

  $("#publish-btn")?.addEventListener("click", () => scrollToSection("publish"));
  $("#start-selling-btn")?.addEventListener("click", () => scrollToSection("publish"));
  $("#learn-btn")?.addEventListener("click", () => scrollToSection("how-it-works"));

  window.addEventListener("scroll", () => header?.classList.toggle("scrolled", window.scrollY > 30), { passive: true });

  function readForm() {
    const data = { name: $("#product-name")?.value.trim(), category: $("#product-category")?.value, type: $("#product-type")?.value, description: $("#product-description")?.value.trim(), priceRaw: $("#product-price")?.value, creator: $("#product-creator")?.value.trim() };
    const price = Number(data.priceRaw);
    if (!data.name || !data.category || !data.type || !data.description || data.priceRaw === "" || !Number.isFinite(price) || price < 0 || !data.creator) {
      $("#form-message").textContent = "Complete every required field before previewing your product.";
      return null;
    }
    const rate = commissionRates[data.category] ?? 0.10;
    const commission = price * rate;
    return { ...data, price, categoryLabel: categoryLabels[data.category] || "Other", typeLabel: typeLabels[data.type] || "Other", image: imageLabels[data.category] || "OTHER", rate, commission, sellerAmount: price - commission };
  }

  function updatePreview() {
    const data = readForm();
    if (!data) return null;
    currentListing = data;
    const previewImage = $("#preview-image");
    const imageLabel = previewImage?.querySelector("span");
    if (imageLabel) imageLabel.textContent = data.image;
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

  form?.addEventListener("submit", event => {
    event.preventDefault();
    if (updatePreview()) preview?.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  $("#publish-listing-btn")?.addEventListener("click", event => {
    event.preventDefault();
    const data = currentListing || updatePreview();
    if (!data) return;
    $("#form-message").textContent = `Ready to publish “${data.name}”. API connection will submit this listing to Origyn.`;
    $("#publish-status")?.classList.add("visible");
  });

  $("#product-category")?.addEventListener("change", () => { if (currentListing) updatePreview(); });
  $("#product-type")?.addEventListener("change", () => { if (currentListing) updatePreview(); });
  $("#product-price")?.addEventListener("input", () => { if (currentListing) updatePreview(); });
});
