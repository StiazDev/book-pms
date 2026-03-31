import {
    Document,
    Page,
    View,
    Text,
    StyleSheet,
} from "@react-pdf/renderer";

const colors = {
    black: "#111111",
    darkGray: "#374151",
    midGray: "#6B7280",
    lightGray: "#F3F4F6",
    border: "#E5E7EB",
    blue: "#2563EB",
    green: "#16A34A",
    amber: "#D97706",
    red: "#DC2626",
};

const styles = StyleSheet.create({
    page: {
        fontFamily: "Helvetica",
        fontSize: 9,
        color: colors.darkGray,
        padding: 36,
        backgroundColor: "#FFFFFF",
    },
    // Header
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottomWidth: 2,
        borderBottomColor: colors.black,
        paddingBottom: 10,
        marginBottom: 18,
    },
    headerTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: colors.black },
    headerMeta: { fontSize: 8, color: colors.midGray, textAlign: "right" },
    // Section
    section: { marginBottom: 16 },
    sectionTitle: {
        fontSize: 10,
        fontFamily: "Helvetica-Bold",
        color: colors.black,
        textTransform: "uppercase",
        letterSpacing: 0.8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 4,
        marginBottom: 8,
    },
    // Project info
    infoGrid: { flexDirection: "row", gap: 12 },
    infoBox: {
        flex: 1,
        backgroundColor: colors.lightGray,
        padding: 8,
        borderRadius: 4,
    },
    infoLabel: { fontSize: 7, color: colors.midGray, textTransform: "uppercase", marginBottom: 2 },
    infoValue: { fontSize: 10, fontFamily: "Helvetica-Bold", color: colors.black },
    // Badge
    badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 7, fontFamily: "Helvetica-Bold" },
    // Stage pipeline
    stageRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 8,
    },
    stageDot: { width: 8, height: 8, borderRadius: 4 },
    stageName: { flex: 1, fontSize: 9 },
    stageStatus: { fontSize: 8, color: colors.midGray },
    // Table
    tableHeader: {
        flexDirection: "row",
        backgroundColor: colors.lightGray,
        padding: 6,
        borderRadius: 3,
        marginBottom: 2,
    },
    tableRow: {
        flexDirection: "row",
        paddingVertical: 4,
        paddingHorizontal: 6,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tableCell: { flex: 1, fontSize: 8 },
    tableCellBold: { flex: 1, fontSize: 8, fontFamily: "Helvetica-Bold", color: colors.black },
    // Comm entries
    commRow: {
        paddingVertical: 5,
        paddingHorizontal: 8,
        borderLeftWidth: 3,
        borderLeftColor: colors.blue,
        marginBottom: 4,
        backgroundColor: colors.lightGray,
        borderRadius: 3,
    },
    commSubject: { fontFamily: "Helvetica-Bold", fontSize: 8, color: colors.black },
    commMeta: { fontSize: 7, color: colors.midGray, marginTop: 1 },
    // Footer
    footer: {
        position: "absolute",
        bottom: 24,
        left: 36,
        right: 36,
        flexDirection: "row",
        justifyContent: "space-between",
    },
    footerText: { fontSize: 7, color: colors.midGray },
});

function stageColor(status: string) {
    if (status === "done" || status === "completed") return colors.green;
    if (status === "active" || status === "in-progress") return colors.blue;
    if (status === "blocked") return colors.red;
    return colors.midGray;
}

function statusLabel(status: string) {
    return status?.charAt(0).toUpperCase() + status?.slice(1) || "—";
}

