# Harmony Life International

Static website for Harmony Life International — plain HTML, CSS and JS, no build step.

## Structure

```
index.html            home page
*.html                one file per page (about, leadership, beliefs, kids, ...)
css/style.css         all styles
js/main.js            nav, scroll animations, Uganda map
images/               photos used by the site
images/unused/        photos not currently on any page (safe to delete to slim the repo)
.nojekyll             tells GitHub Pages to serve files as-is
```

All links are relative, so the site works at the repo root or under a project path
(`https://<user>.github.io/<repo>/`).

## Preview locally

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Deploy on GitHub Pages

1. Push this folder's contents to the root of the repo (`index.html` must be at the top level).
2. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch**,
   choose `main` and `/ (root)`.
3. The site will be live at `https://<user>.github.io/<repo>/` after a minute or so.

When editing pages, bump the `?v=` number on the `style.css` / `main.js` links in each
HTML file so browsers pick up the change instead of a cached copy.
