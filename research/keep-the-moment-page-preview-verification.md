## Keep the Moment page preview verification

The new `/keep-the-moment.html` page loads with the shared Couple in Bond wallet header, a content-rich article shell, the minting steps, Ink and Base explanations, the gas-fee disclosure, a five-question FAQ, and the shared three-column footer.

The guest-book form is visible with optional name input, required message textarea, a local-storage disclosure, an empty-state message, and a sign button. The homepage Community Book card points to the `#guestbook` section on this page.

The first browser pass confirmed the page title, public copy, internal links, external official network links, form controls, and footer links. The guest-book form fields accepted input during the preview test.

The interaction pass submitted a test note successfully. The page displayed `1 note saved in this browser.`, the confirmation `Your note is saved in this browser.`, and the rendered note with its name, date, and message. The implementation uses text nodes for rendering, so a message is not interpreted as HTML.

The homepage preview now shows `Community Book` in the feature grid instead of the previous Community Polls card. Its card copy explains that visitors can leave a short message, and its link targets `keep-the-moment.html#guestbook`. The separate Featured Poll of the Week remains available below the grid.
