#!/usr/bin/env node
/**
 * AusFinanz — Translation Sync Checker
 *
 * Загружает все 7 файлов переводов, сравнивает ключи
 * и выводит отчёт: какие ключи отсутствуют в каком языке.
 *
 * Запуск:
 *   node scripts/check-translations.js
 *   npm run check
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ───────────────────────────────────────────────────────────
// Config
// ───────────────────────────────────────────────────────────
const LANGS = ['RU', 'UA', 'RO', 'TR', 'KZ', 'PL', 'BG'];
const TRANSLATIONS_DIR = path.join(__dirname, '..', 'js', 'translations');

// ───────────────────────────────────────────────────────────
// Mock the browser globals that translation files expect
// ───────────────────────────────────────────────────────────
global.window = { AusFinanzTranslationsData: {} };

// ───────────────────────────────────────────────────────────
// Load all translation files
// ───────────────────────────────────────────────────────────
const loadErrors = [];

LANGS.forEach(lang => {
  const filePath = path.join(TRANSLATIONS_DIR, `${lang.toLowerCase()}.js`);

  if (!fs.existsSync(filePath)) {
    loadErrors.push(`Missing file: ${filePath}`);
    return;
  }

  try {
    const code = fs.readFileSync(filePath, 'utf8');
    // eslint-disable-next-line no-eval
    eval(code);
  } catch (err) {
    loadErrors.push(`Error loading ${lang}: ${err.message}`);
  }
});

if (loadErrors.length) {
  console.error('\n🔴  File load errors:');
  loadErrors.forEach(e => console.error('   ', e));
  process.exit(1);
}

const data = global.window.AusFinanzTranslationsData;

// ───────────────────────────────────────────────────────────
// Collect the union of ALL keys across all languages
// ───────────────────────────────────────────────────────────
const allKeys = new Set();
LANGS.forEach(lang => {
  if (data[lang]) Object.keys(data[lang]).forEach(k => allKeys.add(k));
});

console.log(`\n📋  Total unique keys across all languages: ${allKeys.size}`);
console.log(`🌍  Languages checked: ${LANGS.join(', ')}\n`);
console.log('─'.repeat(60));

// ───────────────────────────────────────────────────────────
// Compare: find missing keys per language
// ───────────────────────────────────────────────────────────
let totalMissing = 0;

LANGS.forEach(lang => {
  if (!data[lang]) {
    console.error(`❌  ${lang}: data not found in loaded file`);
    totalMissing++;
    return;
  }

  const langKeys   = new Set(Object.keys(data[lang]));
  const missing    = [...allKeys].filter(k => !langKeys.has(k));
  const extra      = [...langKeys].filter(k => !allKeys.has(k)); // keys only in this lang
  const coverage   = (((allKeys.size - missing.length) / allKeys.size) * 100).toFixed(1);

  if (missing.length === 0) {
    console.log(`✅  ${lang.padEnd(4)} — ${langKeys.size} keys  (coverage: 100%)`);
  } else {
    totalMissing += missing.length;
    console.warn(`⚠️   ${lang.padEnd(4)} — ${langKeys.size} keys  (coverage: ${coverage}%)  — missing ${missing.length}:`);
    missing.forEach(k => console.warn(`        ✗ ${k}`));
  }

  // Warn about extra keys (present in this lang but not in RU — possibly typos)
  if (extra.length && lang !== 'RU') {
    console.warn(`     ⓘ  ${lang}: ${extra.length} key(s) NOT present in RU (possible typo?):`);
    extra.forEach(k => console.warn(`        ? ${k}`));
  }
});

// ───────────────────────────────────────────────────────────
// Summary
// ───────────────────────────────────────────────────────────
console.log('─'.repeat(60));
if (totalMissing === 0) {
  console.log('\n✅  All translations are in sync!\n');
  process.exit(0);
} else {
  console.error(`\n❌  ${totalMissing} missing translation(s) found across all languages.\n`);
  process.exit(1);
}
