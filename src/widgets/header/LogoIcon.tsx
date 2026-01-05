export function LogoIcon({ className }: { className?: string }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g fill="#ffffff">
        <rect x="4" y="8" width="14" height="2" rx="1" />
        <rect x="4" y="13" width="20" height="2" rx="1" />
        <rect x="4" y="18" width="20" height="2" rx="1" />
        <rect x="4" y="23" width="8" height="2" rx="1" />
      </g>
    </svg>
  );
}

