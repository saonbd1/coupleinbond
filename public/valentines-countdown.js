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
  var MONTH_BN = "ফেব্রুয়ারি";
  var DAY = 14;

  // Bengali numerals (০-৯). The timer renders in Bengali digits when the page
  // declares a Bengali locale, and in Latin digits everywhere else.
  var BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

  function toBengaliDigits(value) {
    return String(value).replace(/[0-9]/g, function (digit) {
      return BENGALI_DIGITS[Number(digit)];
    });
  }

  // One shared script serves both languages: only the digits and wording change.
  // The locale comes from data-locale on the countdown section, falling back to
  // the document language, so English pages keep their existing behaviour.
  var LOCALE = (function () {
    var declared = root.getAttribute("data-locale") || document.documentElement.getAttribute("lang") || "en";
    var isBengali = declared.toLowerCase().indexOf("bn") === 0;

    if (isBengali) {
      return {
        numerals: toBengaliDigits,
        target: function (date) {
          return toBengaliDigits(DAY + " " + MONTH_BN + ", " + date.getFullYear()) + " পর্যন্ত";
        },
        today: function (date) {
          return "আজকেই সেই দিন — " + toBengaliDigits(DAY + " " + MONTH_BN + ", " + date.getFullYear());
        },
        message: "আজ ভ্যালেন্টাইন ডে!"
      };
    }

    return {
      numerals: function (value) { return String(value); },
      target: function (date) {
        return "Until " + MONTH + " " + DAY + ", " + date.getFullYear();
      },
      today: function (date) {
        return "Today is the day — February 14, " + date.getFullYear();
      },
      message: "Happy Valentine's Day!"
    };
  }());

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function set(value, element, padDigits) {
    if (!element) {
      return;
    }
    var next = LOCALE.numerals(padDigits ? pad(value) : String(value));
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
        messageEl.textContent = LOCALE.message;
      }
      if (targetEl) {
        targetEl.textContent = LOCALE.today(target.date);
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
      targetEl.textContent = LOCALE.target(target.date);
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
