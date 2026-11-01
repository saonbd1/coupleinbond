
/* Current CoupleIn theme reminder: preserve the playful, private, browser-only relationship reflection experience. This file handles quiz state without network requests. */

(function () {
  "use strict";

  const form = document.getElementById("compatibilityQuizForm");
  if (!form) return;

  const STORAGE_KEY = "cib-quiz-answers-v2";

  const questions = Array.from(form.querySelectorAll(".quiz-question"));
  const progressText = document.getElementById("quizProgressText");
  const progressBar = document.getElementById("quizProgressBar");
  const previousButton = document.getElementById("quizPrevious");
  const nextButton = document.getElementById("quizNext");
  const error = document.getElementById("quizError");
  const result = document.getElementById("compatibilityResult");
  const resultTitle = document.getElementById("resultTitle");
  const resultText = document.getElementById("resultText");
  const resultStrongArea = document.getElementById("resultStrongArea");
  const resultGrowthArea = document.getElementById("resultGrowthArea");
  const resultAction = document.getElementById("resultAction");
  const resultBars = document.getElementById("resultBars");
  const resultActions = document.getElementById("resultActions");
  const copyButton = document.getElementById("quizCopyResult");
  const partnerButton = document.getElementById("quizPartnerCompare");
  const resultCompare = document.getElementById("resultCompare");
  const turnNote = document.getElementById("quizTurnNote");
  const resetButton = document.getElementById("quizReset");
  let current = 0;
  let mode = "solo"; /* "solo" or "partnerB" */
  let soloScores = null; /* area scores of the first person during a compare flow */

  const areas = [
    { name: "Values and goals", questions: [0, 1, 2] },
    { name: "Communication", questions: [3, 4, 5] },
    { name: "Conflict repair", questions: [6, 7, 8] },
    { name: "Time and affection", questions: [9, 10, 11] },
    { name: "Shared direction", questions: [12, 13, 14] }
  ];

  function selectedValue(index) {
    const selected = questions[index].querySelector("input:checked");
    return selected ? Number(selected.value) : 0;
  }

  function answeredCount() {
    return questions.reduce((count, _, index) => count + (selectedValue(index) ? 1 : 0), 0);
  }

  /* --- localStorage: save, restore, clear (all in this browser, no network) --- */

  function saveAnswers() {
    try {
      const answers = {};
      questions.forEach((_, index) => {
        const value = selectedValue(index);
        if (value) answers["q" + (index + 1)] = value;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch (storageError) {
      /* Private browsing or storage disabled: keep the quiz usable without persistence. */
    }
  }

  function restoreAnswers() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      questions.forEach((question, index) => {
        const value = saved["q" + (index + 1)];
        const input = value ? question.querySelector('input[value="' + value + '"]') : null;
        if (input) input.checked = true;
      });
      const firstUnanswered = questions.findIndex((_, index) => !selectedValue(index));
      current = firstUnanswered === -1 ? questions.length - 1 : firstUnanswered;
    } catch (storageError) {
      /* Ignore malformed saved state and start fresh. */
    }
  }

  function clearAnswers() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (storageError) {
      /* Nothing to clean up if storage is unavailable. */
    }
  }

  function updateView() {
    questions.forEach((question, index) => {
      question.hidden = index !== current;
    });
    const number = current + 1;
    progressText.textContent = (mode === "partnerB" ? "Your partner · Question " : "Question ") + number + " of " + questions.length;
    /* Progress reflects answered questions, so the bar only reads 100% when the quiz is complete. */
    progressBar.style.width = (answeredCount() / questions.length) * 100 + "%";
    previousButton.hidden = current === 0;
    nextButton.textContent = current === questions.length - 1 ? "See our reflection" : "Next question";
    error.textContent = "";
    /* Hide any previous result so a stale reflection is never shown next to edited answers. */
    result.hidden = true;
    if (turnNote) {
      turnNote.hidden = mode !== "partnerB";
    }
  }

  function showError(message) {
    error.textContent = message;
  }

  function getAreaScores() {
    return areas.map((area) => ({
      name: area.name,
      score: area.questions.reduce((total, questionIndex) => total + selectedValue(questionIndex), 0),
      max: area.questions.length * 4
    }));
  }

  function getResultData() {
    const total = questions.reduce((sum, _, index) => sum + selectedValue(index), 0);
    const scores = getAreaScores();
    const max = Math.max.apply(null, scores.map((item) => item.score));
    const min = Math.min.apply(null, scores.map((item) => item.score));
    const strongestAreas = scores.filter((item) => item.score === max);
    const growthAreas = scores.filter((item) => item.score === min);
    const balanced = strongestAreas.length === scores.length;

    let title = "A gentle place to begin";
    let text = "Your answers point to a relationship that can benefit from one honest, low-pressure conversation.";
    if (total >= 45) {
      title = "A strong conversation base";
      text = "Your answers show several areas of alignment. Keep the good patterns visible and make room for new conversations as life changes.";
    } else if (total >= 32) {
      title = "Building together";
      text = "Your answers show a mix of shared ground and useful questions. A small weekly check-in can turn that curiosity into connection.";
    }

    const strongestText = balanced ? "Balanced across all areas" : strongestAreas.map((item) => item.name).join(" and ");
    const growthText = balanced ? "Any area — your answers are quite even" : growthAreas.map((item) => item.name).join(" and ");
    const action = balanced
      ? "Try this next: spend ten quiet minutes on any question that caught your attention. Ask, listen, and repeat back what you heard before you reply."
      : "Try this next: spend ten quiet minutes on one " + growthText.toLowerCase() + " question. Ask, listen, and repeat back what you heard before you reply.";

    return { total, scores, title, text, strongestText, growthText, balanced, action };
  }

  function barRow(label, value, max, compareLabel, color) {
    const row = document.createElement("div");
    row.className = compareLabel ? "compare-bar" : "result-bar-row";
    const name = document.createElement("span");
    name.className = "result-bar-name";
    name.textContent = compareLabel || label;
    const track = document.createElement("span");
    track.className = "result-bar-track";
    const fill = document.createElement("span");
    fill.className = "result-bar-fill";
    if (color) fill.style.background = color;
    fill.style.width = Math.round((value / max) * 100) + "%";
    track.appendChild(fill);
    const valueLabel = document.createElement("span");
    valueLabel.className = "result-bar-value";
    valueLabel.textContent = value + "/" + max;
    if (compareLabel) {
      const who = document.createElement("span");
      who.className = "compare-bar-who";
      who.textContent = label;
      row.appendChild(who);
      row.appendChild(track);
      row.appendChild(valueLabel);
    } else {
      row.appendChild(name);
      row.appendChild(track);
      row.appendChild(valueLabel);
    }
    return row;
  }

  function renderResult(data) {
    resultTitle.textContent = data.title;
    resultText.textContent = data.text + " This is a reflection prompt, not a prediction or a scientific compatibility score.";
    resultStrongArea.textContent = data.strongestText;
    resultGrowthArea.textContent = data.growthText;
    resultAction.textContent = data.action;
    resultBars.textContent = "";
    data.scores.forEach((area) => {
      resultBars.appendChild(barRow(area.name, area.score, area.max));
    });
    if (resultActions) resultActions.hidden = false;
    if (copyButton) copyButton.textContent = mode === "partnerB" ? "Copy our comparison" : "Copy my result";
    if (partnerButton) partnerButton.hidden = mode === "partnerB";
    resultCompare.hidden = true;
    resultCompare.textContent = "";
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function alignmentNote(difference) {
    if (difference <= 2) return "closely aligned";
    if (difference <= 4) return "worth a gentle conversation";
    return "a useful area to explore together";
  }

  function renderComparison(solo, partner) {
    resultTitle.textContent = "Two reflections, one conversation";
    resultText.textContent = "Here is how your two sets of answers compare, area by area. Where the bars differ, treat it as a question to explore, not a verdict on the relationship.";
    resultStrongArea.textContent = "See the area notes below";
    resultGrowthArea.textContent = "Nothing is stored or sent";
    resultAction.textContent = "Try this next: pick one area with the widest gap and give it ten quiet minutes. Each of you shares how you see it today, then one thing that would help.";
    resultBars.textContent = "";
    resultCompare.textContent = "";
    const heading = document.createElement("h4");
    heading.textContent = "How your answers compare";
    resultCompare.appendChild(heading);
    areas.forEach((area, index) => {
      const a = solo[index];
      const b = partner[index];
      const row = document.createElement("div");
      row.className = "compare-row";
      const name = document.createElement("span");
      name.className = "compare-row-name";
      name.textContent = area.name;
      const bars = document.createElement("div");
      bars.className = "compare-bars";
      bars.appendChild(barRow("You", a.score, a.max, "You"));
      bars.appendChild(barRow("Partner", b.score, b.max, "Partner", "linear-gradient(90deg, #6a00f4, #b5179e)"));
      const note = document.createElement("span");
      note.className = "compare-note";
      note.textContent = alignmentNote(Math.abs(a.score - b.score));
      row.appendChild(name);
      row.appendChild(bars);
      row.appendChild(note);
      resultCompare.appendChild(row);
    });
    if (resultActions) resultActions.hidden = false;
    if (copyButton) copyButton.textContent = "Copy our comparison";
    if (partnerButton) partnerButton.hidden = true;
    resultCompare.hidden = false;
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function buildShareText(solo, partner) {
    const lines = ["Couple in Bond — relationship reflection"];
    if (partner) {
      lines.push("");
      areas.forEach((_, index) => {
        lines.push(solo[index].name + ": you " + solo[index].score + "/" + solo[index].max + " · partner " + partner[index].score + "/" + partner[index].max);
      });
      lines.push("");
      lines.push("Take the quiz together: https://couplein.bond/compatibility-quiz.html");
      return lines.join("\n");
    }
    lines.push("Overall: " + getStrongestOverallLabel(solo));
    lines.push("");
    solo.forEach((area) => {
      lines.push(area.name + ": " + area.score + "/" + area.max);
    });
    lines.push("");
    lines.push("Take the quiz: https://couplein.bond/compatibility-quiz.html");
    return lines.join("\n");
  }

  function getStrongestOverallLabel(scores) {
    const total = scores.reduce((sum, area) => sum + area.score, 0);
    if (total >= 45) return "A strong conversation base";
    if (total >= 32) return "Building together";
    return "A gentle place to begin";
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showCopyConfirmation();
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.left = "-9999px";
    document.body.appendChild(helper);
    helper.select();
    try {
      document.execCommand("copy");
      showCopyConfirmation();
    } catch (copyError) {
      showError("Your browser blocked copying. You can select the result text instead.");
    }
    document.body.removeChild(helper);
  }

  function showCopyConfirmation() {
    const original = copyButton.textContent;
    copyButton.textContent = "Copied!";
    setTimeout(function () {
      copyButton.textContent = original;
    }, 2000);
  }

  function startPartnerTurn() {
    soloScores = getAreaScores();
    mode = "partnerB";
    form.reset();
    clearAnswers();
    current = 0;
    updateView();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function goNext() {
    if (!selectedValue(current)) {
      showError("Choose one answer before you continue.");
      return;
    }
    saveAnswers();
    if (current < questions.length - 1) {
      current += 1;
      updateView();
      return;
    }
    const data = getResultData();
    if (mode === "partnerB" && soloScores) {
      renderComparison(soloScores, data.scores);
    } else {
      renderResult(data);
    }
  }

  form.addEventListener("change", function () {
    error.textContent = "";
    saveAnswers();
  });

  /* Enter key advances the quiz, mirroring keyboard form flows. */
  form.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      goNext();
    }
  });

  previousButton.addEventListener("click", function () {
    if (current > 0) {
      current -= 1;
      updateView();
    }
  });

  nextButton.addEventListener("click", goNext);

  if (copyButton) {
    copyButton.addEventListener("click", function () {
      const data = getAreaScores();
      copyToClipboard(buildShareText(mode === "partnerB" ? soloScores || data : data, mode === "partnerB" ? data : null));
    });
  }

  if (partnerButton) {
    partnerButton.addEventListener("click", startPartnerTurn);
  }

  resetButton.addEventListener("click", function () {
    form.reset();
    current = 0;
    mode = "solo";
    soloScores = null;
    clearAnswers();
    result.hidden = true;
    updateView();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  restoreAnswers();
  updateView();
}());
