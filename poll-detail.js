(function () {
  "use strict";

  const id = document.body.dataset.pollId;
  const poll = window.getCouplePoll ? window.getCouplePoll(id) : null;
  const votesKey = "coupleinbond-poll-votes-v1";
  const resultsKey = "coupleinbond-poll-results-v1";
  const form = document.getElementById("pollDetailForm");
  const options = document.getElementById("pollDetailOptions");
  const submit = document.getElementById("pollDetailSubmit");
  const feedback = document.getElementById("pollDetailFeedback");
  const results = document.getElementById("pollDetailResults");

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) {}
  }

  function counts() {
    const all = read(resultsKey, {});
    const values = Array.isArray(all[id]) ? all[id].slice(0, poll.options.length) : [];
    while (values.length < poll.options.length) values.push(0);
    return values.map((value) => Number.isFinite(value) ? value : 0);
  }

  function renderResults(selected) {
    const values = counts();
    const total = values.reduce((sum, value) => sum + value, 0);
    results.innerHTML = `<div class="poll-detail-results-heading"><strong>Local results</strong><span>${total} vote${total === 1 ? "" : "s"}</span></div>`;
    if (!total) {
      results.insertAdjacentHTML("beforeend", "<p class=\"poll-feedback\">No votes yet. You could start this one.</p>");
      return;
    }
    values.forEach((value, index) => {
      const percent = Math.round((value / total) * 100);
      const row = document.createElement("div");
      row.className = "poll-detail-result-row";
      if (index === selected) row.dataset.selected = "true";
      row.innerHTML = `<span>${poll.options[index]}</span><span class="poll-detail-result-track"><span style="width:${percent}%"></span></span><strong>${percent}%</strong>`;
      results.append(row);
    });
  }

  function render() {
    if (!poll) return;
    const savedVotes = read(votesKey, {});
    const selected = Number.isInteger(savedVotes[id]) ? savedVotes[id] : null;
    options.innerHTML = "";
    poll.options.forEach((option, index) => {
      const label = document.createElement("label");
      label.className = "poll-detail-option";
      label.innerHTML = `<input type="radio" name="poll-answer" value="${index}" ${selected === index ? "checked" : ""} ${selected !== null ? "disabled" : ""}><span>${option}</span>`;
      options.append(label);
    });
    submit.disabled = selected !== null;
    submit.textContent = selected === null ? "Vote on this topic" : "Vote recorded";
    if (selected !== null) renderResults(selected);
  }

  if (!poll || !form) return;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const selectedInput = form.querySelector("input:checked");
    if (!selectedInput) {
      feedback.textContent = "Choose an option first.";
      return;
    }
    const selected = Number(selectedInput.value);
    const savedVotes = read(votesKey, {});
    if (Number.isInteger(savedVotes[id])) return;
    const allResults = read(resultsKey, {});
    const values = counts();
    values[selected] += 1;
    savedVotes[id] = selected;
    allResults[id] = values;
    write(votesKey, savedVotes);
    write(resultsKey, allResults);
    feedback.textContent = "Your vote is recorded on this device.";
    render();
  });

  render();
}());
