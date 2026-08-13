## Keep the Moment page preview verification

The new `/keep-the-moment.html` page loads with the shared Couple in Bond wallet header, a content-rich article shell, the minting steps, Ink and Base explanations, the gas-fee disclosure, a five-question FAQ, and the shared three-column footer.

The guest-book form is visible with optional name input, required message textarea, a local-storage disclosure, an empty-state message, and a sign button. The homepage Community Book card points to the `#guestbook` section on this page.

The first browser pass confirmed the page title, public copy, internal links, external official network links, form controls, and footer links. The guest-book form fields accepted input during the preview test.

The interaction pass submitted a test note successfully. The page displayed `1 note saved in this browser.`, the confirmation `Your note is saved in this browser.`, and the rendered note with its name, date, and message. The implementation uses text nodes for rendering, so a message is not interpreted as HTML.

The homepage preview now shows `Community Book` in the feature grid instead of the previous Community Polls card. Its card copy explains that visitors can leave a short message, and its link targets `keep-the-moment.html#guestbook`. The separate Featured Poll of the Week remains available below the grid.

The separation pass moved the blockchain education to `/keep-the-moment-info.html`. The dedicated page contains the minting, Ink, Base, gas-fee, wallet-safety, and FAQ content but no guest-book form. Its aside links back to the compact Community Book page at `/keep-the-moment.html`.

The homepage Keep the Moment card now links to `keep-the-moment-info.html` and uses a short explanation with a single action. The Community Book card uses a shorter minimum height and tighter padding, while the feature grid uses `align-items: start` so neighboring cards do not stretch it into unused space.

The compact-page preview confirms that `/keep-the-moment.html` now contains the guest-book form, local-storage disclosure, short “What belongs here?” guidance, and a link to the dedicated blockchain information page. The minting, Ink, Base, gas-fee, and FAQ content is no longer repeated on this guest page.

The final homepage refresh entered the temporary preview wake-up screen before the compact-card screenshot could be recaptured. Source checks and the previous homepage preview confirm the link and card content; the new home-card height should be rechecked in the live preview after the server wakes.
