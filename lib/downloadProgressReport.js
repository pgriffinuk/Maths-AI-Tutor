// Client-only helper for /api/progress-report. A plain GET-with-query-params
// link would work for a public file, but this endpoint is authenticated and
// returns either a PDF or a JSON error depending on what happens - fetching
// it as a blob lets a failed request show its real error message instead of
// the browser just trying (and failing) to download a JSON file named
// "progress-report.pdf". accessToken travels as a query param rather than a
// header since this has to work as a plain browser download, not a fetch
// with custom headers the server would otherwise require.
export async function downloadProgressReport({ studentId, accessToken }) {
  const params = new URLSearchParams({ accessToken });
  if (studentId) params.set('studentId', studentId);

  const res = await fetch(`/api/progress-report?${params.toString()}`);
  if (!res.ok) {
    let message = 'Could not generate the report - please try again.';
    try {
      const data = await res.json();
      if (data.error) message = data.error;
    } catch (err) {
      // response wasn't JSON (e.g. a raw platform error) - keep the generic message
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : 'stepwise-progress-report.pdf';

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
