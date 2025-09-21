"use client";

import { AppLayout } from "@/components/app-layout";

export default function AppMainLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
