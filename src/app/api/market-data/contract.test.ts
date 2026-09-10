import assert from 'node:assert/strict';
import test from 'node:test';

import { marketDataError, parseTicker } from './contract';

test('parseTicker normalizes supported ticker symbols', () => {
  assert.equal(parseTicker(' reliance.ns '), 'RELIANCE.NS');
  assert.equal(parseTicker('^nsei'), '^NSEI');
});

test('parseTicker rejects empty and malformed ticker symbols', () => {
  assert.equal(parseTicker(''), null);
  assert.equal(parseTicker('  '), null);
  assert.equal(parseTicker('AAPL/../../secret'), null);
  assert.equal(parseTicker('AAPL!'), null);
});

test('marketDataError returns the stable v1 error envelope', () => {
  assert.deepEqual(marketDataError('NOT_FOUND', 'No data is available for this ticker.', 'req-1'), {
    version: 'v1',
    error: {
      code: 'NOT_FOUND',
      message: 'No data is available for this ticker.',
      requestId: 'req-1',
    },
  });
});
