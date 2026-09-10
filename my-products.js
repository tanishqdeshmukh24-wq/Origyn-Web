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

    list.innerHTML = "<p>Loading your products...</p>";

    try {
      const response = await fetch(
        `${API_BASE}/products?limit=100&publisher_id=${encodeURIComponent(user.publisher_id)}`,
        { headers: { "Authorization": "Bearer " + token } }
      );

      const result = await response.json();

      if (!response.ok) {
        list.innerHTML = `<p>${escapeHtml(result.error || "Failed to load products.")}</p>`;
        return;
      }

      const products = result.data || [];

      if (!products.length) {
        list.innerHTML = "<p>You haven't published any products yet.</p>";
        return;
      }

      list.innerHTML = products.map(product => `
        <div class="my-product-card">
          <div>
            <h3>${escapeHtml(product.name || "Untitled product")}</h3>
            <p>₹${(Number(product.price_paise || 0) / 100).toLocaleString("en-IN")}</p>
            <span>${escapeHtml(product.status || "published")}</span>
          </div>
          <div class="my-product-actions">
            <button type="button" data-archive-product="${product.id}">Archive</button>
          </div>
        </div>
      `).join("");
    } catch (error) {
      console.error("My products error:", error);
      list.innerHTML = "<p>Cannot connect to Origyn backend.</p>";
    }
  }

  list.addEventListener("click", async event => {
    const button = event.target.closest("[data-archive-product]");
    if (!button) return;

    const token = localStorage.getItem("origynAccessToken");
    const productId = button.dataset.archiveProduct;

    if (!confirm("Archive this product from the Origyn Store?")) return;

    button.disabled = true;
    button.textContent = "Archiving...";

    try {
      const response = await fetch(`${API_BASE}/products/${productId}/archive`, {
        method: "POST",
        headers: { "Authorization": "Bearer " + token }
      });

      const data = response.status === 204 ? {} : await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to archive product.");
        button.disabled = false;
        button.textContent = "Archive";
        return;
      }

      await loadMyProducts();
    } catch (error) {
      console.error("Archive error:", error);
      alert("Cannot connect to Origyn backend.");
      button.disabled = false;
      button.textContent = "Archive";
    }
  });

  loadMyProducts();
});
