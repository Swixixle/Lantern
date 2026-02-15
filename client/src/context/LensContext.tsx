import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { vault } from "@/lib/vault";

export type Lens = "newsroom" | "legal";

const LENS_STORAGE_KEY = "lantern_lens";
const VAULT_LENS_KEY = "preferredLens";

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

  useEffect(() => {
    vault.getMeta(VAULT_LENS_KEY).then((saved) => {
      if (saved === "legal" || saved === "newsroom") {
        setLensState(saved);
      }
    }).catch(() => {});
  }, []);

  const setLens = useCallback((newLens: Lens) => {
    setLensState(newLens);
    vault.setMeta(VAULT_LENS_KEY, newLens).catch(() => {});
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
