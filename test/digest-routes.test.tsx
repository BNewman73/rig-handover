import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const GOOD = [
  '{"at":"2026-10-30T01:30:00+01:00","job":"notes/backup","status":"fail","owner":null,"error":"quota exceeded"}',
  '{"at":"2026-10-30T01:30:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
  '{"at":"2026-10-30T01:31:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
  '{"at":"2026-10-30T01:32:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
  '{"at":"2026-10-30T01:33:00+01:00","job":"fixtures/refresh","status":"ok","owner":"rook"}',
  '{"at":"2026-10-30T02:00:00+01:00","job":"lane/sync","status":"ok","owner":"lane"}',
];
const TRUNCATED = '{"at":"2026-10-30T02:10:00+01:00","job":"lane/sy';

function runsDir() {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(join(dir, '2026-10-30.jsonl'), GOOD.join('\n') + '\n');
  writeFileSync(join(dir, '2026-10-31.jsonl'), '');
  writeFileSync(join(dir, '2026-11-01.jsonl'), [...GOOD, TRUNCATED].join('\n') + '\n');
  return dir;
}

const app = createApp({
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir: runsDir(),
});

// The job cell of every body row, in page order. The header row has th cells, so it is skipped.
function pageJobs(html: string) {
  return [...html.matchAll(/<tr[^>]*>\s*<td[^>]*>([^<]*)<\/td>/g)].map((m) => m[1]);
}

describe('GET /digest/:night', () => {
  it('shows the table, one row per job, with — for missing data and warn rows', async () => {
    const res = await app.request('/digest/2026-10-30');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const head of ['job', 'owner', 'runs', 'retries', 'last status', 'last error', 'first', 'last']) {
      expect(html).toContain(head);
    }
    expect(pageJobs(html)).toEqual(['fixtures/refresh', 'lane/sync', 'notes/backup']);
    expect(html).toContain('—');
    expect(html.match(/<tr class="warn"/g)).toHaveLength(2);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no run log for 2026-01-01');
  });

  it('says nothing ran for an empty file', async () => {
    const res = await app.request('/digest/2026-10-31');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('counts a bad line and still shows the good rows', async () => {
    const res = await app.request('/digest/2026-11-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 bad line');
    expect(pageJobs(html)).toEqual(['fixtures/refresh', 'lane/sync', 'notes/backup']);
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the night as readNight builds it, rows sorted by job', async () => {
    const res = await app.request('/api/digest/2026-10-30');
    const night = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(night).toMatchObject({
      night: '2026-10-30',
      counts: { ok: 2, retry: 3, fail: 1 },
      badLines: 0,
    });
    expect(night.rows.map((r) => r.job)).toEqual(['fixtures/refresh', 'lane/sync', 'notes/backup']);
    expect(night.rows[0]).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-30T01:30:00+01:00',
      lastAt: '2026-10-30T01:33:00+01:00',
    });
    expect(night.rows[2]).toMatchObject({ owner: null, lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('answers 404 with an error body for a night with no file', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log for 2026-01-01' });
  });

  it('returns no rows for an empty file', async () => {
    const res = await app.request('/api/digest/2026-10-31');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ rows: [], badLines: 0 });
  });

  it('counts a bad line and still returns the good rows', async () => {
    const res = await app.request('/api/digest/2026-11-01');
    const night = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(night.badLines).toBe(1);
    expect(night.rows).toHaveLength(3);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    for (const night of ['2026-10-30', '2026-11-01']) {
      const html = await (await app.request(`/digest/${night}`)).text();
      const json = (await (await app.request(`/api/digest/${night}`)).json()) as Night;
      expect(pageJobs(html)).toEqual(json.rows.map((r) => r.job));
    }
  });
});
