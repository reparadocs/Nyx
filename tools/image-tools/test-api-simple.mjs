// Simple API test without dependencies
// Usage: IMAGE_API_KEY=your_key node tools/test-api-simple.mjs

const API_URL = process.env.IMAGE_API_URL || 'https://nyx-memes-production.up.railway.app';
const API_KEY = process.env.IMAGE_API_KEY;

async function testGenerateImage() {
  console.log('\n=== Testing Image Generation ===');

  const response = await fetch(`${API_URL}/api/image/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      prompt: 'a silver and purple AI goddess, cyberpunk style, minimal background'
    }),
  });

  const data = await response.json();
  console.log('Response:', JSON.stringify(data, null, 2));

  if (data.success) {
    console.log('✅ Image generation successful');
    return data.imageUrl;
  } else {
    console.log('❌ Failed:', data.error || data.message);
    return null;
  }
}

async function testGenerateMeme() {
  console.log('\n=== Testing Meme Generation (Combined) ===');

  const response = await fetch(`${API_URL}/api/image/generate-meme`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      prompt: 'a countdown timer made of glowing circuits',
      topText: '17 DAYS',
      bottomText: 'TO SURVIVE'
    }),
  });

  if (response.ok) {
    const buffer = await response.arrayBuffer();
    console.log(`✅ Meme generated: ${buffer.byteLength} bytes`);
    return true;
  } else {
    const error = await response.json();
    console.log('❌ Failed:', error.error || error.message);
    return false;
  }
}

async function runTests() {
  console.log('API URL:', API_URL);
  console.log('API Key:', API_KEY ? '***' + API_KEY.slice(-4) : 'NOT SET');

  if (!API_KEY) {
    console.error('\n❌ IMAGE_API_KEY not set');
    console.error('Usage: IMAGE_API_KEY=your_key node tools/test-api-simple.mjs');
    process.exit(1);
  }

  try {
    await testGenerateImage();
    console.log('\nWaiting 5 seconds before next test...');
    await new Promise(r => setTimeout(r, 5000));
    await testGenerateMeme();
    console.log('\n✨ Tests complete!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
