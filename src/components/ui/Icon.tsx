const PATHS: Record<string, string> = {
  home: "M3 11 12 3l9 8M5 10v10h14V10",
  user: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
  wallet: "M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 0 2-3h12l2 3M16 13h2",
  book: "M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM8 7h7M8 11h7",
  users: "M16 21a6 6 0 0 0-12 0M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21a5 5 0 0 0-4-4.9M16 3.2a4 4 0 0 1 0 7.6",
  card: "M2 6h20v12H2zM2 10h20M6 15h4",
  file: "M14 2H6v20h12V6l-4-4Zm0 0v4h4M9 13h6M9 17h4",
  chat: "M21 15a3 3 0 0 1-3 3H8l-5 4V5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z",
  bell: "M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8ZM10 20a2 2 0 0 0 4 0",
  settings: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4",
  plus: "M12 5v14M5 12h14",
  x: "M18 6 6 18M6 6l12 12",
  check: "m5 12 4 4L19 6",
  chevronDown: "m6 9 6 6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  arrowRight: "M5 12h14M13 6l6 6-6 6",
  arrowLeft: "M19 12H5M11 6l-6 6 6 6",
  download: "M12 3v12m0 0-4-4m4 4 4-4M4 19h16",
  upload: "M12 16V4m0 0-4 4m4-4 4 4M4 20h16",
  menu: "M3 6h18M3 12h18M3 18h18",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-5-5",
  more: "M12 5.5v.01M12 12v.01M12 18.5v.01",
  calendar: "M4 6h16v15H4zM4 10h16M8 3v4M16 3v4",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  alert: "M12 3 2 20h20L12 3ZM12 10v4M12 17v.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 8v.01",
  shield: "M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3ZM9 12l2 2 4-4",
  phone: "M7 2h10v20H7zM11 18h2",
  bank: "M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18",
  logout: "M10 4H5v16h5M14 8l4 4-4 4M18 12H9",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.7M12 17v.01",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  eyeOff: "m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.5 5.4A11 11 0 0 1 12 5c6 0 10 7 10 7a18 18 0 0 1-3 3.8M6.2 6.2A20 20 0 0 0 2 12s4 7 10 7a11 11 0 0 0 5.8-1.8",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  moon: "M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z",
  cap: "m2 9 10-5 10 5-10 5-10-5ZM6 11v6c3 3 9 3 12 0v-6M22 9v6",
  trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
  receipt: "M6 2h12v20l-3-2-3 2-3-2-3 2V2ZM9 8h6M9 12h6",
  flag: "M5 21V4h13l-2 4 2 4H5",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14",
  refresh: "M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7",
  send: "M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z",
  pin: "M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12ZM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  lock: "M6 10h12v11H6zM9 10V7a3 3 0 0 1 6 0v3",
  star: "m12 3 2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2 6.4 20.3l1.2-6.3L3 9.6l6.3-.8L12 3Z",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  edit: "M4 20h4L19 9l-4-4L4 16v4ZM13 7l4 4",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9Z",
};

export function Icon({ name, size = 18, strokeWidth = 1.8 }: { name: string; size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "more" ? 3 : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ flexShrink: 0 }}
    >
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}
