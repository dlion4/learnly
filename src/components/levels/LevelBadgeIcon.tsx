import type { EduLevelKey } from "../../data/students";

const paths: Record<EduLevelKey, string[]> = {
  preprimary: ["M5 20V8h14v12", "M8 8V5h8v3", "M9 13h6M9 17h6"],
  primary: ["M3 5c5-2 8 0 9 2 1-2 4-4 9-2v14c-5-2-8 0-9 2-1-2-4-4-9-2Z", "M12 7v14"],
  junior: ["M4 20h16", "M6 20V9l6-5 6 5v11", "M9 12h6M9 16h6"],
  senior: ["m2 9 10-5 10 5-10 5Z", "M6 11v6c3 3 9 3 12 0v-6", "M22 9v7"],
  special: ["M12 21S4 16.2 4 10a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6.2-8 11-8 11Z", "M8 12h2l1-3 2 6 1-3h2"],
  international: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M2 12h20M12 2c3 3 4 6 4 10s-1 7-4 10c-3-3-4-6-4-10s1-7 4-10Z"],
  tvet: ["m14.7 6.3 3-3a5 5 0 0 1-6.4 6.4l-7 7a2.1 2.1 0 0 0 3 3l7-7a5 5 0 0 0 6.4-6.4l-3 3Z", "m14 14 6 6"],
  college: ["M4 7h16v13H4Z", "M9 7V4h6v3", "M4 12h16M10 12v2h4v-2"],
  university: ["m2 8 10-5 10 5-10 5Z", "M5 10v7M9 11v7M15 11v7M19 10v7M3 20h18"],
};

export function LevelBadgeIcon({ level, size = 26 }: { level: EduLevelKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[level].map((d, i) => (
        <path key={d} d={d} pathLength={1} className="icon-draw" style={{ animationDelay: `${i * 140}ms` }} />
      ))}
    </svg>
  );
}
