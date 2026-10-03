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
  const shareButton = dialog && dialog.querySelector("[data-lightbox-share]");

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
    if (shareButton) {
      shareButton.dataset.shareUrl = new URL(link.getAttribute("href"), window.location.href).href;
      shareButton.dataset.shareTitle = link.dataset.caption || "Love quote photo";
      shareButton.textContent = "Share";
      shareButton.classList.remove("is-copied");
    }
    if (window.quoteMint && typeof window.quoteMint.setQuoteImage === "function") {
      window.quoteMint.setQuoteImage(new URL(link.getAttribute("href"), window.location.href).href);
    }
    dialog.showModal();
  }

  async function shareQuote() {
    if (!shareButton) return;
    const url = shareButton.dataset.shareUrl || window.location.href;
    const title = shareButton.dataset.shareTitle || "Love quote photo";
    const shareData = { title: `${title} · Couple in Bond`, text: "A love quote from Couple in Bond", url };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(url);
      shareButton.textContent = "Link copied";
      shareButton.classList.add("is-copied");
    } catch (error) {
      if (error && error.name === "AbortError") return;
      shareButton.textContent = "Copy failed";
      window.setTimeout(() => {
        shareButton.textContent = "Share";
        shareButton.classList.remove("is-copied");
      }, 1800);
    }
  }

  const cardShareButtons = Array.from(document.querySelectorAll("[data-share-card]"));

  function shareCard(button) {
    const image = button.dataset.shareImage || "";
    const text = button.dataset.shareText || "";
    const author = button.dataset.shareAuthor || "";
    const url = new URL(image, window.location.href).href;
    const line = author ? `${text} — ${author}` : text;
    const shareData = { text: `${line} · Couple in Bond`, url };

    function copied() {
      button.textContent = "Copied";
      button.classList.add("is-copied");
      window.setTimeout(() => {
        button.textContent = "Share";
        button.classList.remove("is-copied");
      }, 1800);
    }

    function copyFallback() {
      navigator.clipboard
        .writeText(`${line}\n${url}`)
        .then(copied)
        .catch(() => {
          button.textContent = "Copy failed";
          window.setTimeout(() => {
            button.textContent = "Share";
          }, 1800);
        });
    }

    if (navigator.share) {
      navigator.share(shareData).catch((error) => {
        if (error && error.name === "AbortError") return;
        copyFallback();
      });
      return;
    }
    copyFallback();
  }

  filters.forEach((button) => {
    button.addEventListener("click", () => setFilter(button.dataset.filter));
  });

  cardShareButtons.forEach((button) => {
    button.addEventListener("click", () => shareCard(button));
  });

  document.querySelectorAll("[data-lightbox-trigger]").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (!dialog || typeof dialog.showModal !== "function") return;
      event.preventDefault();
      openLightbox(link);
    });
  });

  if (shareButton) shareButton.addEventListener("click", shareQuote);
  if (closeButton && dialog) closeButton.addEventListener("click", () => dialog.close());
  if (dialog) {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }

  setFilter("all");
}());
