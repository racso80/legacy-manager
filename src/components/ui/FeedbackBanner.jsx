import { FEEDBACK_COLORS } from "../../utils/feedback.js";

export default function FeedbackBanner({ feedback, style }) {
  if (!feedback) return null;
  const colors = FEEDBACK_COLORS[feedback.type] ?? FEEDBACK_COLORS.success;
  return (
    <div style={{ background:colors.bg, border:`1px solid ${colors.border}`, color:colors.text, borderRadius:9, padding:"9px 11px", fontSize:11, fontWeight:800, lineHeight:1.4, marginBottom:10, ...style }}>
      {feedback.message}
    </div>
  );
}
