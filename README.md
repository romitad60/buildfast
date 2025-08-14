# BuildFast — static prototype

A static site (no backend) that matches the flow:

- Home with search bar and **+** floating button
- Gallery area (edit `GALLERY` in `scripts.js`)
- Wizard: describe → **Customize existing** or **From scratch** (two options with explanations)
- If **Customize**: builds Amazon/eBay/AliExpress/Google Shopping search links from keywords; paste base product link(s)
- Review → save to browser storage + **download JSON**

## Deploy — GitHub Pages
1. Create a **public** repo (e.g., `buildfast`).
2. Add: `index.html`, `create.html`, `styles.css`, `scripts.js`.
3. Repo **Settings → Pages**: Source = `main`, Folder = `/ (root)`.
4. Open `https://YOUR-USERNAME.github.io/REPO/`.

## Deploy — Netlify Drop (super fast)
1. Zip these files on your computer (or upload individually from iPhone).
2. Go to https://app.netlify.com/drop and drop the files.
3. Netlify gives you a live URL immediately.

## Editing the gallery
In `scripts.js`, update:
```js
const GALLERY = [
  { id:"A-DRONE", title:"Project A — Hawk FPV Drone", img:"https://raw.githubusercontent.com/YOUR-USERNAME/REPO/main/drone.jpg", tags:["drones","electronics"], blurb:"..." }
];