function formatDate(val: any): string {
    if (!val) return "—";
    try { return new Date(val).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
    catch { return "—"; }
}

interface Props {
    project: any;
    author: any;
    stages: any[];
    milestones: any[];
    communications: any[];
}

export function StatusReportPDF({ project, author, stages, milestones, communications }: Props) {
    const generatedAt = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    return (
        <Document title={`Status Report — ${project.title}`} author="BookPMS">
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>BookPMS</Text>
                    <View>
                        <Text style={styles.headerMeta}>Project Status Report</Text>
                        <Text style={styles.headerMeta}>Generated {generatedAt}</Text>
                    </View>
                </View>

                {/* Project Overview */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Project Overview</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Project Title</Text>
                            <Text style={styles.infoValue}>{project.title || "—"}</Text>
                        </View>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Status</Text>
                            <Text style={{ ...styles.infoValue, color: project.status === "active" ? colors.blue : project.status === "completed" ? colors.green : colors.amber }}>
                                {statusLabel(project.status)}
                            </Text>
                        </View>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Expected End Date</Text>
                            <Text style={styles.infoValue}>{formatDate(project.expectedEndDate)}</Text>
                        </View>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>PM</Text>
                            <Text style={styles.infoValue}>{project.assignedPmName || "Unassigned"}</Text>
                        </View>
                    </View>
                </View>

                {/* Author */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Author</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Name</Text>
                            <Text style={styles.infoValue}>{author?.name || "—"}</Text>
                        </View>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Email</Text>
                            <Text style={styles.infoValue}>{author?.email || "—"}</Text>
                        </View>
                        <View style={styles.infoBox}>
                            <Text style={styles.infoLabel}>Genre</Text>
                            <Text style={styles.infoValue}>{author?.genre || "—"}</Text>
                        </View>
                    </View>
                </View>

                {/* Stage Pipeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Stage Pipeline</Text>
                    {stages.length === 0 && <Text style={{ color: colors.midGray, fontSize: 8 }}>No stages defined.</Text>}
                    {stages.map((stage, i) => (
                        <View key={i} style={styles.stageRow}>
                            <View style={{ ...styles.stageDot, backgroundColor: stageColor(stage.status) }} />
                            <Text style={styles.stageName}>{stage.name || `Stage ${i + 1}`}</Text>
                            <Text style={styles.stageStatus}>{statusLabel(stage.status)}</Text>
                            {stage.completedAt && (
                                <Text style={styles.stageStatus}> · {formatDate(stage.completedAt)}</Text>
                            )}
                        </View>
                    ))}
                </View>

                {/* Milestones */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Milestones</Text>
                    {milestones.length === 0 ? (
                        <Text style={{ color: colors.midGray, fontSize: 8 }}>No milestones defined.</Text>
                    ) : (
                        <>
                            <View style={styles.tableHeader}>
                                <Text style={styles.tableCellBold}>Title</Text>
                                <Text style={styles.tableCellBold}>Due Date</Text>
                                <Text style={styles.tableCellBold}>Status</Text>
                            </View>
                            {milestones.map((ms, i) => (
                                <View key={i} style={styles.tableRow}>
                                    <Text style={styles.tableCell}>{ms.title || "—"}</Text>
                                    <Text style={styles.tableCell}>{formatDate(ms.dueDate)}</Text>
                                    <Text style={{ ...styles.tableCell, color: ms.status === "completed" ? colors.green : ms.status === "overdue" ? colors.red : colors.midGray }}>
                                        {statusLabel(ms.status)}
                                    </Text>
                                </View>
                            ))}
                        </>
                    )}
                </View>

                {/* Recent Communications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Communications</Text>
                    {communications.length === 0 && <Text style={{ color: colors.midGray, fontSize: 8 }}>No communications logged.</Text>}
                    {communications.map((comm, i) => (
                        <View key={i} style={{ ...styles.commRow, borderLeftColor: comm.type === "email" ? colors.blue : comm.type === "call" ? colors.amber : colors.midGray }}>
                            <Text style={styles.commSubject}>{comm.subject || "(No subject)"}</Text>
                            <Text style={styles.commMeta}>{comm.type?.toUpperCase()} · {formatDate(comm.sentAt)}</Text>
                        </View>
                    ))}
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <Text style={styles.footerText}>BookPMS — Confidential</Text>
                    <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}
