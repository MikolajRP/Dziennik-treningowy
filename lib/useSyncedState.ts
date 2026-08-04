"use client";

import { useState, type Dispatch, type SetStateAction } from "react";

// Local, optimistically-editable state that resets to `value` whenever the
// caller hands us a fresh reference for it (e.g. after router.refresh()
// re-runs the server component above us and passes new initial* props).
// This is React's documented "adjust state during render" pattern rather
// than a useEffect — mirroring a prop into state inside an effect costs an
// extra render pass and trips the set-state-in-effect lint rule.
export function useSyncedState<T>(value: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setState(value);
  }
  return [state, setState];
}
