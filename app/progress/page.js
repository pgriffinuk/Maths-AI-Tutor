'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabaseClient';
import Logo from '../components/Logo';
import { COURSES } from '../../lib/levels';
import { downloadProgressReport } from '../../lib/downloadProgressReport';

const DAYS_BACK = 28;
const MIN_DAYS_FOR_CHART = 3;
const AXIS_TICK_STYLE = { fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, fill: 'var(--ink-soft)' };

// "3/4 marks" -> 75. Skips (returns null) anything that doesn't parse
// cleanly rather than throwing, since overall_score is free-ish text from
// the AI, not a guaranteed-clean number.
function parseScorePercent(overallScore) {
  if (!overallScore) return null;
  const match = String(overallScore).match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!denominator) return null;
  return (numerator / denominator) * 100;
}

// One point per calendar day that has at least one parseable attempt,
// averaging accuracy across every attempt that day. Attempts must already
// be sorted by created_at ascending, so the returned array comes out in
// chronological order for free (Map preserves insertion order).
function groupByDay(attempts) {
  const byDay = new Map();
  for (const a of attempts) {
    const percent = parseScorePercent(a.overall_score);
    if (percent === null) continue;
    const d = new Date(a.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!byDay.has(key)) {
      byDay.set(key, {
        label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
        total: 0,
        count: 0
      });
    }
    const entry = byDay.get(key);
    entry.total += percent;
    entry.count += 1;
  }
  return Array.from(byDay.values()).map((e) => ({ label: e.label, accuracy: Math.round(e.total / e.count) }));
}

export default function ProgressPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courseFilter, setCourseFilter] = useState('all');
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  async function handleDownloadReport() {
    setDownloadingReport(true);
    setReportError('');
    try {
      await downloadProgressReport({ accessToken: session?.access_token });
    } catch (err) {
      setReportError(err.message || 'Could not generate the report - please try again.');
    } finally {
      setDownloadingReport(false);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return; }
      setSession(data.session);

      const since = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
      const { data: rows, error } = await supabase
        .from('attempts')
        .select('created_at, overall_score, course, topic')
        .eq('student_id', data.session.user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: true });
      if (error) console.error('Could not load progress:', error.message);
      setAttempts(rows || []);
      setLoading(false);
    });
  }, [router]);

  if (!session) return null;

  const filteredAttempts = courseFilter === 'all'
    ? attempts
    : attempts.filter((a) => a.course === courseFilter);
  const chartData = groupByDay(filteredAttempts);
  const hasEnoughData = chartData.length >= MIN_DAYS_FOR_CHART;

  return (
    <div className="wrap">
      <div className="topnav">
        <Logo size="sm" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleDownloadReport} disabled={downloadingReport} style={{ fontSize: 12, padding: '5px 10px' }}>
            {downloadingReport ? 'Preparing PDF...' : 'Download progress report'}
          </button>
          <button onClick={() => router.push('/dashboard')} style={{ fontSize: 12, padding: '5px 10px' }}>
            Back to dashboard
          </button>
        </div>
      </div>

      {reportError && <div className="alert-error">{reportError}</div>}

      <div className="eyebrow section-gap">Last {DAYS_BACK} days</div>
      <h1>Progress</h1>

      <div className="card">
        <div className="controls" style={{ marginBottom: 20 }}>
          <select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}>
            <option value="all">All courses</option>
            {COURSES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        </div>

        {loading ? (
          <>
            <div className="skeleton-line" style={{ width: '95%' }}></div>
            <div className="skeleton-line"></div>
          </>
        ) : hasEnoughData ? (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="var(--paper-line)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={AXIS_TICK_STYLE} axisLine={{ stroke: 'var(--paper-line)' }} tickLine={false} />
                <YAxis
                  domain={[0, 100]}
                  tick={AXIS_TICK_STYLE}
                  axisLine={{ stroke: 'var(--paper-line)' }}
                  tickLine={false}
                  unit="%"
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: 12,
                    border: '1.5px solid var(--ink)',
                    borderRadius: 6
                  }}
                  formatter={(value) => [`${value}%`, 'Avg. accuracy']}
                />
                <Line type="monotone" dataKey="accuracy" stroke="var(--green)" strokeWidth={2} dot={{ fill: 'var(--green)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: 'var(--ink-soft)', margin: 0 }}>
            Keep practising - your progress chart will appear here once you&apos;ve got a few days of attempts logged.
          </p>
        )}
      </div>
    </div>
  );
}
