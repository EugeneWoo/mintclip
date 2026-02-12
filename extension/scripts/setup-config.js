#!/usr/bin/env node

/**
 * Setup Script for Mintclip Extension Configuration
 * Run this script to configure Supabase credentials in the extension
 *
 * Usage: node scripts/setup-config.js <SUPABASE_URL> <SUPABASE_ANON_KEY>
 *
 * Example:
 *   node scripts/setup-config.js \
 *     https://your-project.supabase.co \
 *     eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 */

const fs = require('fs');
const path = require('path');

// Get arguments from command line
const args = process.argv.slice(2);
const supabaseUrl = args[0];
const supabaseAnonKey = args[1];

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Usage: node setup-config.js <SUPABASE_URL> <SUPABASE_ANON_KEY>');
  console.error('');
  console.error('Get these values from:');
  console.error('  Supabase Dashboard > Project Settings > API');
  process.exit(1);
}

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
  console.error('Error: SUPABASE_URL must start with https://');
  process.exit(1);
}

// Path to config.ts
const configPath = path.join(__dirname, '../src/config.ts');

// Read current config
let configContent = fs.readFileSync(configPath, 'utf8');

// Replace the URL and key
configContent = configContent.replace(
  /url:\s*['"][^'"]+['"]/,
  `url: '${supabaseUrl}'`
);
configContent = configContent.replace(
  /anonKey:\s*['"][^'"]+['"]/,
  `anonKey: '${supabaseAnonKey}'`
);

// Write updated config
fs.writeFileSync(configPath, configContent);

console.log('✓ Extension configuration updated successfully!');
console.log('');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey.substring(0, 20) + '...');
console.log('');
console.log('You can now build and run the extension:');
console.log('  npm run build');
console.log('  npm run dev');
