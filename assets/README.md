# OmniLedger Logo Assets

This directory contains the official logo and icon files for OmniLedger.

## Logo Files

### Main Logos
- **`logo.svg`** - Horizontal logo with text (for light backgrounds)
- **`logo-dark.svg`** - Horizontal logo with text (for dark backgrounds)

### Icons
- **`icon.svg`** - Full icon with circular background (512x512)
- **`icon-square.svg`** - Square icon with rounded corners (512x512)
- **`favicon.svg`** - Simplified favicon version (32x32)

## Usage

### In Application
Use the SVGs directly in your React components:

```tsx
import logo from '../assets/logo.svg';

<img src={logo} alt="OmniLedger" className="h-8" />
```

### For Electron Build
For Electron app icons (`.ico` for Windows, `.icns` for macOS), you'll need to convert the SVG files:

1. **Convert to PNG**: Export `icon-square.svg` at multiple sizes:
   - 16x16, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512

2. **Create .ico file** (Windows):
   ```bash
   # Using ImageMagick or online converter
   # Place at: build/icon.ico
   ```

3. **Create .icns file** (macOS):
   ```bash
   # Using iconutil or Image2icon
   # Place at: build/icon.icns
   ```

4. **Or use electron-builder automatically**:
   The build process can auto-generate icons from a source PNG/ICO file.

### For Web (if migrating to SaaS)
- Use `logo.svg` for the main logo
- Use `favicon.svg` or convert to `favicon.ico` for browser favicon
- Use `icon-square.svg` for Open Graph images (og:image)

## Design Elements

The logo combines:
- **Ledger/Book Icon**: Represents accounting and financial tracking
- **Inventory Box**: Represents inventory and product management
- **Integration Lines**: Symbolizes the unified system connecting inventory and accounting

### Color Palette
- Primary Blue: `#2563EB` (Ledger/Accounting)
- Success Green: `#10B981` (Inventory/Validation)
- Dark: `#1F2937` (Text)
- Light: `#F9FAFB` (Backgrounds)

## Export Instructions

### Converting SVG to PNG (for Electron icons)

Using ImageMagick:
```bash
# Install ImageMagick first
convert -background none -resize 512x512 icon-square.svg icon-512.png
```

Using Inkscape:
```bash
inkscape --export-type=png --export-width=512 icon-square.svg
```

Online Tools:
- Use tools like CloudConvert, Convertio, or SVG2PNG
- Export at multiple sizes for .ico/.icns generation

### Generating .ico file (Windows)

1. Create PNG files at: 16, 32, 48, 64, 128, 256 pixels
2. Use tools like:
   - ImageMagick: `convert icon-*.png icon.ico`
   - ICO Convert (online)
   - GIMP with ICO plugin
3. Place at `build/icon.ico`

### Generating .icns file (macOS)

1. Create PNG files at: 16, 32, 64, 128, 256, 512, 1024 pixels (with @2x variants)
2. Create `icon.iconset` directory structure
3. Use `iconutil`:
   ```bash
   iconutil -c icns icon.iconset -o icon.icns
   ```
4. Place at `build/icon.icns`

Or use online tools like:
- CloudConvert
- iConvert Icons
- Image2icon (Mac App Store)

## License

These logo files are part of the OmniLedger project and follow the same license as the project.