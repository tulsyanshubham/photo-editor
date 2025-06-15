# 🖼️ React Photo Editor

A fully-featured image editing tool built with React and Tailwind CSS. Allows users to upload, crop, filter, and download images with a clean and responsive UI.

## ✨ Features

- ✅ Image Upload & Preview
- ✂️ Cropping with:
  - Freeform selection
  - Preset aspect ratios (1:1, 4:3, 16:9, 3:4)
- 🎨 Filter controls:
  - Brightness
  - Contrast
  - Saturation
  - Temperature
  - Hue rotation
  - Grayscale (B&W toggle)
  - Blur
  - Transparency
- 📦 Compression quality control
- 🌗 Light/Dark mode toggle
- 📥 Download the edited image

## 🧪 Tech Stack

- **React (TypeScript)**
- **Tailwind CSS**
- **Canvas API**
- **ShadCN UI** for sliders, tabs, dropdowns, and buttons

## 🧠 How It Works

1. **Upload Image**  
   Users upload an image file (any format supported by browsers).

2. **Edit Image**  
   - Filters and crop settings are applied using the `<canvas>` element.
   - Filters use the `ctx.filter` and `ctx.globalAlpha` properties.
   - Cropping is calculated using percentage-based dimensions from the natural image size.

3. **Download Image**  
   - The current canvas (after cropping and filtering) is converted to a Blob and downloaded.

## 🖼️ Cropping Logic

Cropping works by maintaining aspect ratio relative to the original image. The selected crop area is shown as an overlay, and cropping is centered and scaled properly:

```ts
// Example: Applying 1:1 square crop
if (imgW / imgH > 1) {
  cropH = imgH;
  cropW = cropH; // Square
} else {
  cropW = imgW;
  cropH = cropW; // Square
}
```

## 🧩 Future Enhancements
  - Rotate and flip tools
  - History/Undo feature
  - Multi-image batch processing
  - Drag-to-resize crop box
