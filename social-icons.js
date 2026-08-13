// Current CoupleIn theme reminder: use small, warm, high-contrast social controls that support the existing coral/plum visual system.
(function () {
  "use strict";

  const socials = [
    {
      name: "Facebook",
      href: "https://www.facebook.com/",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.1V6.5c0-.7.5-1.1 1.2-1.1h1.5V3h-2.4C12.1 3 11 4.2 11 6.2v1.9H9v2.7h2v7.9h3v-7.9h2.3l.4-2.7H14Z"/></svg>'
    },
    {
      name: "X",
      href: "https://x.com/",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4.25h4.1l4.1 5.6 4.6-5.6h2.25l-5.75 6.95 6.5 8.55h-4.1l-4.62-6.12-5.02 6.12H4.3l6.15-7.48L4.5 4.25Zm3.2 1.7 8.1 11.85h2.05L9.75 5.95H7.7Z"/></svg>'
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.7" r="1.1" class="social-dot"/></svg>'
    },
    {
      name: "TikTok",
      href: "https://www.tiktok.com/",
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.2 3h3.1c.2 1.7 1.1 2.8 2.7 3.3v3.2c-1.1-.1-2.1-.4-3-1v6.2c0 3.4-2.2 5.3-5.2 5.3-2.8 0-4.9-1.9-4.9-4.6 0-2.8 2.2-4.8 5.3-4.8.4 0 .8 0 1.2.1v3.1c-.4-.1-.8-.2-1.2-.2-1.2 0-2.1.7-2.1 1.8 0 1 .8 1.7 1.8 1.7 1.4 0 2.3-.8 2.3-2.6V3Z"/></svg>'
    }
  ];

  function addStyles() {
    if (document.getElementById("coupleInSocialStyles")) return;
    const style = document.createElement("style");
    style.id = "coupleInSocialStyles";
    style.textContent = `
      .social-links { display:flex; align-items:center; justify-content:center; gap:10px; margin-top:12px; }
      .social-links-label { color:var(--blog-muted, var(--text-secondary, #6f6573)); font-size:.68rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
      .social-links-list { display:flex; align-items:center; gap:7px; }
      .social-link { display:grid; place-items:center; width:31px; height:31px; color:var(--blog-ink, var(--text-primary, #291b2d)); background:rgba(255,255,255,.78); border:1px solid rgba(83,49,94,.12); border-radius:50%; text-decoration:none; transition:transform .2s ease, color .2s ease, background .2s ease; }
      .social-link:hover, .social-link:focus-visible { color:#fff; background:linear-gradient(135deg, var(--blog-primary, var(--primary, #ff4d6d)), var(--blog-secondary, var(--secondary, #6a00f4))); transform:translateY(-2px); outline:none; }
      .social-link svg { width:15px; height:15px; fill:currentColor; stroke:currentColor; stroke-width:1.4; }
      .social-link svg rect, .social-link svg circle { fill:none; }
      .social-link svg .social-dot { fill:currentColor; stroke:none; }
      @media (max-width:560px) { .social-links { justify-content:flex-start; flex-wrap:wrap; } }
    `;
    document.head.appendChild(style);
  }

  function inject() {
    addStyles();
    document.querySelectorAll(".site-footer, .blog-footer, .footer").forEach((footer) => {
      if (footer.querySelector(".social-links")) return;
      const links = socials.map(({ name, href, icon }) => `<a class="social-link" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${name}">${icon}</a>`).join("");
      footer.insertAdjacentHTML("beforeend", `<div class="social-links" aria-label="Social links"><span class="social-links-label">Follow along</span><span class="social-links-list">${links}</span></div>`);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inject);
  else inject();
}());
