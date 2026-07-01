import { useState, useEffect } from "react";

export const PC_BREAKPOINT = 1024;

export const useIsPC = () => {
  const [isPC, setIsPC] = useState(() => window.innerWidth >= PC_BREAKPOINT);
  useEffect(() => {
    const handler = () => setIsPC(window.innerWidth >= PC_BREAKPOINT);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isPC;
};
