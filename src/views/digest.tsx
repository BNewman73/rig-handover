import type { DigestRow, Night } from '../digest/types.js';

const dash = '—';

const isWarn = (r: DigestRow) => r.retries >= 3 || r.lastStatus === 'fail';

export function Digest({ night, data }: { night: string; data: Night | null }) {
  if (!data) {
    return (
      <>
        <h1>digest {night}</h1>
        <p class="mute">no run log for {night}</p>
      </>
    );
  }
  return (
    <>
      <h1>digest {night}</h1>
      {data.badLines > 0 && <p class="warn">{data.badLines === 1 ? '1 bad line' : `${data.badLines} bad lines`}</p>}
      {data.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr class={isWarn(r) ? 'warn' : undefined}>
                <td>{r.job}</td>
                <td>{r.owner ?? dash}</td>
                <td>{r.runs}</td>
                <td>{r.retries}</td>
                <td>{r.lastStatus}</td>
                <td>{r.lastError ?? dash}</td>
                <td>{r.firstAt}</td>
                <td>{r.lastAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
