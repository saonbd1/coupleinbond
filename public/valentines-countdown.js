// Current CoupleIn theme reminder: keep the countdown big, warm, and legible inside the coral/plum visual system.
(function () {
  "use strict";

  var root = document.getElementById("valentinesCountdown");
  if (!root) {
    return;
  }

  var daysEl = document.getElementById("cdDays");
  var hoursEl = document.getElementById("cdHours");
  var minutesEl = document.getElementById("cdMinutes");
  var secondsEl = document.getElementById("cdSeconds");
  var targetEl = document.getElementById("valentinesCountdownTarget");
  var messageEl = document.getElementById("valentinesCountdownMessage");

  var MONTH = "February";
  var DAY = 14;

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function set(value, element, padDigits) {
    if (!element) {
      return;
    }
    var next = padDigits ? pad(value) : String(value);
    if (element.textContent !== next) {
      element.textContent = next;
    }
  }

  // Returns the exact Feb 14 midnight (local) we are counting down toward.
  // On Feb 14 itself it resolves to that day's midnight, so the timer sits at
  // zero and the page celebrates instead of pointing at next year.
  function resolveTarget(now) {
    var year = now.getFullYear();
    var startOfToday = new Date(year, 1, DAY, 0, 0, 0, 0);
    var endOfToday = new Date(year, 1, DAY + 1, 0, 0, 0, 0);

    if (now < startOfToday) {
      return { date: startOfToday, isToday: false };
    }
    if (now < endOfToday) {
      return { date: startOfToday, isToday: true };
    }
    return { date: new Date(year + 1, 1, DAY, 0, 0, 0, 0), isToday: false };
  }

  function tick() {
    var now = new Date();
    var target = resolveTarget(now);
    var diff = target.date.getTime() - now.getTime();

    if (target.isToday || diff <= 0) {
      set(0, daysEl, false);
      set(0, hoursEl, true);
      set(0, minutesEl, true);
      set(0, secondsEl, true);
      root.classList.add("is-today");
      if (messageEl) {
        messageEl.textContent = "Happy Valentine's Day!";
      }
      if (targetEl) {
        targetEl.textContent = "Today is the day \u2014 February 14, " + target.date.getFullYear();
      }
      return;
    }

    root.classList.remove("is-today");

    var totalSeconds = Math.floor(diff / 1000);
    var days = Math.floor(totalSeconds / 86400);
    var hours = Math.floor(totalSeconds / 3600) % 24;
    var minutes = Math.floor(totalSeconds / 60) % 60;
    var seconds = totalSeconds % 60;

    set(days, daysEl, false);
    set(hours, hoursEl, true);
    set(minutes, minutesEl, true);
    set(seconds, secondsEl, true);

    if (targetEl) {
      targetEl.textContent = "Until " + MONTH + " " + DAY + ", " + target.date.getFullYear();
    }
    if (messageEl) {
      messageEl.textContent = "";
    }
  }

  // Align the first tick to the next whole second, then run every second.
  tick();
  setTimeout(function () {
    tick();
    setInterval(tick, 1000);
  }, 1000 - (Date.now() % 1000));
}());
