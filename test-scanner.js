// Test script to verify scanner functionality
const { Scanner } = require('./dist/scanner');

async function test() {
  console.log('Testing Scanner...\n');

  // Test 1: Scan the test project
  const scanner = new Scanner('./test-project/app');
  const routes = await scanner.scan();

  console.log('Routes found:', routes.length);
  console.log('\nRoute details:');
  routes.forEach(route => {
    console.log(`  - ${route.path} (${route.type})`);
    if (route.filePath) {
      console.log(`    File: ${route.filePath}`);
    }
  });

  console.log('\n✅ Scanner test passed!');
}

test().catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
