/* Origyn Store reviews + ratings integration. */
document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  if (!window.OrigynAPI) return;

  let currentProductId = null;
  let currentReviews = [];
  let currentUserId = null;
  let editingReviewId = null;

  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const stars = (value) => {
    const rating = Math.max(0, Math.min(5, Number(value) || 0));
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const formatDate = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date);
  };

  const ensureReviewUi = () => {
    if ($('#product-reviews')) return;
    const modalInfo = document.querySelector('.modal-info');
    if (!modalInfo) return;

    const section = document.createElement('section');
    section.id = 'product-reviews';
    section.className = 'product-reviews';
    section.innerHTML = `
      <div class="reviews-summary">
        <div>
          <p class="eyebrow">REVIEWS & RATINGS</p>
          <div class="reviews-score"><strong id="reviews-average">0.0</strong><span id="reviews-stars">☆☆☆☆☆</span></div>
          <small id="reviews-count">No reviews yet</small>
        </div>
        <div id="reviews-breakdown" class="reviews-breakdown"></div>
      </div>
      <div id="review-form-wrap" class="review-form-wrap" hidden>
        <h3 id="review-form-title">Write a review</h3>
        <div id="review-rating-input" class="review-rating-input" role="radiogroup" aria-label="Rating">
          ${[1,2,3,4,5].map((n) => `<button type="button" data-rating="${n}" aria-label="${n} star${n > 1 ? 's' : ''}">☆</button>`).join('')}
        </div>
        <textarea id="review-text" maxlength="5000" placeholder="Share your experience..."></textarea>
        <div class="review-form-actions"><button type="button" id="review-cancel" class="text-btn" hidden>Cancel</button><button type="button" id="review-submit" class="primary-btn">Post review →</button></div>
        <small id="review-status" aria-live="polite"></small>
      </div>
      <div id="review-auth-message" class="review-auth-message" hidden></div>
      <div id="review-list" class="review-list"><p class="reviews-loading">Open a product to load reviews.</p></div>
    `;
    modalInfo.appendChild(section);

    document.querySelectorAll('#review-rating-input [data-rating]').forEach((button) => {
      button.addEventListener('click', () => {
        section.dataset.rating = button.dataset.rating;
        updateRatingButtons(Number(button.dataset.rating));
      });
    });
    $('#review-submit')?.addEventListener('click', submitReview);
    $('#review-cancel')?.addEventListener('click', cancelEdit);
    $('#review-list')?.addEventListener('click', handleReviewAction);
  };

  const updateRatingButtons = (rating) => {
    document.querySelectorAll('#review-rating-input [data-rating]').forEach((button) => {
      const active = Number(button.dataset.rating) <= rating;
      button.textContent = active ? '★' : '☆';
    });
  };

  const setStatus = (message, isError = false) => {
    const status = $('#review-status');
    if (status) {
      status.textContent = message;
      status.dataset.error = isError ? 'true' : 'false';
    }
  };

  const getRating = () => Number(document.querySelector('#product-reviews')?.dataset.rating || 0);

  const loadCurrentUser = async () => {
    if (!window.OrigynAPI.isAuthenticated()) return null;
    try {
      const response = await window.OrigynAPI.get('/api/auth/me');
      currentUserId = response.data?.user?.id || response.user?.id || response.data?.id || null;
    } catch (error) {
      if (error.status !== 401) console.warn('Could not load current user:', error.message);
    }
    return currentUserId;
  };

  const renderSummary = (rating) => {
    const average = Number(rating?.average || 0);
    const total = Number(rating?.total_count || 0);
    if ($('#reviews-average')) $('#reviews-average').textContent = average.toFixed(1);
    if ($('#reviews-stars')) $('#reviews-stars').textContent = stars(Math.round(average));
    if ($('#reviews-count')) $('#reviews-count').textContent = `${total} review${total === 1 ? '' : 's'}`;

    const breakdown = $('#reviews-breakdown');
    if (!breakdown) return;
    breakdown.innerHTML = [5,4,3,2,1].map((n) => {
      const count = Number(rating?.[['zero','one','two','three','four','five'][n]] || 0);
      const percent = total ? Math.round((count / total) * 100) : 0;
      return `<div class="review-bar"><span>${n}★</span><div><i style="width:${percent}%"></i></div><small>${count}</small></div>`;
    }).join('');
  };

  const renderReviews = () => {
    const list = $('#review-list');
    if (!list) return;
    if (!currentReviews.length) {
      list.innerHTML = '<p class="reviews-empty">No reviews yet. Be the first to review this product.</p>';
      return;
    }
    list.innerHTML = currentReviews.map((review) => {
      const own = currentUserId && review.user_id === currentUserId;
      return `<article class="review-item">
        <div class="review-item-head"><div><strong>${escapeHtml(review.user_name || 'Origyn customer')}</strong>${review.verified_purchase ? '<span class="verified-review">Verified purchase</span>' : ''}</div><small>${escapeHtml(formatDate(review.created_at))}</small></div>
        <div class="review-item-rating">${stars(review.rating)}</div>
        <p>${escapeHtml(review.review_text)}</p>
        ${own ? `<div class="review-actions"><button type="button" data-review-action="edit" data-review-id="${review.id}">Edit</button><button type="button" data-review-action="delete" data-review-id="${review.id}">Delete</button></div>` : ''}
      </article>`;
    }).join('');
  };

  const loadReviews = async (productId) => {
    ensureReviewUi();
    currentProductId = productId;
    currentReviews = [];
    const list = $('#review-list');
    if (list) list.innerHTML = '<p class="reviews-loading">Loading reviews…</p>';
    try {
      const response = await window.OrigynAPI.get(`/api/products/${productId}/reviews`);
      const payload = response.data || response;
      currentReviews = Array.isArray(payload.reviews) ? payload.reviews : [];
      renderSummary(payload.rating || {});
      renderReviews();
      await prepareReviewForm();
    } catch (error) {
      if (list) list.innerHTML = `<p class="reviews-empty">Could not load reviews: ${escapeHtml(error.message || 'Unknown error')}</p>`;
    }
  };

  const prepareReviewForm = async () => {
    const form = $('#review-form-wrap');
    const authMessage = $('#review-auth-message');
    if (!form || !authMessage) return;

    if (!window.OrigynAPI.isAuthenticated()) {
      form.hidden = true;
      authMessage.hidden = false;
      authMessage.textContent = 'Sign in to write a review.';
      return;
    }

    await loadCurrentUser();
    form.hidden = false;
    authMessage.hidden = true;
    const own = currentReviews.find((review) => review.user_id === currentUserId);
    if (own) {
      editingReviewId = own.id;
      $('#review-form-title').textContent = 'Update your review';
      $('#review-text').value = own.review_text || '';
      document.querySelector('#product-reviews').dataset.rating = own.rating;
      updateRatingButtons(own.rating);
      $('#review-cancel').hidden = false;
      $('#review-submit').textContent = 'Update review →';
    } else {
      resetForm();
    }
  };

  const resetForm = () => {
    editingReviewId = null;
    const section = $('#product-reviews');
    if (section) delete section.dataset.rating;
    if ($('#review-form-title')) $('#review-form-title').textContent = 'Write a review';
    if ($('#review-text')) $('#review-text').value = '';
    updateRatingButtons(0);
    if ($('#review-cancel')) $('#review-cancel').hidden = true;
    if ($('#review-submit')) $('#review-submit').textContent = 'Post review →';
    setStatus('');
  };

  const cancelEdit = () => {
    const own = currentReviews.find((review) => review.user_id === currentUserId);
    if (own) {
      editingReviewId = own.id;
      $('#review-text').value = own.review_text || '';
      document.querySelector('#product-reviews').dataset.rating = own.rating;
      updateRatingButtons(own.rating);
      setStatus('Edit cancelled. Your current review is still saved.');
    } else resetForm();
  };

  const submitReview = async () => {
    if (!currentProductId || !window.OrigynAPI.isAuthenticated()) return;
    const rating = getRating();
    const reviewText = $('#review-text')?.value.trim();
    if (!rating) return setStatus('Choose a rating from 1 to 5.', true);
    if (!reviewText) return setStatus('Write a review before posting.', true);

    const button = $('#review-submit');
    if (button) button.disabled = true;
    setStatus(editingReviewId ? 'Updating review…' : 'Posting review…');
    try {
      if (editingReviewId) {
        await window.OrigynAPI.patch(`/api/reviews/${editingReviewId}`, { rating, review_text: reviewText });
      } else {
        await window.OrigynAPI.post(`/api/products/${currentProductId}/reviews`, { rating, review_text: reviewText });
      }
      await loadReviews(currentProductId);
      setStatus('Review saved.');
    } catch (error) {
      setStatus(error.message || 'Could not save your review.', true);
    } finally {
      if (button) button.disabled = false;
    }
  };

  const handleReviewAction = async (event) => {
    const button = event.target.closest('[data-review-action]');
    if (!button) return;
    const review = currentReviews.find((item) => item.id === button.dataset.reviewId);
    if (!review) return;

    if (button.dataset.reviewAction === 'edit') {
      editingReviewId = review.id;
      document.querySelector('#product-reviews').dataset.rating = review.rating;
      $('#review-form-title').textContent = 'Update your review';
      $('#review-text').value = review.review_text || '';
      updateRatingButtons(review.rating);
      $('#review-cancel').hidden = false;
      $('#review-submit').textContent = 'Update review →';
      $('#review-text').focus();
      return;
    }

    if (!window.confirm('Delete your review?')) return;
    try {
      await window.OrigynAPI.delete(`/api/reviews/${review.id}`);
      await loadReviews(currentProductId);
    } catch (error) {
      setStatus(error.message || 'Could not delete your review.', true);
    }
  };

  ensureReviewUi();

  // store-api.js owns modal selection; observe the modal name/id by listening for clicks on product cards.
  document.addEventListener('click', (event) => {
    const productButton = event.target.closest('[data-product]');
    if (!productButton) return;
    const id = productButton.dataset.product;
    if (id) setTimeout(() => loadReviews(id), 0);
  }, true);

  // Also refresh when a product modal is opened through other Store code.
  const modal = $('#product-modal');
  if (modal) {
    const observer = new MutationObserver(() => {
      if (!modal.classList.contains('open')) return;
      const name = $('#modal-name')?.textContent?.trim();
      if (!name) return;
      const cards = document.querySelectorAll('[data-product]');
      for (const card of cards) {
        const title = card.querySelector('h3')?.textContent?.trim();
        if (title === name && card.dataset.product !== currentProductId) {
          loadReviews(card.dataset.product);
          break;
        }
      }
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
  }
});
