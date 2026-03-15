"use client";

import { useState, useEffect, useRef } from "react";

export function useAnimatedNumber(target: number, duration = 400): number {
  const [value, setValue] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    const start = prev.current;
    const end = target;
    const t0 = Date.now();

    const frame = () => {
      const ratio = Math.min((Date.now() - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3); // ease-out cubic
      setValue(start + (end - start) * eased);
      if (ratio < 1) requestAnimationFrame(frame);
      else prev.current = end;
    };

    requestAnimationFrame(frame);
  }, [target, duration]);

  return value;
}
