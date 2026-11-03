import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Kannada } from "next/font/google";
import metaJson from "@data/meta.json";
import { Sidebar } from "@/components/Sidebar";
import { SettingsProvider } from "@/lib/settings";
import type { Meta } from "@/lib/types";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const kannada = Noto_Sans_Kannada({ variable: "--font-kannada", subsets: ["kannada"] });

const meta = metaJson as Meta;

export const metadata: Metadata = {
  title: { default: "Kannada Akshara Corpus", template: "%s · Kannada Akshara Corpus" },
  description: "Akshara frequency, transition probability and orthographic complexity in a Kannada textbook corpus.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${kannada.variable} antialiased`}>
      <body className="bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <SettingsProvider defaultMinCount={meta.min_denom}>
          <div className="min-h-screen md:flex">
            <Sidebar />
            <div className="min-w-0 flex-1">
              <main className="mx-auto max-w-[1280px] px-4 py-6 md:px-8">{children}</main>
              <footer className="mx-auto max-w-[1280px] px-4 pb-6 text-xs text-zinc-500 md:px-8 dark:text-zinc-400">
                Data: <span lang="kn">{meta.corpus}</span> · generated {meta.generated_at.slice(0, 10)}
                {meta.git_commit && <> · commit {meta.git_commit}</>}
              </footer>
            </div>
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
