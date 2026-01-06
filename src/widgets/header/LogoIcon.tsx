export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Vibe Semantic 로고"
      role="img"
    >
      <title>Vibe Semantic 로고</title>
      <rect width="32" height="32" fill="#0a0a0a" />
      <g fill="#ffffff">
        <rect x="4" y="8" width="20" height="2" rx="1" />
        <rect x="4" y="13" width="12" height="2" rx="1" />
        <rect x="4" y="18" width="20" height="2" rx="1" />
        <rect x="4" y="23" width="12" height="2" rx="1" />
      </g>
    </svg>
  );
}

