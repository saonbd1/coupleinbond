/* Current CoupleIn theme reminder: preserve the calm, transparent, browser-only contact experience. This file validates fields without sending or storing messages. */

(function () {
  "use strict";

  const form = document.getElementById("contactForm");
  if (!form) return;

  const status = document.getElementById("contactFormStatus");
  const fields = ["contactName", "contactEmail", "contactTopic", "contactMessage"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  function setFieldState(field, message) {
    const error = document.getElementById(`${field.id}Error`);
    field.setAttribute("aria-invalid", message ? "true" : "false");
    if (error) error.textContent = message;
  }

  function validateField(field) {
    let message = "";
    if (field.validity.valueMissing) message = "Please complete this field.";
    else if (field.validity.typeMismatch) message = "Enter a valid email address.";
    else if (field.validity.tooShort) message = `Use at least ${field.minLength} characters.`;
    setFieldState(field, message);
    return !message;
  }

  fields.forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
    field.addEventListener("input", () => {
      if (field.getAttribute("aria-invalid") === "true") validateField(field);
      status.textContent = "";
      status.classList.remove("is-success");
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const valid = fields.map(validateField).every(Boolean);
    if (!valid) {
      status.textContent = "Please fix the highlighted fields before you continue.";
      status.classList.remove("is-success");
      const firstInvalid = fields.find((field) => field.getAttribute("aria-invalid") === "true");
      if (firstInvalid) firstInvalid.focus();
      return;
    }
    status.textContent = "Your message is ready. This static page does not send or store messages until a delivery service is connected.";
    status.classList.add("is-success");
    form.reset();
    fields.forEach((field) => setFieldState(field, ""));
  });
}());
