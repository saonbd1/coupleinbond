/* Design reminder: Editorial Bloom — keep community notes warm, readable, and honest about browser-only storage. Never seed messages or present local notes as public testimonials. */
(function () {
  "use strict";

  const STORAGE_KEY = "coupleinbond-guestbook-v1";
  const form = document.getElementById("guestBookForm");
  const nameInput = document.getElementById("guestName");
  const messageInput = document.getElementById("guestMessage");
  const list = document.getElementById("guestBookList");
  const feedback = document.getElementById("guestBookFeedback");
  const count = document.getElementById("guestBookCount");

  function readEntries() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed.filter((entry) => entry && typeof entry.message === "string") : [];
    } catch (error) {
      return [];
    }
  }

  function writeEntries(entries) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return true;
    } catch (error) {
      return false;
    }
  }

  function makeElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function render() {
    const entries = readEntries();
    list.innerHTML = "";
    count.textContent = entries.length ? `${entries.length} note${entries.length === 1 ? "" : "s"} saved in this browser.` : "No notes saved in this browser.";
    if (!entries.length) {
      list.append(makeElement("p", "guestbook-empty", "This page is ready for the first note. Write something kind, small, or true."));
      return;
    }
    entries.slice().reverse().forEach((entry) => {
      const article = makeElement("article", "guestbook-entry");
      const top = makeElement("div", "guestbook-entry-top");
      top.append(makeElement("strong", "", entry.name || "A friend"));
      if (entry.createdAt) {
        const date = makeElement("time", "", new Date(entry.createdAt).toLocaleDateString());
        date.dateTime = entry.createdAt;
        top.append(date);
      }
      article.append(top, makeElement("p", "", entry.message));
      list.append(article);
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim().slice(0, 40);
    const message = messageInput.value.trim().slice(0, 280);
    if (message.length < 3) {
      feedback.textContent = "Write a message with at least three characters.";
      messageInput.focus();
      return;
    }
    const entries = readEntries();
    entries.push({ name: name || "A friend", message, createdAt: new Date().toISOString() });
    if (!writeEntries(entries)) {
      feedback.textContent = "This browser did not allow local storage. The note was not saved.";
      return;
    }
    form.reset();
    feedback.textContent = "Your note is saved in this browser.";
    render();
  });

  render();
}());
