import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type Lens = "newsroom" | "legal";

const LENS_STORAGE_KEY = "lantern_lens";

interface LensContextValue {
  lens: Lens;
  setLens: (lens: Lens) => void;
  lensLabel: string;
}

const LensContext = createContext<LensContextValue>({
  lens: "newsroom",
  setLens: () => {},
  lensLabel: "Newsroom",
});

export function LensProvider({ children }: { children: ReactNode }) {
  const [lens, setLensState] = useState<Lens>(() => {
    const saved = localStorage.getItem(LENS_STORAGE_KEY);
    return saved === "legal" ? "legal" : "newsroom";
  });

  const setLens = useCallback((newLens: Lens) => {
    setLensState(newLens);
    localStorage.setItem(LENS_STORAGE_KEY, newLens);
  }, []);

  const lensLabel = lens === "newsroom" ? "Newsroom" : "Legal";

  return (
    <LensContext.Provider value={{ lens, setLens, lensLabel }}>
      {children}
    </LensContext.Provider>
  );
}

export function useLens() {
  return useContext(LensContext);
}
