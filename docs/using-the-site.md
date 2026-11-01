# Using the site

## Find a starting point

Open the homepage and choose the experience that fits the moment:

- Try the Love Calculator for a playful result.
- Take the Compatibility Quiz: 15 reflection questions you can answer solo or as a pair, with per-area bars, a "Copy my result" summary, and a partner-compare mode.
- Open a poll to compare perspectives.
- Browse quotes when you want something short to share.
- Read the blog for activities, questions, and communication ideas.
- Use the Community Book to leave a note on the current device.

## Browser-local interactions

Some interactions are deliberately local to the browser. Poll votes and Community Book notes are not presented as a shared account-backed social feed. Clearing browser storage can remove this local information.

## Sharing

The site includes share actions for selected results and content. A shared link may describe or point to the result, but it does not turn browser-local data into a server-hosted profile.
## Compatibility Quiz behavior

The quiz runs entirely in the browser with no network requests:

- Answers save to `localStorage` after each choice and resume after a page refresh; the "Take the reflection again" button clears them.
- The progress bar reflects answered questions, and pressing Enter advances the quiz.
- The result shows per-area bars (score out of 12 per area) and handles ties ("Balanced across all areas").
- "Copy my result" copies a plain-text summary with the quiz URL to the clipboard; nothing is posted anywhere.
- "Compare with my partner" restarts the quiz for a second person on the same device and then shows both area profiles side by side with alignment notes. The first person's answers exist only in page memory for that session and are never stored or sent.
