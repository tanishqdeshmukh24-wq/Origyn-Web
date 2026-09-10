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

  // Keep the disabled Shipping state visually consistent even if an older stylesheet
  // does not define .is-disabled yet.
  if (!document.getElementById("origyn-shipping-state-style")) {
    const style = document.createElement("style");
    style.id = "origyn-shipping-state-style";
    style.textContent = `
      #shipping-block { transition: opacity .2s ease, filter .2s ease; }
      #shipping-block.is-disabled { opacity: .48; filter: saturate(.45); }
      #shipping-block.is-disabled input,
      #shipping-block.is-disabled select { cursor: not-allowed; }
      #shipping-block:not(.is-disabled) { opacity: 1; filter: none; }
    `;
    document.head.appendChild(style);
  }

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
    const selectedDelivery = delivery?.value || "";
    const shippingSelected = selectedDelivery === "shipping";

    // Shipping is available ONLY for the Ship to customer delivery method.
    // Selecting Ship to customer activates the section; all other fulfilment
    // methods keep it visibly dimmed and prevent editing its fields.
    shipping?.classList.toggle("is-disabled", !shippingSelected);
    shipping?.setAttribute("aria-disabled", String(!shippingSelected));
    shipping?.querySelectorAll("input, select").forEach(el => {
      el.disabled = !shippingSelected;
    });

    $("#stock-mode").value = physical ? "limited" : "unlimited";
    $("#stock-quantity").disabled = !physical;
    if (!physical) $("#stock-quantity").value = "";

    // Only choose a default delivery method when the current value is empty.
    // This prevents a manual delivery selection from being overwritten.
    if (!delivery.value) {
      delivery.value = physical ? "shipping" : (type.value === "api" ? "api" : digital ? "account" : "service");
      // Re-evaluate immediately after assigning the default.
      const defaultShippingSelected = delivery.value === "shipping";
      shipping?.classList.toggle("is-disabled", !defaultShippingSelected);
      shipping?.setAttribute("aria-disabled", String(!defaultShippingSelected));
      shipping?.querySelectorAll("input, select").forEach(el => { el.disabled = !defaultShippingSelected; });
    }

    $("#delivery-block").classList.toggle("digital-highlight", digital && delivery.value !== "shipping");
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
  $("#save-draft").addEventListener("click", async () => {
  const token = localStorage.getItem("origynAccessToken");

  if (!token) {
    $("#draft-status").textContent = "Please log in first";
    return;
  }

  const body = {
    name: $("#product-name").value.trim(),
    description: $("#product-description").value.trim(),
    product_type: $("#product-type").value,
    category_slug: $("#product-category").value,
    price: Number($("#product-price").value),
    currency: "INR",
    images: [],
    options: [],
    variants: variants,
    inventory: {
      stock_mode: $("#stock-mode").value,
      stock_quantity: $("#stock-quantity").value
        ? Number($("#stock-quantity").value)
        : null
    },
    delivery: {
      method: $("#delivery-method").value,
      fulfilment_note: $("#delivery-note").value.trim()
    },
    shipping: {
      ships_from: $("#ships-from").value.trim(),
      processing_time: $("#processing-time").value
    },
    policies: {
      refund_policy: $("#refund-policy").value,
      seller_rights_confirmed: $("#terms-confirm").checked
    }
  };

  $("#draft-status").textContent = "Saving...";

  try {
    const response = await fetch("http://localhost:5000/api/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Save draft error:", data);
      $("#draft-status").textContent =
        data.error || "Failed to save draft";
      return;
    }

    console.log("Draft created:", data);

    localStorage.setItem(
      "origynPublisherDraft",
      JSON.stringify(draftData())
    );

    localStorage.setItem(
      "origynCurrentProduct",
      JSON.stringify(data)
    );

    $("#draft-status").textContent = "Saved to Origyn ✓";

  } catch (error) {
    console.error("Save draft error:", error);
    $("#draft-status").textContent =
      "Cannot connect to Origyn backend";
  }
});

  form.addEventListener("submit", e => {
    if (!$("#terms-confirm").checked) {
      e.preventDefault();
      $("#form-message").textContent = "Please confirm that you have the rights to sell this product.";
      $("#terms-confirm").focus();
    }
  }, true);

  const publishButton = $("#publish-listing-btn");

 publishButton?.addEventListener("click", async () => {
  const token = localStorage.getItem("origynAccessToken");
  const product = JSON.parse(
    localStorage.getItem("origynCurrentProduct") || "null"
  );

  if (!token) {
    $("#publish-status").textContent = "Please log in first.";
    return;
  }

  if (!product?.id) {
    $("#publish-status").textContent =
      "Please save your draft before publishing.";
    return;
  }

  if (!$("#terms-confirm").checked) {
    $("#form-message").textContent =
      "Confirm your seller rights before publishing.";
    $("#terms-confirm").focus();
    return;
  }

  const status = $("#publish-status");
  status.textContent = "Publishing...";

  try {
    const response = await fetch(
      `http://localhost:5000/api/products/${product.id}/publish`,
      {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + token
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Publish error:", data);

      const details = Array.isArray(data.details)
        ? data.details.join(" • ")
        : "";

      status.textContent =
        data.error + (details ? `: ${details}` : "");

      return;
    }

    console.log("Published product:", data);

    localStorage.setItem(
      "origynCurrentProduct",
      JSON.stringify(data)
    );

    status.textContent = "Published on Origyn ✓";
    status.classList.add("visible");

  } catch (error) {
    console.error("Publish error:", error);
    status.textContent =
      "Cannot connect to Origyn backend.";
  }
}, true);
  // =========================
  // MY PRODUCTS
  // =========================

  async function loadMyProducts() {
    const list = document.querySelector("#my-products-list");
    const token = localStorage.getItem("origynAccessToken");
    const user = JSON.parse(localStorage.getItem("origynUser") || "null");

    if (!list) return;

    if (!token || !user) {
      list.innerHTML = "<p>Please log in to see your products.</p>";
      return;
    }

    list.innerHTML = "<p>Loading your products...</p>";

    try {
      const response = await fetch(
        "http://localhost:5000/api/products?limit=100",
        {
          headers: {
            "Authorization": "Bearer " + token
          }
        }
      );

      const result = await response.json();

      if (!response.ok) {
        list.innerHTML = `<p>${result.error || "Failed to load products."}</p>`;
        return;
      }

      // Show only products belonging to this publisher
      const products = (result.data || []).filter(product =>
        product.publisher_id === user.publisher_id
      );

      if (!products.length) {
        list.innerHTML = "<p>You haven't published any products yet.</p>";
        return;
      }

      list.innerHTML = products.map(product => `
        <div class="my-product-card">
          <div>
            <h3>${product.name}</h3>
            <p>₹${(Number(product.price_paise || 0) / 100).toLocaleString("en-IN")}</p>
            <span>${product.status || "published"}</span>
          </div>

          <div class="my-product-actions">
            ${
              product.status === "published"
                ? `<button type="button" data-archive-product="${product.id}">
                    Archive
                   </button>`
                : `<button type="button" data-delete-product="${product.id}">
                    Delete
                   </button>`
            }
          </div>
        </div>
      `).join("");

    } catch (error) {
      console.error("My products error:", error);
      list.innerHTML = "<p>Cannot connect to Origyn backend.</p>";
    }
  }


  // Archive a published product
  document.addEventListener("click", async (event) => {
    const archiveButton = event.target.closest("[data-archive-product]");
    if (!archiveButton) return;

    const productId = archiveButton.dataset.archiveProduct;
    const token = localStorage.getItem("origynAccessToken");

    if (!confirm("Archive this product from the store?")) return;

    archiveButton.disabled = true;
    archiveButton.textContent = "Archiving...";

    try {
      const response = await fetch(
        `http://localhost:5000/api/products/${productId}/archive`,
        {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + token
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to archive product.");
        archiveButton.disabled = false;
        archiveButton.textContent = "Archive";
        return;
      }

      await loadMyProducts();

    } catch (error) {
      console.error("Archive error:", error);
      alert("Cannot connect to Origyn backend.");
      archiveButton.disabled = false;
      archiveButton.textContent = "Archive";
    }
  });


  // Delete a draft / non-published product
  document.addEventListener("click", async (event) => {
    const deleteButton = event.target.closest("[data-delete-product]");
    if (!deleteButton) return;

    const productId = deleteButton.dataset.deleteProduct;
    const token = localStorage.getItem("origynAccessToken");

    if (!confirm("Permanently delete this product?")) return;

    deleteButton.disabled = true;
    deleteButton.textContent = "Deleting...";

    try {
      const response = await fetch(
        `http://localhost:5000/api/products/${productId}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": "Bearer " + token
          }
        }
      );

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to delete product.");
        deleteButton.disabled = false;
        deleteButton.textContent = "Delete";
        return;
      }

      await loadMyProducts();

    } catch (error) {
      console.error("Delete error:", error);
      alert("Cannot connect to Origyn backend.");
      deleteButton.disabled = false;
      deleteButton.textContent = "Delete";
    }
  });


  loadMyProducts();
  restoreDraft();
  refreshConditionalFields();
});