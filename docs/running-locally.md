# Running locally

Couple in Bond does not require a framework build step. It is a static site, so local development only needs a web server that serves the repository root.

## Start a local server

With Python installed:

```text
python -m http.server 8000
```

Then open `http://localhost:8000/`.

You can also use any equivalent static-file server. Opening HTML files directly may prevent some browser APIs, module behavior, or asset paths from working as they do on the deployed site.

## Before opening a pull request

- Check the page at desktop and mobile widths.
- Verify navigation links from the page being changed.
- Test forms and browser-local interactions in a fresh browser session.
- Confirm that new images use repository-relative paths.
- Keep public documentation in `docs/`; leave internal verification notes in `research/`.
