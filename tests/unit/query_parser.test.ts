import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQueryDeterministic } from '../../src/server/search/query_parser.js';

test('parseQueryDeterministic extracts categories and prices correctly', () => {
  const q1 = parseQueryDeterministic('A compact wooden desk for a small apartment under 15000 rupees');
  assert.equal(q1.extracted_category, 'desks');
  assert.equal(q1.extracted_price_max, 15000);
  assert.ok(q1.extracted_materials.includes('wooden') || q1.extracted_materials.includes('wood'));
  assert.ok(q1.extracted_modifiers.includes('compact') || q1.extracted_modifiers.includes('small'));
  assert.equal(q1.intent, 'search');

  const q2 = parseQueryDeterministic('Comfortable beige sofa for a modern living room');
  assert.equal(q2.extracted_category, 'sofas');
  assert.ok(q2.extracted_colors.includes('beige'));

  const q3 = parseQueryDeterministic('Find a similar dining table but cheaper');
  assert.equal(q3.extracted_category, 'dining');
  assert.equal(q3.intent, 'cheaper');

  const q4 = parseQueryDeterministic('Show alternatives to this chair with better reviews');
  assert.equal(q4.extracted_category, 'chairs');
  assert.equal(q4.intent, 'alternatives');

  const q5 = parseQueryDeterministic('luxury king bed over 40k rupees');
  assert.equal(q5.extracted_category, 'beds');
  assert.equal(q5.extracted_price_min, 40000);
});

test('parseQueryDeterministic handles unknown or empty query safely', () => {
  const empty = parseQueryDeterministic('');
  assert.equal(empty.raw_query, '');
  assert.equal(empty.extracted_category, undefined);
  assert.equal(empty.extracted_price_max, undefined);

  const outOfDomain = parseQueryDeterministic('smartphone 5G wireless charger');
  assert.equal(outOfDomain.extracted_category, undefined);
  assert.equal(outOfDomain.extracted_materials.length, 0);
});
