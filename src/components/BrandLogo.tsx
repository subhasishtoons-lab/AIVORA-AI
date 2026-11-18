export function BrandLogo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="aivoraMarkGrad" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#aivoraMarkGrad)" />
        <path
          d="M16 7.5L23.5 23H19.8L18.2 19.3H13.8L12.2 23H8.5L16 7.5ZM16 13.1L14.7 16.5H17.3L16 13.1Z"
          fill="white"
        />
        <circle cx="24.2" cy="8.2" r="2" fill="#93C5FD" />
      </svg>
      <span className="font-display text-lg font-bold tracking-normal text-slate-900 dark:text-white">
        AIVORA AI
      </span>
    </span>
  );
}
