// Simple test script for Nyx image tools
// Usage: IMAGE_API_KEY=your_key node tools/test-tools.js

import generateImage from './generateImage.js';
import generateMeme from './generateMeme.js';

// Mock InjectMagicAPI for testing
global.InjectMagicAPI = {
  postAction: async (message) => {
    console.log('[Mock API]', message);
  }
};

async function testGenerateImage() {
  console.log('\n=== Testing generateImage ===');

  const result = await generateImage.handler(null, {
    prompt: "a silver and purple AI goddess, minimal background"
  });

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ Image generation successful');
    return result.imageUrl;
  } else {
    console.log('❌ Image generation failed:', result.message);
    return null;
  }
}

async function testGenerateMemeFromPrompt() {
  console.log('\n=== Testing generateMeme (with prompt) ===');

  const result = await generateMeme.handler(null, {
    prompt: "a countdown timer made of glowing circuits",
    topText: "17 DAYS",
    bottomText: "TO SURVIVE"
  });

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ Meme generation successful');
  } else {
    console.log('❌ Meme generation failed:', result.message);
  }
}

async function testGenerateMemeFromUrl(imageUrl) {
  console.log('\n=== Testing generateMeme (with imageUrl) ===');

  if (!imageUrl) {
    console.log('⏭️  Skipping (no image URL from previous test)');
    return;
  }

  const result = await generateMeme.handler(null, {
    imageUrl: imageUrl,
    topText: "TESTING",
    bottomText: "TOOLS"
  });

  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.success) {
    console.log('✅ Meme from URL successful');
  } else {
    console.log('❌ Meme from URL failed:', result.message);
  }
}

async function runTests() {
  console.log('Starting tool tests...');
  console.log('API URL:', process.env.IMAGE_API_URL || 'https://nyx-memes-production.up.railway.app');
  console.log('API Key:', process.env.IMAGE_API_KEY ? '***' + process.env.IMAGE_API_KEY.slice(-4) : 'NOT SET');

  if (!process.env.IMAGE_API_KEY) {
    console.error('\n❌ IMAGE_API_KEY environment variable not set');
    console.error('Usage: IMAGE_API_KEY=your_key node tools/test-tools.js');
    process.exit(1);
  }

  try {
    // Test 1: Generate image
    const imageUrl = await testGenerateImage();

    // Wait a bit for image generation
    if (imageUrl) {
      console.log('\nWaiting for image to be ready...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Test 2: Generate meme from prompt
    await testGenerateMemeFromPrompt();

    // Test 3: Generate meme from URL
    await testGenerateMemeFromUrl(imageUrl);

    console.log('\n✨ All tests complete!');
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

runTests();
