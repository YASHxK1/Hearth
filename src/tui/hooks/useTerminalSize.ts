import { useEffect, useState } from "react";

export type TerminalSize = {
  columns: number;
  rows: number;
};

export function useTerminalSize(): TerminalSize {
  const [size, setSize] = useState<TerminalSize>(() => ({
    columns: process.stdout.columns ?? 100,
    rows: process.stdout.rows ?? 30
  }));

  useEffect(() => {
    const update = () => {
      setSize({
        columns: process.stdout.columns ?? 100,
        rows: process.stdout.rows ?? 30
      });
    };

    process.stdout.on("resize", update);
    return () => {
      process.stdout.off("resize", update);
    };
  }, []);

  return size;
}
