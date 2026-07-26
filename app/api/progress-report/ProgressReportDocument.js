import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Same brand colours as app/globals.css's CSS variables, hardcoded here
// since @react-pdf/renderer renders outside the browser (no CSS variables
// available) - keep these in sync with globals.css's --ink/--green/--gold/
// --ink-soft by hand if the palette ever changes.
const INK = '#1C2541';
const INK_SOFT = '#4A5568';
const GREEN = '#2F7A4D';
const GOLD = '#C98A1E';
const GREY = '#B9C2CB';

const STATUS_COLORS = { mastered: GREEN, 'in-progress': GOLD, 'not-started': GREY };
const STATUS_LABELS = { mastered: 'Mastered', 'in-progress': 'In progress', 'not-started': 'Not started' };

// Deliberately conservative style props only (no shorthand border, no flex
// `gap`) - there's no way to render-check this in the sandbox this was
// written in, so this sticks to the most universally-documented subset of
// @react-pdf/renderer's React-Native-style system rather than anything
// version-sensitive.
const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, color: INK },
  brand: { fontSize: 20, fontWeight: 'bold', color: INK, marginBottom: 4 },
  studentLine: { fontSize: 13, color: INK, marginBottom: 2 },
  dateLine: { fontSize: 10, color: INK_SOFT, marginBottom: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: INK,
    marginTop: 14,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: INK
  },
  statsRow: { flexDirection: 'row', marginBottom: 8 },
  statBlock: { marginRight: 30 },
  statNum: { fontSize: 20, fontWeight: 'bold', color: INK },
  statLabel: { fontSize: 9, color: INK_SOFT },
  badgeText: { fontSize: 11, color: INK_SOFT, marginTop: 4 },
  courseBlock: { marginBottom: 10 },
  courseName: { fontSize: 12, fontWeight: 'bold', color: INK, marginBottom: 4 },
  topicRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 2, paddingBottom: 2 },
  topicName: { fontSize: 10, color: INK },
  topicStatus: { fontSize: 10, fontWeight: 'bold' },
  coachNote: { fontSize: 11, lineHeight: 1.5, color: INK, marginTop: 4 },
  emptyNote: { fontSize: 11, color: INK_SOFT }
});

// courseSections: [{ courseLabel, boardLabel, topics: [{ name, status }] }]
export default function ProgressReportDocument({
  studentName,
  generatedDate,
  totalPoints,
  streak,
  badgeLabels,
  courseSections,
  coachNote
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.brand}>Stepwise - Progress Report</Text>
          <Text style={styles.studentLine}>{studentName}</Text>
          <Text style={styles.dateLine}>{generatedDate}</Text>
        </View>

        <Text style={styles.sectionTitle}>Summary</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBlock}>
            <Text style={styles.statNum}>{totalPoints}</Text>
            <Text style={styles.statLabel}>POINTS</Text>
          </View>
          <View style={styles.statBlock}>
            <Text style={styles.statNum}>{streak}</Text>
            <Text style={styles.statLabel}>DAY STREAK</Text>
          </View>
        </View>
        <Text style={styles.badgeText}>
          Badges earned: {badgeLabels.length > 0 ? badgeLabels.join(', ') : 'None yet'}
        </Text>

        <Text style={styles.sectionTitle}>Topic progress</Text>
        {courseSections.length === 0 ? (
          <Text style={styles.emptyNote}>No practice history yet.</Text>
        ) : (
          courseSections.map((cs, i) => (
            <View key={i} style={styles.courseBlock}>
              <Text style={styles.courseName}>{cs.courseLabel} ({cs.boardLabel})</Text>
              {cs.topics.map((t, j) => (
                <View key={j} style={styles.topicRow}>
                  <Text style={styles.topicName}>{t.name}</Text>
                  <Text style={[styles.topicStatus, { color: STATUS_COLORS[t.status] }]}>
                    {STATUS_LABELS[t.status]}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Coach's note</Text>
        <Text style={styles.coachNote}>{coachNote}</Text>
      </Page>
    </Document>
  );
}
