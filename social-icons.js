// Current CoupleIn theme reminder: use small, warm, high-contrast social controls that support the existing coral/plum visual system.
(function () {
  "use strict";

  /* Design reminder: Editorial Bloom — keep the footer airy and centered, let the links carry the navigation, and avoid generic section-heading labels. */

  const socials = [
    { name: "Facebook", href: "https://www.facebook.com/", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.1V6.5c0-.7.5-1.1 1.2-1.1h1.5V3h-2.4C12.1 3 11 4.2 11 6.2v1.9H9v2.7h2v7.9h3v-7.9h2.3l.4-2.7H14Z"/></svg>' },
    { name: "X", href: "https://x.com/", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.25h4.1l4.1 5.6 4.6-5.6h2.25l-5.75 6.95 6.5 8.55h-4.1l-4.62-6.12-5.02 6.12H4.3l6.15-7.48L4.5 4.25Zm3.2 1.7 8.1 11.85h2.05L9.75 5.95H7.7Z"/></svg>' },
    { name: "Instagram", href: "https://www.instagram.com/", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1.1" class="social-dot"/></svg>' },
    { name: "TikTok", href: "https://www.tiktok.com/", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 3h3.1c.2 1.7 1.1 2.8 2.7 3.3v3.2c-1.1-.1-2.1-.4-3-1v6.2c0 3.4-2.2 5.3-5.2 5.3-2.8 0-4.9-1.9-4.9-4.6 0-2.8 2.2-4.8 5.3-4.8.4 0 .8 0 1.2.1v3.1c-.4-.1-.8-.2-1.2-.2-1.2 0-2.1.7-2.1 1.8 0 1 .8 1.7 1.8 1.7 1.4 0 2.3-.8 2.3-2.6V3Z"/></svg>' }
  ];

  function addStyles() {
    if (document.getElementById("coupleInSocialStyles")) return;
    const style = document.createElement("style");
    style.id = "coupleInSocialStyles";
    style.textContent = `
      .site-footer, .blog-footer { display:block !important; width:min(1120px,100%); margin:42px auto 0; padding:0 !important; overflow:hidden; color:var(--blog-muted, #6f6573); background:rgba(255,255,255,.93); border:1px solid rgba(255,255,255,.75); border-radius:22px; box-shadow:0 18px 50px rgba(73,34,86,.1); }
      .footer-grid { display:grid; grid-template-columns:minmax(0,1fr) minmax(220px,.9fr) minmax(0,1fr); gap:clamp(28px,5vw,72px); align-items:start; padding:38px clamp(24px,5vw,54px) 34px; }
      .footer-section { min-width:0; }
      .footer-brand-section { text-align:center; }
      .footer-brand-mark { display:inline-block; margin-bottom:14px; color:var(--blog-primary, #ff4d6d); font-size:1.28rem; font-weight:900; text-decoration:none; }
      .footer-section p { max-width:290px; margin:0; color:var(--blog-muted, #6f6573); font-size:.84rem; line-height:1.65; }
      .footer-brand-section p { margin-right:auto; margin-left:auto; }
      .footer-copyright { margin-top:22px !important; font-size:.74rem !important; }
      .footer-left, .footer-right { text-align:center; }
      .footer-nav-links { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:11px; text-align:center; }
      .footer-nav-links a { color:var(--blog-muted, #6f6573); font-size:.9rem; font-weight:800; text-align:center; text-decoration:none; transition:color .18s ease, transform .18s ease; }
      .footer-nav-links a:hover { color:var(--blog-primary, #ff4d6d); transform:translateY(-1px); }
      .footer-nav-links a:focus-visible { color:var(--blog-primary, #ff4d6d); outline:3px solid rgba(255,77,109,.24); outline-offset:3px; }
      .footer-cta { display:inline-flex; margin-top:17px; padding:10px 14px; color:#fff !important; background:linear-gradient(135deg, var(--blog-primary, #ff4d6d), var(--blog-secondary, #6a00f4)); border-radius:999px; font-size:.78rem !important; font-weight:850 !important; text-decoration:none; }
      .social-links { display:flex; align-items:center; justify-content:center; flex-wrap:wrap; gap:10px; margin-top:20px; }
      .social-links-label { width:100%; color:var(--blog-muted, #6f6573); font-size:.7rem; font-weight:850; letter-spacing:.08em; text-transform:uppercase; }
      .social-links-list { display:flex; align-items:center; gap:7px; }
      .social-link { display:grid; place-items:center; width:31px; height:31px; color:var(--blog-ink, #291b2d); background:rgba(255,255,255,.78); border:1px solid rgba(83,49,94,.12); border-radius:50%; text-decoration:none; transition:transform .2s ease, color .2s ease, background .2s ease; }
      .social-link:hover, .social-link:focus-visible { color:#fff; background:linear-gradient(135deg, var(--blog-primary, #ff4d6d), var(--blog-secondary, #6a00f4)); transform:translateY(-2px); outline:none; }
      .social-link svg { width:15px; height:15px; fill:currentColor; stroke:currentColor; stroke-width:1.4; }
      .social-link svg rect, .social-link svg circle { fill:none; }
      .social-link svg .social-dot { fill:currentColor; stroke:none; }
      .footer-bottom { display:flex; justify-content:space-between; gap:18px; padding:15px clamp(24px,5vw,54px); color:var(--blog-muted, #6f6573); background:linear-gradient(90deg, rgba(255,241,245,.72), rgba(246,239,255,.72)); border-top:1px solid rgba(83,49,94,.1); font-size:.72rem; }
      .footer-bottom p { max-width:none; margin:0; font-size:inherit; }
      @media (min-width:821px) { .footer-brand-mark { font-size:1.38rem; } .footer-section p { font-size:.92rem; } .footer-copyright { font-size:.8rem !important; } .footer-nav-links a { font-size:1rem; } .footer-cta { font-size:.84rem !important; } .social-links-label { font-size:.76rem; } .footer-bottom { font-size:.8rem; } }
      @media (max-width:820px) { .footer-grid { grid-template-columns:1fr 1fr; gap:28px; } .footer-brand-section { grid-column:1 / -1; grid-row:1; } .footer-left { grid-column:1; grid-row:2; } .footer-right { grid-column:2; grid-row:2; } }
      @media (max-width:560px) { .footer-grid { grid-template-columns:1fr; gap:28px; padding:30px 22px 26px; } .footer-brand-section, .footer-left, .footer-right { grid-column:auto; grid-row:auto; text-align:center; } .footer-section p { margin-right:auto; margin-left:auto; } .footer-bottom { display:block; padding:14px 22px; } .footer-bottom p + p { margin-top:6px; } }
    `;
    document.head.appendChild(style);
  }

  function pageRoot() {
    return window.location.pathname.includes("/blog-posts/") ? ".." : ".";
  }

  function renderFooter(footer) {
    if (footer.querySelector(".footer-grid")) return;
    const root = pageRoot();
    footer.innerHTML = `
      <div class="footer-grid">
        <section class="footer-section footer-left">
            <nav class="footer-nav-links" aria-label="Footer navigation">
              <a href="${root}/index.html">Home Page</a>
              <a href="${root}/calculator.html">Love Calculator</a>
              <a href="${root}/blog.html">Blog Post</a>
              <a href="${root}/polls.html">Public Polls</a>
          </nav>
        </section>
        <section class="footer-section footer-brand-section">
          <a class="footer-brand-mark" href="${root}/index.html">💕 Couple in Bond</a>
          <p>Playful tools, thoughtful words, and small rituals for the people who matter.</p>
          <p class="footer-copyright">Made for lighthearted connection and shared moments.</p>
          <a class="footer-cta" href="${root}/calculator.html#calcBtn">Try the calculator</a>
          <div class="social-links" aria-label="Social links"><span class="social-links-label">Follow along</span><span class="social-links-list">${socials.map(({ name, href, icon }) => `<a class="social-link" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${name}">${icon}</a>`).join("")}</span></div>
        </section>
        <section class="footer-section footer-right">
          <nav class="footer-nav-links" aria-label="More footer navigation">
            <a href="${root}/quotes.html">Love Quotes</a>
            <a href="${root}/valentines-day.html">Valentine’s Day</a>
            <a href="${root}/about.html">About Us</a>
            <a href="${root}/privacy.html">Privacy</a>
            <a href="${root}/contact.html">Contact</a>
          </nav>
        </section>
      </div>
      <div class="footer-bottom"><p>© 2026 Couple in Bond. All rights reserved.</p><p>Wallet connection stays available in the header.</p></div>
    `;
  }

  function inject() {
    addStyles();
    document.querySelectorAll(".site-footer, .blog-footer, .footer").forEach(renderFooter);
    if (!document.querySelector('script[data-couple-share="true"]')) {
      const shareScript = document.createElement("script");
      shareScript.src = `${pageRoot()}/social-share.js`;
      shareScript.defer = true;
      shareScript.dataset.coupleShare = "true";
      document.head.appendChild(shareScript);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
  else inject();
}());
