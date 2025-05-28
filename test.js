#!/usr/bin/env node

// Simple test script to verify the OpenCage API connection
// Run with: node test.js

// Import fetch for Node.js versions that don't have it built-in
import fetch from 'node-fetch';

const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;

if (!OPENCAGE_API_KEY) {
  console.error('Please set OPENCAGE_API_KEY environment variable');
  process.exit(1);
}

async function testOpenCageAPI() {
  try {
    console.log('Testing OpenCage API connection...');

    // Test forward geocoding
    const forwardUrl = `https://api.opencagedata.com/geocode/v1/json?key=${OPENCAGE_API_KEY}&q=London&limit=1`;
    const forwardResponse = await fetch(forwardUrl);
    const forwardData = await forwardResponse.json();

    if (forwardData.results && forwardData.results.length > 0) {
      console.log('✅ Forward geocoding test passed');
      console.log(
        `   London coordinates: ${forwardData.results[0].geometry.lat}, ${forwardData.results[0].geometry.lng}`,
      );
    } else {
      console.log('❌ Forward geocoding test failed');
    }

    // Test reverse geocoding
    const reverseUrl = `https://api.opencagedata.com/geocode/v1/json?key=${OPENCAGE_API_KEY}&q=51.5074,-0.1278&limit=1`;
    const reverseResponse = await fetch(reverseUrl);
    const reverseData = await reverseResponse.json();

    if (reverseData.results && reverseData.results.length > 0) {
      console.log('✅ Reverse geocoding test passed');
      console.log(`   Coordinates result: ${reverseData.results[0].formatted}`);
    } else {
      console.log('❌ Reverse geocoding test failed');
    }

    // Check rate limits
    const remaining = forwardResponse.headers.get('x-ratelimit-remaining');
    const limit = forwardResponse.headers.get('x-ratelimit-limit');

    if (remaining && limit) {
      console.log(`📊 Rate limit: ${remaining}/${limit} requests remaining`);
    }

    console.log('\n🎉 API connection test completed successfully!');
  } catch (error) {
    console.error('❌ API test failed:', error.message);
    process.exit(1);
  }
}

testOpenCageAPI();
