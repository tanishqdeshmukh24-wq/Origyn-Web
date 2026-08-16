/* ORIGYN PUBLISHER — completion layer: variants, inventory, delivery, shipping, drafts */
document.addEventListener("DOMContentLoaded", () => {
  const $ = (s, r = document) => r.querySelector(s);
  const form = $("#product-form");
  if (!form) return;

  const type = $("#product-type");
  const imageField = $(".product-image-field");

  const panel = document.createElement("div");
  panel.className = "publisher-options-panel";
  panel.innerHTML = `
    <div class="publisher-options-head"><div><span>03</span><h3>Product setup</h3></div><small>OPTIONAL</small></div>
    <div class="publisher-option-block" id="variant-block">
      <div class="option-title"><div><strong>Variants</strong><p>Add size, color, model or other selectable options.</p></div><button type="button" id="add-variant">+ Add variant</button></div>
      <div id="variant-list"></div>
    </div>
    <div class="publisher-option-block">
      <div class="option-title"><div><strong>Inventory</strong><p>Set stock for physical products or mark a digital product as unlimited.</p></div></div>
      <div class="inventory-grid">
        <label><span>Stock mode</span><select id="stock-mode"><option value="limited">Limited stock</option><option value="unlimited">Unlimited / digital</option></select></label>
        <label id="stock-quantity-wrap"><span>Quantity</span><input id="stock-quantity" type="number" min="0" step="1" value="1"></label>
      </div>
    </div>
    <div class="publisher-option-block" id="delivery-block">
      <div class="option-title"><div><strong>Delivery & access</strong><p>Tell Origyn how a buyer receives this product after purchase.</p></div></div>
      <div class="delivery-grid">
        <label><span>Delivery method</span><select id="delivery-method"><option value="shipping">Ship to customer</option><option value="download">Secure download</option><option value="account">Account access</option><option value="api">API / license access</option><option value="service">Service / manual fulfilment</option></select></label>
        <label><span>Access / fulfilment note</span><input id="delivery-note" type="text" placeholder="e.g. Download after payment"></label>
      </div>
    </div>
    <div class="publisher-option-block" id="shipping-block">
      <div class="option-title"><div><strong>Shipping</strong><p>Only required when the product is physically shipped.</p></div></div>
      <div class="shipping-grid">
        <label><span>Ships from</span><input id="ships-from" type="text" placeholder="City / region"></label>
        <label><span>Processing time</span><select id="processing-time"><option value="1-2">1–2 business days</option><option value="3-5">3–5 business days</option><option value="5-7">5–7 business days</option><option value="7+">7+ business days</option></select></label>
      </div>
    </div>
    <div class="publisher-option-block">
      <div class="option-title"><div><strong>Seller policies</strong><p>Set expectations before customers purchase.</p></div></div>
      <div class="policy-grid">
        <label><span>Refund policy</span><select id="refund-policy"><option value="standard">Origyn standard policy</option><option value="no-refund">No refunds where legally permitted</option><option value="custom">Custom policy — review required</option></select></label>
        <label class="policy-check"><input id="terms-confirm" type="checkbox"><span>I confirm I own or have the rights to sell this product.</span></label>
      </div>
    </div>
    <div class="draft-actions"><button type="button" id="save-draft">Save Draft</button><span id="draft-status">Not saved</span></div>`;

  form.insertBefore(panel, imageField || form.lastElementChild);

  const variantList = $("#variant-list");
  let variants = [];
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem("origynPublisherDraft") || "null"); } catch (_) { saved = null; }

  function renderVariants() {
    variantList.innerHTML = variants.map((v, i) => `<div class="variant-row"><input data-variant-name="${i}" value="${v.name || ""}" placeholder="Option name (e.g. Color)"><input data-variant-values="${i}" value="${v.values || ""}" placeholder="Values (e.g. Black, White)"><button type="button" data-remove-variant="${i}" aria-label="Remove variant">×</button></div>`).join("");
  }
  $("#add-variant").addEventListener("click", () => { variants.push({ name: "", values: "" }); renderVariants(); variantList.lastElementChild?.querySelector("input")?.focus(); });
  variantList.addEventListener("input", e => { const i = Number(e.target.dataset.variantName ?? e.target.dataset.variantValues); if (!Number.isInteger(i) || !variants[i]) return; if (e.target.dataset.variantName !== undefined) variants[i].name = e.target.value; else variants[i].values = e.target.value; });
  variantList.addEventListener("click", e => { const btn = e.target.closest("[data-remove-variant]"); if (!btn) return; variants.splice(Number(btn.dataset.removeVariant), 1); renderVariants(); });

  function refreshConditionalFields() {
    const physical = type.value === "physical";
    const digital = ["digital", "software", "ai_model", "dataset", "api"].includes(type.value);
    const delivery = $("#delivery-method");
    const shipping = $("#shipping-block");
    const selectedDelivery = delivery?.value || "shipping";

    // Shipping is a usable section, never a greyed-out/dead control.
    // Its fields are relevant when Ship to customer is selected, but remain editable
    // so the publisher can complete the listing before changing delivery mode.
    shipping?.classList.remove("is-disabled");
    shipping?.setAttribute("aria-disabled", "false");
    shipping?.querySelectorAll("input, select").forEach(el => { el.disabled = false; });

    $("#stock-mode").value = physical ? "limited" : "unlimited";
    $("#stock-quantity").disabled = !physical;
    if (!physical) $("#stock-quantity").value = "";

    // Only choose a default delivery method when the current value is empty.
    // This prevents the user's manual selection from being overwritten.
    if (!delivery.value) delivery.value = physical ? "shipping" : (type.value === "api" ? "api" : digital ? "account" : "service");
    $("#delivery-block").classList.toggle("digital-highlight", digital && selectedDelivery !== "shipping");
  }

  type.addEventListener("change", refreshConditionalFields);
  $("#delivery-method").addEventListener("change", refreshConditionalFields);
  $("#stock-mode").addEventListener("change", e => { $("#stock-quantity").disabled = e.target.value === "unlimited"; });

  function draftData() {
    const data = {};
    form.querySelectorAll("input, select, textarea").forEach(el => { if (el.id && el.type !== "file" && el.type !== "checkbox") data[el.id] = el.value; });
    data.terms = $("#terms-confirm").checked;
    data.variants = variants;
    data.savedAt = new Date().toISOString();
    return data;
  }
  function restoreDraft() {
    if (!saved) return;
    Object.entries(saved).forEach(([id, value]) => { const el = document.getElementById(id); if (!el || id === "terms-confirm" || id === "savedAt" || id === "variants") return; el.value = value; });
    $("#terms-confirm").checked = Boolean(saved.terms);
    variants = Array.isArray(saved.variants) ? saved.variants : [];
    renderVariants();
    $("#draft-status").textContent = "Draft restored";
    refreshConditionalFields();
  }
  $("#save-draft").addEventListener("click", () => { localStorage.setItem("origynPublisherDraft", JSON.stringify(draftData())); $("#draft-status").textContent = "Saved just now"; });

  form.addEventListener("submit", e => {
    if (!$("#terms-confirm").checked) {
      e.preventDefault();
      $("#form-message").textContent = "Please confirm that you have the rights to sell this product.";
      $("#terms-confirm").focus();
    }
  }, true);

  const publishButton = $("#publish-listing-btn");
  publishButton?.addEventListener("click", () => {
    if (!$("#terms-confirm").checked) {
      $("#form-message").textContent = "Confirm your seller rights before preparing this listing.";
      $("#terms-confirm").focus();
      return;
    }
    const status = $("#publish-status");
    if (status) status.textContent = "Listing is complete and ready for API submission. Images, variants, inventory, delivery, shipping and seller policy are prepared.";
    status?.classList.add("visible");
  }, true);

  restoreDraft();
  refreshConditionalFields();
});