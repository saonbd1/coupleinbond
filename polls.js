// CoupleIn interaction reminder: keep voting transparent, reversible per browser, and free of fabricated aggregate results.
(function () {
  "use strict";

  const POLLS = [
    {
      id: "date-night-mood",
      topic: "date-night",
      label: "Date night",
      question: "What kind of date night sounds best this week?",
      options: ["A cozy night at home", "An unplanned adventure", "A long dinner and good conversation", "A little of everything"]
    },
    {
      id: "connection-ritual",
      topic: "connection",
      label: "Connection",
      question: "What helps two people feel most connected?",
      options: ["Small acts of care", "Uninterrupted conversation", "Shared goals", "Laughing together"]
    },
    {
      id: "weekly-ritual",
      topic: "connection",
      label: "Connection",
      question: "What should a couple make time for this week?",
      options: ["A tech-free meal", "A walk with no agenda", "A shared creative project", "A sincere check-in"]
    },
    {
      id: "family-marriage-lasted-longer",
      topic: "relationships",
      label: "Relationships",
      question: "Do you believe Family Marriage Lasted Longer?",
      options: ["Yes, family-arranged marriages can last longer", "No, love marriages can last longer", "It depends on the couple", "I’m not sure"]
    },
    {
      id: "seasonal-mood",
      topic: "seasonal",
      label: "Seasonal",
      question: "Which Valentine’s Day mood fits you best?",
      options: ["Thoughtful and low-key", "Playful and spontaneous", "Classic and romantic", "Friends-first celebration"]
    }
  ];

  const VOTES_KEY = "coupleinbond-poll-votes-v1";
  const RESULTS_KEY = "coupleinbond-poll-results-v1";
  const list = document.getElementById("pollsList");
  const empty = document.getElementById("pollsEmpty");
  const requestedTopic = new URLSearchParams(window.location.search).get("topic");
  const validTopics = new Set(["all", "connection", "relationships", "date-night", "seasonal"]);
  let activeTopic = validTopics.has(requestedTopic) ? requestedTopic : "all";

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

  function renderResults(container, poll, counts, selectedIndex) {
    const total = counts.reduce((sum, count) => sum + count, 0);
    const results = createElement("div", "poll-results");
    const heading = createElement("div", "poll-results-heading");
    heading.append(createElement("span", "", "Results"), createElement("span", "", `${total} vote${total === 1 ? "" : "s"}`));
    results.append(heading);

    if (total === 0) {
      results.append(createElement("p", "poll-feedback", "No votes yet. You could start this one."));
      container.append(results);
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
      results.append(row);
    });
    container.append(results);
  }

  function renderPoll(poll, votes, results) {
    const card = createElement("article", "poll-card");
    const top = createElement("div", "poll-card-top");
    top.append(createElement("span", "poll-card-tag", poll.label), createElement("span", "", "One choice"));
    card.append(top, createElement("h3", "", poll.question));

    const form = document.createElement("form");
    form.className = "poll-form";
    const options = document.createElement("fieldset");
    options.className = "poll-options";
    options.setAttribute("aria-label", poll.question);
    const selectedBefore = Number.isInteger(votes[poll.id]) ? votes[poll.id] : null;

    poll.options.forEach((option, index) => {
      const label = createElement("label", "poll-option");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = poll.id;
      input.value = String(index);
      input.checked = selectedBefore === index;
      input.disabled = selectedBefore !== null;
      label.append(input, createElement("span", "", option));
      options.append(label);
    });

    const submit = createElement("button", "poll-submit", selectedBefore === null ? "Vote on this topic" : "Vote recorded");
    submit.type = "submit";
    submit.disabled = selectedBefore !== null;
    const feedback = createElement("p", "poll-feedback");
    feedback.setAttribute("aria-live", "polite");
    form.append(options, submit, feedback);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const selected = form.querySelector("input:checked");
      if (!selected) {
        feedback.textContent = "Choose an option first.";
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
    card.append(form);
    if (selectedBefore !== null) renderResults(card, poll, resultCounts(poll, results), selectedBefore);
    return card;
  }

  function render() {
    const votes = readStorage(VOTES_KEY, {});
    const results = readStorage(RESULTS_KEY, {});
    const visible = POLLS.filter((poll) => activeTopic === "all" || poll.topic === activeTopic);
    list.innerHTML = "";
    visible.forEach((poll) => list.append(renderPoll(poll, votes, results)));
    empty.hidden = visible.length > 0;
    document.querySelectorAll(".topic-filter button").forEach((button) => {
      const isActive = button.dataset.topic === activeTopic;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  document.querySelectorAll(".topic-filter button").forEach((button) => {
    button.addEventListener("click", () => {
      activeTopic = button.dataset.topic;
      render();
    });
  });

  render();
}());
