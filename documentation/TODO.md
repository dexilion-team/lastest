

APP
/c- Entire prompt as config

Testing
- Playwright mcp integration
- stagehand

Bug
- dexilion.com//
- Claude generated script should be a failed case:
Could not click button 6: locator.click: Timeout 5000ms exceeded. Call log: [2m - waiting for locator('button').nth(5)[22m [2m - locator resolved to …[22m [2m - attempting click action[22m [2m 2 × waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - intercepts pointer events[22m [2m - retrying click action[22m [2m - waiting 20ms[22m [2m 2 × waiting for element to be visible, enabled and stable[22m [2m - element is not stable[22m [2m - retrying click action[22m [2m - waiting 100ms[22m [2m - waiting for element to be visible, enabled and stable[22m [2m - element is not stable[22m [2m 6 × retrying click action[22m [2m - waiting 500ms[22m [2m - waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - intercepts pointer events[22m [2m - retrying click action[22m [2m - waiting 500ms[22m
Could not click button 7: locator.click: Timeout 5000ms exceeded. Call log: [2m - waiting for locator('button').nth(6)[22m [2m - locator resolved to Submit[22m [2m - attempting click action[22m [2m - waiting for element to be visible, enabled and stable[22m [2m - element is not stable[22m [2m - retrying click action[22m [2m - waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - element is outside of the viewport[22m [2m - retrying click action[22m [2m - waiting 20ms[22m [2m 2 × waiting for element to be visible, enabled and stable[22m [2m - element is not stable[22m [2m - retrying click action[22m [2m - waiting 100ms[22m [2m - waiting for element to be visible, enabled and stable[22m [2m - element is not stable[22m [2m 7 × retrying click action[22m [2m - waiting 500ms[22m [2m - waiting for element to be visible, enabled and stable[22m [2m - element is visible, enabled and stable[22m [2m - scrolling into view if needed[22m [2m - done scrolling[22m [2m - intercepts pointer events[22m [2m - retrying click action[22m [2m - waiting 500ms[22m

- GH test script writing looks like this:
→ Running tests...
  Testing live environment...
✗ AI test failed for /solo-founders: Unexpected token ')'
✗ Test execution failed for /solo-founders (live): Unexpected token ')'
✗ AI test failed for /project-management: Invalid or unexpected token
✗ AI test failed for /product-management: Invalid or unexpected token
✗ AI test failed for /product-launcher: Invalid or unexpected token
✗ AI test failed for /lead-generation: Unexpected token ','
✗ Test execution failed for /project-management (live): Invalid or unexpected token
✗ Test execution failed for /product-management (live): Invalid or unexpected token
✗ Test execution failed for /product-launcher (live): Invalid or unexpected token
✗ Test execution failed for /lead-generation (live): Unexpected token ','
⚠ AI test timeout for /: locator.click: Error: strict mode violation: locator('button[type="submit"]') resolved to 2 elements:
✗ Test execution failed for / (live): locator.click: Error: strict mode violation: locator('button[type="submit"]') resolved to 2 elements:
    1) <button type="submit">Submit</button> aka getByRole('button', { name: 'Submit' })
    2) <button type="submit">Subscribe</button> aka getByRole('button', { name: 'Subscribe' })

Call log:
  - waiting for locator('button[type="submit"]')

✗ AI test failed for /fractional-cto: Invalid or unexpected token
✗ AI test failed for /brokerbroker: Unexpected token ','
✗ Test execution failed for /fractional-cto (live): Invalid or unexpected token
✗ Test execution failed for /brokerbroker (live): Unexpected token ','
    ✓ 8/16 passed  ✗ 8/16 failed