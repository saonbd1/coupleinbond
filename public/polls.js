// CoupleIn interaction reminder: keep voting transparent, reversible per browser, and free of fabricated aggregate results.
(function () {
  "use strict";

  const list = document.getElementById("pollsList");
  if (!list) return;

  // The poll cards ship in the page HTML (rendered by src/pages/polls.astro from the
  // polls collection) so the whole directory - 42 links, questions, descriptions and
  // option sets - exists for crawlers and for readers with JavaScript disabled.
  // This script no longer builds cards; it only wires voting behaviour on the nodes
  // that are already there and windows them for pagination. Keeping the node
  // references alive is what lets the form listeners survive paging.
  const VOTES_KEY = "coupleinbond-poll-votes-v1";
  const RESULTS_KEY = "coupleinbond-poll-results-v1";
  const empty = document.getElementById("pollsEmpty");
  const pagination = document.getElementById("pollsPagination");
  const query = new URLSearchParams(window.location.search);
  const requestedTopic = query.get("topic");
  const validTopics = new Set(["all", "connection", "relationships", "date-night", "seasonal"]);
  let activeTopic = validTopics.has(requestedTopic) ? requestedTopic : "all";

  const polls = Array.from(list.querySelectorAll(".poll-card")).map((card) => ({
    card,
    id: card.dataset.pollId,
    topic: card.dataset.topic,
    title: (card.querySelector(".poll-card-title-link") || {}).textContent?.trim() || "",
    description: (card.querySelector(".poll-card-description") || {}).textContent?.trim() || "",
    options: Array.from(card.querySelectorAll(".poll-option")).map((label) => label.textContent.trim()),
    form: card.querySelector(".poll-form"),
    inputs: Array.from(card.querySelectorAll('input[type="radio"]')),
    submit: card.querySelector(".poll-submit"),
    share: card.querySelector(".poll-share"),
    shareStatus: card.querySelector(".poll-share-status"),
    feedback: card.querySelector(".poll-feedback"),
    results: card.querySelector(".poll-results"),
  }));

  // Listing pagination: the page split happens in the browser, so the reader can
  // switch between 6, 8 and 10 polls per page. The default size matches the blog
  // listing so both feel like one system.
  const DEFAULT_PAGE_SIZE = 6;
  const ALLOWED_PAGE_SIZES = [6, 8, 10];
  let pageSize = DEFAULT_PAGE_SIZE;
  const requestedSize = Number(query.get("size"));
  if (ALLOWED_PAGE_SIZES.indexOf(requestedSize) !== -1) pageSize = requestedSize;
  let currentPage = 1;

  function readStorage(key, fallback) {
    try {
      const value = window.localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // The interface still works for this session if storage is unavailable.
    }
  }

  function resultCounts(poll, results) {
    const counts = Array.isArray(results[poll.id]) ? results[poll.id].slice(0, poll.options.length) : [];
    while (counts.length < poll.options.length) counts.push(0);
    return counts.map((count) => Number.isFinite(count) ? count : 0);
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  // Fills the results block that the card already carries. Nothing is invented: with
  // no local votes the block explains that this browser has not voted yet.
  function renderResults(poll, counts, selectedIndex) {
    const container = poll.results;
    if (!container) return;
    container.innerHTML = "";
    const total = counts.reduce((sum, count) => sum + count, 0);
    const heading = createElement("div", "poll-results-heading");
    heading.append(createElement("span", "", "Results"), createElement("span", "", `${total} vote${total === 1 ? "" : "s"}`));
    container.append(heading);

    if (total === 0) {
      container.append(createElement("p", "poll-feedback", "No votes yet. You could start this one."));
      container.hidden = false;
      return;
    }

    poll.options.forEach((option, index) => {
      const row = createElement("div", "poll-result-row");
      const label = createElement("span", "poll-result-label", option);
      const track = createElement("span", "poll-result-track");
      const fill = createElement("span", "poll-result-fill");
      const percent = Math.round((counts[index] / total) * 100);
      fill.style.width = `${percent}%`;
      track.append(fill);
      row.append(label, track, createElement("span", "poll-result-percent", `${percent}%`));
      if (index === selectedIndex) row.dataset.selected = "true";
      container.append(row);
    });
    container.hidden = false;
  }

  // Restores the saved choice for this browser, or leaves the form ready to vote.
  function applyVoteState(poll, votes, results) {
    const selected = Number.isInteger(votes[poll.id]) ? votes[poll.id] : null;
    poll.inputs.forEach((input, index) => {
      input.checked = selected === index;
      input.disabled = selected !== null;
    });
    if (poll.submit) {
      poll.submit.textContent = selected === null ? "Vote on this topic" : "Vote recorded";
      poll.submit.disabled = selected !== null;
    }
    if (poll.feedback) poll.feedback.textContent = "";
    if (poll.results) {
      if (selected === null) {
        poll.results.innerHTML = "";
        poll.results.hidden = true;
      } else {
        renderResults(poll, resultCounts(poll, results), selected);
      }
    }
  }

  async function sharePoll(poll, button, status) {
    const url = new URL(`polls/${poll.id}.html`, window.location.href).href;
    try {
      if (navigator.share) {
        await navigator.share({ title: poll.title, text: poll.description, url });
        status.textContent = "Poll shared.";
        return;
      }
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const helper = document.createElement("textarea");
        helper.value = url;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";
        document.body.appendChild(helper);
        helper.select();
        document.execCommand("copy");
        helper.remove();
      }
      status.textContent = "Poll link copied.";
    } catch (error) {
      if (error && error.name === "AbortError") return;
      status.textContent = "Unable to share. Copy the page URL from your browser.";
    } finally {
      button.disabled = false;
      button.textContent = "Share poll";
    }
  }

  function pageCountFor(total) {
    return Math.max(1, Math.ceil(total / pageSize));
  }

  function syncPageSizeOptions() {
    document.querySelectorAll("[data-page-size]").forEach((option) => {
      const isCurrent = Number(option.dataset.pageSize) === pageSize;
      option.classList.toggle("is-current", isCurrent);
      if (isCurrent) {
        option.setAttribute("aria-current", "true");
        option.setAttribute("aria-label", `${option.dataset.pageSize} polls per page, current`);
      } else {
        option.removeAttribute("aria-current");
      }
    });
  }

  function buildPaginationControls(totalPages) {
    if (!pagination) return;
    pagination.innerHTML = "";
    if (totalPages <= 1) return;

    const nav = createElement("nav", "pagination", "");
    nav.setAttribute("aria-label", "Poll pages");

    const step = (label, target, disabled, rel) => {
      if (disabled) {
        const span = createElement("span", "pagination-step is-disabled", label);
        span.setAttribute("aria-hidden", "true");
        return span;
      }
      const link = createElement("a", "pagination-step", label);
      link.href = `#polls-page-${target}`;
      link.setAttribute("rel", rel);
      link.addEventListener("click", (event) => {
        event.preventDefault();
        goToPage(target);
      });
      return link;
    };

    nav.append(step("← Previous", currentPage - 1, currentPage === 1, "prev"));

    const pages = createElement("ul", "pagination-pages");
    for (let page = 1; page <= totalPages; page += 1) {
      if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 1) continue;
      const item = createElement("li", "");
      if (page === currentPage) {
        const current = createElement("span", "pagination-number is-current", String(page));
        current.setAttribute("aria-current", "page");
        current.setAttribute("aria-label", `Page ${page}, current page`);
        item.append(current);
      } else {
        const link = createElement("a", "pagination-number", String(page));
        link.href = `#polls-page-${page}`;
        link.setAttribute("aria-label", `Go to page ${page}`);
        link.addEventListener("click", (event) => {
          event.preventDefault();
          goToPage(page);
        });
        item.append(link);
      }
      pages.append(item);
    }
    nav.append(pages);

    nav.append(step("Next →", currentPage + 1, currentPage === totalPages, "next"));
    pagination.append(nav);
  }

  function goToPage(page) {
    currentPage = page;
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(page));
    window.history.replaceState({}, "", url);
    render();
    if (list && typeof list.scrollIntoView === "function") {
      list.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function render() {
    const votes = readStorage(VOTES_KEY, {});
    const results = readStorage(RESULTS_KEY, {});
    const visible = polls.filter((poll) => activeTopic === "all" || poll.topic === activeTopic);
    const totalPages = pageCountFor(visible.length);
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * pageSize;
    const pagePolls = visible.slice(start, start + pageSize);
    // Re-attach the existing nodes instead of rebuilding them: the card markup is the
    // single source of truth and the listeners bound once below stay attached.
    list.innerHTML = "";
    pagePolls.forEach((poll) => list.append(poll.card));
    polls.forEach((poll) => applyVoteState(poll, votes, results));
    empty.hidden = visible.length > 0;
    buildPaginationControls(totalPages);
    syncPageSizeOptions();
    document.querySelectorAll(".topic-filter button").forEach((button) => {
      const isActive = button.dataset.topic === activeTopic;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  // One vote per topic per browser, stored locally. The card nodes live for the whole
  // session, so these listeners are bound once rather than on every render.
  polls.forEach((poll) => {
    if (!poll.form) return;
    poll.form.addEventListener("submit", (event) => {
      event.preventDefault();
      const selected = poll.form.querySelector("input:checked");
      if (!selected) {
        if (poll.feedback) poll.feedback.textContent = "Choose an option first.";
        return;
      }
      const index = Number(selected.value);
      const nextVotes = readStorage(VOTES_KEY, {});
      const nextResults = readStorage(RESULTS_KEY, {});
      if (Number.isInteger(nextVotes[poll.id])) return;
      const counts = resultCounts(poll, nextResults);
      counts[index] += 1;
      nextVotes[poll.id] = index;
      nextResults[poll.id] = counts;
      writeStorage(VOTES_KEY, nextVotes);
      writeStorage(RESULTS_KEY, nextResults);
      render();
    });
    if (poll.share) {
      poll.share.addEventListener("click", async () => {
        const button = poll.share;
        button.disabled = true;
        button.textContent = "Preparing…";
        await sharePoll(poll, button, poll.shareStatus);
      });
    }
  });

  document.querySelectorAll(".topic-filter button").forEach((button) => {
    button.addEventListener("click", () => {
      activeTopic = button.dataset.topic;
      currentPage = 1;
      render();
    });
  });

  // "Show N per page" links switch the page size without a reload.
  document.querySelectorAll("[data-page-size]").forEach((option) => {
    option.addEventListener("click", (event) => {
      event.preventDefault();
      const size = Number(option.dataset.pageSize);
      if (ALLOWED_PAGE_SIZES.indexOf(size) === -1 || size === pageSize) return;
      pageSize = size;
      currentPage = 1;
      const url = new URL(window.location.href);
      url.searchParams.set("size", String(pageSize));
      url.searchParams.delete("page");
      window.history.replaceState({}, "", url);
      render();
    });
  });

  // Deep link support: /polls.html?page=3 opens that page of the listing.
  const requestedPage = Number(query.get("page"));
  if (Number.isInteger(requestedPage) && requestedPage > 1) currentPage = requestedPage;

  render();
}());
