import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_DISMISS_MS = 2500;

export const FEEDBACK_COLORS = {
  success: { text: "#22c55e", bg: "rgba(34,197,94,.12)", border: "rgba(34,197,94,.3)" },
  error: { text: "#ef4444", bg: "rgba(239,68,68,.12)", border: "rgba(239,68,68,.3)" },
  warning: { text: "#f59e0b", bg: "rgba(245,158,11,.12)", border: "rgba(245,158,11,.3)" },
};

export function useFeedback() {
  const [feedback, setFeedback] = useState(null);
  const timerRef = useRef(null);

  const showFeedback = useCallback((message, type = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedback({ message, type });
    timerRef.current = setTimeout(() => setFeedback(null), AUTO_DISMISS_MS);
  }, []);

  const clearFeedback = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedback(null);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { feedback, showFeedback, clearFeedback };
}
