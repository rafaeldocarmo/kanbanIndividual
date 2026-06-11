"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <NuqsAdapter>{children}</NuqsAdapter>
      <Toaster richColors position="bottom-right" />
    </ThemeProvider>
  );
}
