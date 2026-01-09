# OmniLedger Landing Page

This is a standalone, static landing page for OmniLedger that can be hosted on GitHub Pages or any static hosting service.

## Features

- 🎨 Modern, responsive design
- 📱 Mobile-friendly layout
- ⚡ Fast loading with no dependencies
- 🌐 SEO optimized with meta tags
- 📊 Showcases all key features
- 🔗 Links to GitHub repository and releases

## Deployment to GitHub Pages

### Option 1: Deploy from `docs/` folder (Recommended)

1. Move the `landing` folder contents to a `docs` folder:
   ```bash
   mkdir docs
   cp -r landing/* docs/
   ```

2. In your GitHub repository, go to **Settings** > **Pages**

3. Under "Source", select **Deploy from a branch**

4. Select the **main** branch and **/docs** folder

5. Click **Save**

6. Your site will be available at: `https://<username>.github.io/omniledger/`

### Option 2: Deploy from `gh-pages` branch

1. Create a `gh-pages` branch:
   ```bash
   git checkout -b gh-pages
   ```

2. Move the landing page files to the root:
   ```bash
   cp -r landing/* .
   git add .
   git commit -m "Add landing page"
   git push origin gh-pages
   ```

3. In GitHub repository settings, go to **Pages** and select the `gh-pages` branch

4. Your site will be available at: `https://<username>.github.io/omniledger/`

### Option 3: Use GitHub Actions

Create a `.github/workflows/deploy-pages.yml` file:

```yaml
name: Deploy Landing Page

on:
  push:
    branches: [ main ]
    paths:
      - 'landing/**'

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Pages
        uses: actions/configure-pages@v3
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v1
        with:
          path: './landing'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v1
```

## Customization

### Update Links

Edit `index.html` and update all links to point to your repository:

- GitHub repository: `https://github.com/wahid-dev1/omniledger`
- Releases page: `https://github.com/wahid-dev1/omniledger/releases`
- Issues: `https://github.com/wahid-dev1/omniledger/issues`

### Update Meta Tags

Edit the `<head>` section in `index.html` to update:
- Open Graph tags
- Twitter card tags
- Description
- Keywords

### Update Colors

Edit `styles.css` and modify the CSS variables in the `:root` selector:

```css
:root {
    --primary: #2563eb;
    --secondary: #10b981;
    /* ... other colors */
}
```

### Add Screenshots

Replace the placeholder preview image with actual screenshots:
1. Add screenshots to the `landing/` folder
2. Update the `src` attribute in the preview image section

## File Structure

```
landing/
├── index.html          # Main HTML file
├── styles.css          # All CSS styles
├── script.js           # JavaScript for interactivity
├── logo.svg           # Logo file
├── icon-square.svg    # Square icon
├── favicon.svg        # Favicon
└── README.md          # This file
```

## Testing Locally

You can test the landing page locally using a simple HTTP server:

```bash
# Using Python 3
cd landing
python3 -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server landing -p 8000

# Using PHP
php -S localhost:8000 -t landing
```

Then open `http://localhost:8000` in your browser.

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

Same license as the main OmniLedger project (MIT License).