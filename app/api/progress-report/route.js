import { renderToBuffer } from '@react-pdf/renderer';
import { callClaude, claudeErrorResponse } from '../../../lib/claude';
import { COURSES, EXAM_BOARDS, courseDisplayLabel } from '../../../lib/levels';
import { computeStreak, computeBadges, computeMainTopicStatus } from '../../../lib/rewards';
import { checkRateLimit, recordApiUsage, RATE_LIMIT_MESSAGE } from '../../../lib/rateLimit';
import ProgressReportDocument from './ProgressReportDocument';

// One AI call (the coach's note) plus PDF rendering - generous but not
// unusual next to the other AI routes' maxDuration values.
export const maxDuration = 45;

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get('studentId');
    const accessToken = searchParams.get('accessToken');

    // checkRateLimit both verifies the token and hands back an anon client
    // already scoped to the caller's own JWT - reused below for every
    // query, so access to a linked child's data is enforced by the same
    // RLS policies as everywhere else in the app, not just by the explicit
    // checks below (which exist to give a clear 403 instead of a
    // confusing empty report).
    const rateCheck = await checkRateLimit(accessToken);
    if (rateCheck.error) return Response.json({ error: rateCheck.error }, { status: rateCheck.status });
    if (rateCheck.limited) return Response.json({ error: RATE_LIMIT_MESSAGE, code: 'own_rate_limit' }, { status: 429 });
    const { supabase, userId: callerId } = rateCheck;

    const targetStudentId = requestedStudentId || callerId;

    let targetProfile;
    if (targetStudentId === callerId) {
      const { data, error } = await supabase.from('profiles').select('full_name, parent_id').eq('id', callerId).maybeSingle();
      if (error) throw error;
      targetProfile = data;
    } else {
      const { data: callerProfile, error: callerError } = await supabase
        .from('profiles')
        .select('is_parent')
        .eq('id', callerId)
        .maybeSingle();
      if (callerError) throw callerError;
      if (!callerProfile?.is_parent) {
        return Response.json({ error: "You don't have permission to view this student's report." }, { status: 403 });
      }
      const { data, error } = await supabase.from('profiles').select('full_name, parent_id').eq('id', targetStudentId).maybeSingle();
      if (error) throw error;
      if (!data || data.parent_id !== callerId) {
        return Response.json({ error: "You don't have permission to view this student's report." }, { status: 403 });
      }
      targetProfile = data;
    }

    const { data: attemptsData, error: attemptsError } = await supabase
      .from('attempts')
      .select('board, course, topic, points, marked_lines, created_at')
      .eq('student_id', targetStudentId)
      .order('created_at', { ascending: false });
    if (attemptsError) throw attemptsError;
    const attempts = attemptsData || [];

    const totalPoints = attempts.reduce((sum, a) => sum + (a.points || 0), 0);
    const streak = computeStreak(attempts);
    const badgeLabels = computeBadges(attempts).filter((b) => b.unlocked).map((b) => b.label);

    // One section per (course, board) the student actually has attempts
    // under, in first-seen (most-recent-practice-first) order - each
    // listing every main topic in that course (not just attempted ones) so
    // the report shows full syllabus coverage, grouped by main topic rather
    // than every individual sub-topic to keep it readable.
    const seenCourseBoards = new Set();
    const courseSections = [];
    for (const a of attempts) {
      if (!a.course || !a.board) continue;
      const key = `${a.course}::${a.board}`;
      if (seenCourseBoards.has(key)) continue;
      seenCourseBoards.add(key);
      const courseInfo = COURSES.find((c) => c.key === a.course);
      if (!courseInfo) continue;
      const boardInfo = EXAM_BOARDS.find((b) => b.key === a.board);
      courseSections.push({
        courseLabel: courseDisplayLabel(courseInfo, a.board),
        boardLabel: boardInfo?.label || a.board,
        topics: courseInfo.topics.map((mt) => ({
          name: mt.name,
          status: computeMainTopicStatus(attempts, a.course, a.board, mt)
        }))
      });
    }

    const studentName = targetProfile?.full_name || 'Student';
    const topicSummaryText = courseSections
      .map((cs) => `${cs.courseLabel} (${cs.boardLabel}): ` + cs.topics.map((t) => `${t.name} - ${t.status}`).join('; '))
      .join('\n');
    const system =
      "You are an experienced, encouraging maths teacher writing the closing \"coach's note\" for a student's progress report PDF, sent to the student and/or their parent. Return ONLY valid JSON, no markdown fences, with exactly this field: coachNote (2-3 sentences, warm and specific - mention a genuine strength and name one concrete focus area based on the topic statuses given, avoid generic filler).";
    const userText =
      `Student: ${studentName}\nTotal points: ${totalPoints}\nCurrent streak: ${streak} days\nBadges earned: ${badgeLabels.join(', ') || 'None yet'}\n\nTopic status by course:\n${topicSummaryText || "No practice history yet - this student is just getting started."}`;
    const { coachNote } = await callClaude({ system, userText, expectJson: true });
    await recordApiUsage(supabase, callerId, 'progress-report');

    const pdfBuffer = await renderToBuffer(
      <ProgressReportDocument
        studentName={studentName}
        generatedDate={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        totalPoints={totalPoints}
        streak={streak}
        badgeLabels={badgeLabels}
        courseSections={courseSections}
        coachNote={coachNote}
      />
    );

    const studentSlug = studentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '') || 'student';

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="stepwise-progress-${studentSlug}.pdf"`
      }
    });
  } catch (err) {
    const { body, status } = claudeErrorResponse(err);
    return Response.json(body, { status });
  }
}
