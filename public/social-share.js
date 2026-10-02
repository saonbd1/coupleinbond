/* Design reminder: Editorial Bloom — keep sharing quiet, useful, and tactile, with small circular icons, the site’s coral-to-lilac hover treatment, and no noisy social bar inside cards. */
(function () {
  "use strict";

  const shareItems = [
    {
      name: "Facebook",
      label: "Share on Facebook",
      buildUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.1V6.5c0-.7.5-1.1 1.2-1.1h1.5V3h-2.4C12.1 3 11 4.2 11 6.2v1.9H9v2.7h2v7.9h3v-7.9h2.3l.4-2.7H14Z"/></svg>'
    },
    {
      name: "Instagram",
      label: "Open Instagram to share",
      buildUrl: () => "https://www.instagram.com/",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1.1" class="site-share-dot"/></svg>'
    },
    {
      name: "X",
      label: "Share on X",
      buildUrl: (url, title) => `https://x.com/intent/post?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.25h4.1l4.1 5.6 4.6-5.6h2.25l-5.75 6.95 6.5 8.55h-4.1l-4.62-6.12-5.02 6.12H4.3l6.15-7.48L4.5 4.25Zm3.2 1.7 8.1 11.85h2.05L9.75 5.95H7.7Z"/></svg>'
    },
    {
      name: "TikTok",
      label: "Open TikTok to share",
      buildUrl: () => "https://www.tiktok.com/",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 3h3.1c.2 1.7 1.1 2.8 2.7 3.3v3.2c-1.1-.1-2.1-.4-3-1v6.2c0 3.4-2.2 5.3-5.2 5.3-2.8 0-4.9-1.9-4.9-4.6 0-2.8 2.2-4.8 5.3-4.8.4 0 .8 0 1.2.1v3.1c-.4-.1-.8-.2-1.2-.2-1.2 0-2.1.7-2.1 1.8 0 1 .8 1.7 1.8 1.7 1.4 0 2.3-.8 2.3-2.6V3Z"/></svg>'
    }
  ];

  function excludedPage() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    return /\/(?:index\.html|blog\.html|contact\.html|privacy\.html)$/.test(path) || path === "/";
  }

  function pageUrl() {
    const canonical = document.querySelector('link[rel="canonical"]');
    return canonical && canonical.href ? canonical.href : window.location.href;
  }

  function pageTitle() {
    const heading = document.querySelector("h1");
    return heading && heading.textContent.trim() ? heading.textContent.trim() : document.title;
  }

  function createShareRow() {
    const url = pageUrl();
    const title = pageTitle();
    const row = document.createElement("section");
    row.className = "site-share";
    row.setAttribute("aria-labelledby", "site-share-title");
    row.innerHTML = `
      <div class="site-share-copy">
        <span class="site-share-kicker" id="site-share-title">Share this page</span>
        <span class="site-share-note">Send it to someone who might enjoy it.</span>
      </div>
      <div class="site-share-links">
        ${shareItems.map((item) => `<a class="site-share-link" href="${item.buildUrl(url, title)}" target="_blank" rel="noopener noreferrer" aria-label="${item.label}" title="${item.label}">${item.icon}</a>`).join("")}
      </div>
    `;
    return row;
  }

  function mountShareRow() {
    if (excludedPage() || document.querySelector(".site-share")) return;
    const article = document.querySelector(".article-shell");
    if (article) {
      const row = createShareRow();
      const footer = article.querySelector(".article-footer");
      article.insertBefore(row, footer || null);
      return;
    }
    const quotesSection = document.querySelector(".quotes-section");
    if (quotesSection) {
      quotesSection.appendChild(createShareRow());
      return;
    }
    const legacyContent = document.querySelector(".main-content .content-wrapper");
    if (legacyContent && document.querySelector("h1")) {
      const card = legacyContent.querySelector(".card");
      (card || legacyContent).appendChild(createShareRow());
      return;
    }
    const main = document.querySelector("main");
    if (main && document.querySelector("h1")) main.appendChild(createShareRow());
  }

  function addStyles() {
    if (document.getElementById("coupleInShareStyles")) return;
    const style = document.createElement("style");
    style.id = "coupleInShareStyles";
    style.textContent = `
      .site-share { display:flex; align-items:center; justify-content:space-between; gap:18px; margin:32px 0 0; padding:17px 19px; color:var(--blog-muted, #6f6573); background:linear-gradient(135deg, rgba(255,241,245,.78), rgba(246,239,255,.86)); border:1px solid rgba(83,49,94,.1); border-radius:15px; }
      .site-share-copy { display:flex; flex-direction:column; gap:4px; }
      .site-share-kicker { color:var(--blog-ink, #291b2d); font-size:.7rem; font-weight:850; letter-spacing:.08em; text-transform:uppercase; }
      .site-share-note { font-size:.74rem; line-height:1.4; }
      .site-share-links { display:flex; align-items:center; gap:7px; flex:0 0 auto; }
      .site-share-link { display:grid; place-items:center; width:31px; height:31px; color:var(--blog-ink, #291b2d); background:rgba(255,255,255,.82); border:1px solid rgba(83,49,94,.12); border-radius:50%; text-decoration:none; transition:color .18s ease, background .18s ease, transform .18s ease; }
      .site-share-link:hover, .site-share-link:focus-visible { color:#fff; background:linear-gradient(135deg, var(--blog-primary, #ff4d6d), var(--blog-secondary, #6a00f4)); transform:translateY(-2px); outline:none; }
      .site-share-link:focus-visible { box-shadow:0 0 0 3px rgba(255,77,109,.2); }
      .site-share-link svg { width:15px; height:15px; fill:currentColor; stroke:currentColor; stroke-width:1.4; }
      .site-share-link svg rect, .site-share-link svg circle { fill:none; }
      .site-share-link svg .site-share-dot { fill:currentColor; stroke:none; }
      @media (max-width:560px) { .site-share { align-items:flex-start; flex-direction:column; gap:11px; } .site-share-note { font-size:.72rem; } }
    `;
    document.head.appendChild(style);
  }

  function init() {
    addStyles();
    mountShareRow();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
}());
