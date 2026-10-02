/* Current CoupleIn theme reminder: preserve the playful, private, browser-only relationship reflection experience. This file handles quiz state without network requests. */

(function () {
  "use strict";

  const form = document.getElementById("compatibilityQuizForm");
  if (!form) return;

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
  const resetButton = document.getElementById("quizReset");
  let current = 0;

  const areas = [
    { name: "Values and goals", questions: [0, 1] },
    { name: "Communication", questions: [2, 3] },
    { name: "Conflict repair", questions: [4, 8] },
    { name: "Time and affection", questions: [5, 6] },
    { name: "Shared direction", questions: [7, 9] }
  ];

  function selectedValue(index) {
    const selected = questions[index].querySelector("input:checked");
    return selected ? Number(selected.value) : 0;
  }

  function updateView() {
    questions.forEach((question, index) => {
      question.hidden = index !== current;
    });
    const number = current + 1;
    progressText.textContent = `Question ${number} of ${questions.length}`;
    progressBar.style.width = `${(number / questions.length) * 100}%`;
    previousButton.hidden = current === 0;
    nextButton.textContent = current === questions.length - 1 ? "See my reflection" : "Next question";
    error.textContent = "";
  }

  function showError(message) {
    error.textContent = message;
  }

  function getAreaScores() {
    return areas.map((area) => ({
      name: area.name,
      score: area.questions.reduce((total, questionIndex) => total + selectedValue(questionIndex), 0)
    }));
  }

  function showResult() {
    const total = questions.reduce((sum, _, index) => sum + selectedValue(index), 0);
    const scores = getAreaScores();
    const strongest = scores.reduce((best, item) => item.score > best.score ? item : best, scores[0]);
    const growth = scores.reduce((lowest, item) => item.score < lowest.score ? item : lowest, scores[0]);
    let title = "A gentle place to begin";
    let text = "Your answers point to a relationship that can benefit from one honest, low-pressure conversation.";
    if (total >= 30) {
      title = "A strong conversation base";
      text = "Your answers show several areas of alignment. Keep the good patterns visible and make room for new conversations as life changes.";
    } else if (total >= 21) {
      title = "Building together";
      text = "Your answers show a mix of shared ground and useful questions. A small weekly check-in can turn that curiosity into connection.";
    }
    resultTitle.textContent = title;
    resultText.textContent = `${text} This is a reflection prompt, not a prediction or a scientific compatibility score.`;
    resultStrongArea.textContent = strongest.name;
    resultGrowthArea.textContent = growth.name;
    resultAction.textContent = `Try this next: spend ten quiet minutes on one ${growth.name.toLowerCase()} question. Ask, listen, and repeat back what you heard before you reply.`;
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  form.addEventListener("change", () => {
    error.textContent = "";
  });

  previousButton.addEventListener("click", () => {
    if (current > 0) {
      current -= 1;
      updateView();
    }
  });

  nextButton.addEventListener("click", () => {
    if (!selectedValue(current)) {
      showError("Choose one answer before you continue.");
      return;
    }
    if (current < questions.length - 1) {
      current += 1;
      updateView();
      return;
    }
    showResult();
  });

  resetButton.addEventListener("click", () => {
    form.reset();
    current = 0;
    result.hidden = true;
    updateView();
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  updateView();
}());
