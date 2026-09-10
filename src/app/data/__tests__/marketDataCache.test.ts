import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryMarketDataCache } from '../marketDataCache';
import { generateMockData } from '../mockData';

test('in-memory market data cache returns entries only within their TTL', async () => {
  let currentTime = 0;
  const cache = new InMemoryMarketDataCache(() => currentTime);
  const data = await generateMockData('NVDA');
  assert.ok(data);

  await cache.set('NASDAQ:NVDA', { data, fetchedAt: 0 }, 100);

  currentTime = 99;
  assert.deepEqual(await cache.get('NASDAQ:NVDA'), { data, fetchedAt: 0 });

  currentTime = 100;
  assert.equal(await cache.get('NASDAQ:NVDA'), null);
});

test('in-memory market data cache removes entries with a non-positive TTL', async () => {
  const cache = new InMemoryMarketDataCache();
  const data = await generateMockData('NVDA');
  assert.ok(data);

  await cache.set('NASDAQ:NVDA', { data, fetchedAt: 0 }, 0);

  assert.equal(await cache.get('NASDAQ:NVDA'), null);
});
