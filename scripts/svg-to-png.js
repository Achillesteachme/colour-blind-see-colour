const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../assets/icon.svg');
const pngPath = path.join(__dirname, '../assets/icon.png');
const splash = path.join(__dirname, '../assets/splash-icon.png');

const svgBuffer = fs.readFileSync(svgPath);

// 1024x1024 App Store icon
sharp(svgBuffer)
  .resize(1024, 1024)
  .png()
  .toFile(pngPath)
  .then(() => {
    console.log('✅ icon.png (1024x1024) written');
    // Also write a 200x200 splash icon
    return sharp(svgBuffer).resize(200, 200).png().toFile(splash);
  })
  .then(() => console.log('✅ splash-icon.png (200x200) written'))
  .catch(console.error);
