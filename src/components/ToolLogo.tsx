import { useState } from 'react';

interface ToolLogoProps {
  name: string;
  logoColor: string;
  logoKey: string;
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}

function getMonogram(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function renderGlyph(logoKey: string, monogram: string, sizeClass: string) {
  switch (logoKey) {
    case 'chatgpt':
      return (
        <svg viewBox="0 0 24 24" className={sizeClass} fill="none" stroke="currentColor" strokeWidth="1.9">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2.5v5M12 16.5v5M3.8 7.25l4.3 2.5M15.9 14.25l4.3 2.5M20.2 7.25l-4.3 2.5M8.1 14.25l-4.3 2.5" strokeLinecap="round" />
        </svg>
      );
    case 'gemini':
      return (
        <svg viewBox="0 0 24 24" className={sizeClass} fill="currentColor">
          <path d="M12 2c.6 5.2 4.8 9.4 10 10-5.2.6-9.4 4.8-10 10-.6-5.2-4.8-9.4-10-10 5.2-.6 9.4-4.8 10-10z" />
        </svg>
      );
    case 'claude':
      return (
        <svg viewBox="0 0 24 24" className={sizeClass} fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
          <path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" />
        </svg>
      );
    case 'cursor':
      return (
        <svg viewBox="0 0 24 24" className={sizeClass} fill="currentColor">
          <path d="M5 3l14 9-6.2 1.8L10 20 5 3z" />
        </svg>
      );
    case 'perplexity':
      return (
        <svg viewBox="0 0 24 24" className={sizeClass} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round">
          <path d="M12 3v18M5 8l7-5 7 5v8l-7 5-7-5V8z" />
          <path d="M5 8l7 4 7-4" />
        </svg>
      );
    case 'midjourney':
      return (
        <svg viewBox="0 0 24 24" className={sizeClass} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17c4-8 6-10 9-12-1 5 0 8 4 12H4z" />
          <path d="M3 20h18" />
        </svg>
      );
    case 'runway':
      return (
        <svg viewBox="0 0 24 24" className={sizeClass} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'elevenlabs':
      return (
        <svg viewBox="0 0 24 24" className={sizeClass} fill="currentColor">
          <rect x="7.5" y="5" width="3" height="14" rx="1" />
          <rect x="13.5" y="5" width="3" height="14" rx="1" />
        </svg>
      );
    case 'suno':
      return (
        <svg viewBox="0 0 24 24" className={sizeClass} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 13v-2M8 16V8M12 19V5M16 15V9M20 13v-2" />
        </svg>
      );
    default:
      return (
        <span className="font-display font-bold tracking-tight">
          {monogram}
        </span>
      );
  }
}

export function ToolLogo({
  name,
  logoColor,
  logoKey,
  logoUrl,
  size = 'md',
}: ToolLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const dims =
    size === 'lg'
      ? 'h-16 w-16 rounded-2xl text-xl'
      : size === 'sm'
      ? 'h-9 w-9 rounded-lg text-xs'
      : 'h-12 w-12 rounded-xl text-sm';

  const iconDims =
    size === 'lg' ? 'h-7 w-7' : size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  if (logoUrl && !imgFailed) {
    return (
      <div
        className={`${dims} shrink-0 overflow-hidden border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800`}
      >
        <img
          src={logoUrl}
          alt={`${name} logo`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      style={{ backgroundColor: logoColor }}
      className={`${dims} shrink-0 flex items-center justify-center text-white shadow-sm ring-1 ring-inset ring-black/10`}
      aria-hidden="true"
    >
      {renderGlyph(logoKey, getMonogram(name), iconDims)}
    </div>
  );
}
