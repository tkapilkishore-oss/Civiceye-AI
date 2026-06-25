const fs = require('fs');
const path = require('path');

async function runTest() {
  const imageName = process.argv[2];
  if (!imageName) {
    console.error('Usage: node test_vision.js <pothole.jpg | garbage.jpg | streetlight.jpg | water_pipe_burst.jpg>');
    process.exit(1);
  }

  const imagePath = path.join(__dirname, imageName);
  if (!fs.existsSync(imagePath)) {
    console.error(`Error: File not found at ${imagePath}`);
    process.exit(1);
  }

  console.log(`Reading image: ${imageName}...`);
  const fileBuffer = fs.readFileSync(imagePath);
  const base64Data = fileBuffer.toString('base64');
  
  // Detect extension
  const ext = path.extname(imagePath).toLowerCase();
  let mimeType = 'image/jpeg';
  if (ext === '.png') mimeType = 'image/png';
  if (ext === '.webp') mimeType = 'image/webp';

  const dataUrl = `data:${mimeType};base64,${base64Data}`;

  console.log('Sending request to http://localhost:3000/api/analyze-image...');
  
  try {
    const response = await fetch('http://localhost:3000/api/analyze-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: dataUrl,
        description: `Local CLI test for ${imageName}`
      })
    });

    const json = await response.json();
    console.log('\n--- RESPONSE RECEIVED ---');
    console.log(JSON.stringify(json, null, 2));
  } catch (error) {
    console.error('Error contacting local server:', error.message);
    console.log('\nEnsure your Next.js dev server is running on port 3000: "npm run dev"');
  }
}

runTest();
