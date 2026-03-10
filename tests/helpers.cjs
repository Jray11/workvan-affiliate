// Shared test helpers for affiliate portal tests

// Test affiliate: Josh Ray (can_recruit=true, portal_enabled=true)
const AFFILIATE_ID = '7c709f3c-3d06-4578-97fd-e871edda32f0';

function getImpersonationUrl() {
  const timestamp = Date.now();
  const token = Buffer.from(`admin:${AFFILIATE_ID}:${timestamp}`).toString('base64');
  return `https://affiliates.workvanapp.com?impersonate=${token}`;
}

module.exports = { AFFILIATE_ID, getImpersonationUrl };
