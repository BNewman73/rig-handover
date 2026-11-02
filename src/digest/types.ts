// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job. Times keep the offset from the log.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

// Rows sorted by job. `counts` is lines per status. `badLines` counts lines that didn't
// parse; they are never thrown.
export type Night = {
  night: string;
  rows: DigestRow[];
  counts: Record<RunStatus, number>;
  badLines: number;
};

// null when runs/<night>.jsonl does not exist. An empty file is a Night with no rows.
export type ReadNight = (runsDir: string, night: string) => Night | null;
