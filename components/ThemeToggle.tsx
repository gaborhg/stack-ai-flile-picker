"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    /* Schedule the mounted flag on the next animation frame to avoid 
       calling setState synchronously inside the effect (prevents cascading renders). */
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const isDark = mounted && (theme === "dark" || resolvedTheme === "dark");

  return (
    <div className="fixed top-3 right-3 z-50">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {mounted ? (
          isDark ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )
        ) : (
          <span className="inline-block h-4 w-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}
