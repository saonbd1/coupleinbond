/* Design reminder: Love Letter Wall — keep interactions quiet, tactile, and editorial; never hide the quote content behind decoration. */
(function () {
  "use strict";

  const cards = Array.from(document.querySelectorAll("[data-quote-card]"));
  const filters = Array.from(document.querySelectorAll("[data-filter]"));
  const resultCount = document.querySelector("[data-result-count]");
  const status = document.querySelector("[data-filter-status]");
  const dialog = document.querySelector("[data-lightbox]");
  const dialogImage = dialog && dialog.querySelector("[data-lightbox-image]");
  const dialogCaption = dialog && dialog.querySelector("[data-lightbox-caption]");
  const closeButton = dialog && dialog.querySelector("[data-lightbox-close]");

  function setFilter(filter) {
    let visible = 0;
    cards.forEach((card) => {
      const matches = filter === "all" || card.dataset.mood === filter;
      card.hidden = !matches;
      if (matches) visible += 1;
    });
    filters.forEach((button) => {
      const active = button.dataset.filter === filter;
      button.setAttribute("aria-pressed", String(active));
    });
    if (resultCount) resultCount.textContent = String(visible).padStart(2, "0");
    if (status) status.textContent = `${visible} ${visible === 1 ? "quote" : "quotes"} showing`;
  }

  function openLightbox(link) {
    if (!dialog || !dialogImage || typeof dialog.showModal !== "function") return;
    dialogImage.src = link.href;
    dialogImage.alt = link.dataset.imageAlt || "Love quote image";
    if (dialogCaption) dialogCaption.textContent = link.dataset.caption || "Love quote";
    dialog.showModal();
  }

  filters.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });

  document.querySelectorAll("[data-lightbox-trigger]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!dialog || typeof dialog.showModal !== "function") return;
      event.preventDefault();
      openLightbox(link);
    });
  });

  if (closeButton && dialog) closeButton.addEventListener("click", () => dialog.close());
  if (dialog) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  setFilter("all");
}());
