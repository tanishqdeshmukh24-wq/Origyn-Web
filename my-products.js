document.addEventListener("DOMContentLoaded", () => {
  const list = document.querySelector("#my-products-list");
  if (!list) return;

  const API_BASE = "http://localhost:5000/api";

  function escapeHtml(value) {
    return String(value).replace(/[&<>\'"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[char]));
  }

  async function loadMyProducts() {
    const token = localStorage.getItem("origynAccessToken");
    const user = JSON.parse(localStorage.getItem("origynUser") || "null");

    if (!token || !user?.publisher_id) {
      list.innerHTML = "<p>Please log in as a publisher to see your products.</p>";
      return;
    }

    list.innerHTML = "<p>Loading your product history...</p>";

    try {
      const response = await fetch(
        `${API_BASE}/me/products?limit=100`,
        { headers: { "Authorization": "Bearer " + token } }
      );

      const result = await response.json();

      if (!response.ok) {
        list.innerHTML = `<p>${escapeHtml(result.error || "Failed to load products.")}</p>`;
        return;
      }

      const products = result.data || [];

      if (!products.length) {
        list.innerHTML = "<p>You haven't created any products yet.</p>";
        return;
      }

      list.innerHTML = products.map(product => {
        const status = String(product.status || "draft");
        const action = status === "published"
          ? `<button type="button" data-archive-product="${product.id}">Archive</button>`
          : status === "archived"
            ? `<span class="product-history-note">Archived</span>`
            : `<button type="button" data-delete-product="${product.id}">Delete</button>`;

        return `
          <div class="my-product-card">
            <div>
              <h3>${escapeHtml(product.name || "Untitled product")}</h3>
              <p>₹${(Number(product.price_paise || 0) / 100).toLocaleString("en-IN")}</p>
              <span>${escapeHtml(status)}</span>
            </div>
            <div class="my-product-actions">
              ${action}
            </div>
          </div>
        `;
      }).join("");
    } catch (error) {
      console.error("My products error:", error);
      list.innerHTML = "<p>Cannot connect to Origyn backend.</p>";
    }
  }

  list.addEventListener("click", async event => {
    const archiveButton = event.target.closest("[data-archive-product]");
    const deleteButton = event.target.closest("[data-delete-product]");
    const button = archiveButton || deleteButton;
    if (!button) return;

    const token = localStorage.getItem("origynAccessToken");
    const productId = button.dataset.archiveProduct || button.dataset.deleteProduct;
    const isArchive = Boolean(archiveButton);

    if (!confirm(isArchive
      ? "Archive this product from the Origyn Store?"
      : "Permanently delete this draft product?")) return;

    button.disabled = true;
    button.textContent = isArchive ? "Archiving..." : "Deleting...";

    try {
      const response = await fetch(
        isArchive
          ? `${API_BASE}/products/${productId}/archive`
          : `${API_BASE}/products/${productId}`,
        {
          method: isArchive ? "POST" : "DELETE",
          headers: { "Authorization": "Bearer " + token }
        }
      );

      const data = response.status === 204 ? {} : await response.json();

      if (!response.ok) {
        alert(data.error || (isArchive ? "Failed to archive product." : "Failed to delete product."));
        button.disabled = false;
        button.textContent = isArchive ? "Archive" : "Delete";
        return;
      }

      await loadMyProducts();
    } catch (error) {
      console.error("Product history action error:", error);
      alert("Cannot connect to Origyn backend.");
      button.disabled = false;
      button.textContent = isArchive ? "Archive" : "Delete";
    }
  });

  loadMyProducts();
});
