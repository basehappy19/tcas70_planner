import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "TCAS 70 Planner",
  description: "ระบบจัดการตารางอ่านหนังสือและจำลองสอบสำหรับเบส",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#FAFAF7] text-white font-sans antialiased flex flex-col md:flex-row min-h-screen">
        <Sidebar />

        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}