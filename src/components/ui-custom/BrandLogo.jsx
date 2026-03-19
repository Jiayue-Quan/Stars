import { useId } from 'react';

import { cn } from '@/lib/utils';

function BrandMark({ className }) {
  const id = useId().replace(/:/g, '');
  const bgId = `brand-bg-${id}`;
  const edgeId = `brand-edge-${id}`;
  const starFillId = `brand-star-fill-${id}`;
  const glowId = `brand-glow-${id}`;
  const shadowId = `brand-shadow-${id}`;
  const starShadowId = `brand-star-shadow-${id}`;
  const clipId = `brand-clip-${id}`;

  return (
    <svg
      viewBox="0 0 512 512"
      className={cn('shrink-0 drop-shadow-[0_14px_30px_rgba(64,22,10,0.3)]', className)}
      aria-hidden="true"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={bgId} x1="88" y1="72" x2="432" y2="456" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#D97A47" />
          <stop offset="0.52" stopColor="#BF6435" />
          <stop offset="1" stopColor="#8E4323" />
        </linearGradient>

        <linearGradient id={edgeId} x1="120" y1="92" x2="398" y2="420" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F2A16A" />
          <stop offset="1" stopColor="#7A3519" />
        </linearGradient>

        <linearGradient id={starFillId} x1="256" y1="148" x2="256" y2="348" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFF6E9" />
          <stop offset="1" stopColor="#F6E4CB" />
        </linearGradient>

        <radialGradient
          id={glowId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(380 118) rotate(133.21) scale(178.643)"
        >
          <stop stopColor="#FFB37A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFB37A" stopOpacity="0" />
        </radialGradient>

        <filter id={shadowId} x="52" y="56" width="408" height="420" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="18" />
          <feGaussianBlur stdDeviation="18" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.42 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_1" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1_1" result="shape" />
        </filter>

        <filter
          id={starShadowId}
          x="122"
          y="118"
          width="268"
          height="255"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
          <feOffset dy="8" />
          <feGaussianBlur stdDeviation="10" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.301961 0 0 0 0 0.117647 0 0 0 0 0.0392157 0 0 0 0.24 0" />
          <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_1" />
          <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1_1" result="shape" />
        </filter>

        <clipPath id={clipId}>
          <rect x="96" y="80" width="320" height="320" rx="84" />
        </clipPath>
      </defs>

      <g filter={`url(#${shadowId})`}>
        <rect x="96" y="80" width="320" height="320" rx="84" fill={`url(#${bgId})`} />
        <rect x="98.5" y="82.5" width="315" height="315" rx="81.5" stroke={`url(#${edgeId})`} strokeWidth="5" />

        <g clipPath={`url(#${clipId})`}>
          <ellipse cx="256" cy="240" rx="178" ry="162" fill="#6B2C15" opacity="0.22" />
          <ellipse cx="354" cy="118" rx="148" ry="112" fill={`url(#${glowId})`} />
          <path
            d="M121 126C179 109 247 111 317 139C366 159 399 190 421 236V80H96V198C101 163 106 139 121 126Z"
            fill="#F6B184"
            opacity="0.16"
          />
          <path
            d="M416 136C382 112 331 104 266 112C316 114 352 127 379 149C392 159 404 176 416 198V136Z"
            fill="#FFD3B3"
            opacity="0.18"
          />
          <ellipse cx="256" cy="410" rx="136" ry="46" fill="#4D1D0A" opacity="0.28" />
        </g>

        <g filter={`url(#${starShadowId})`}>
          <path
            d="M256 138L284.936 197.492L350.033 207.04L302.848 253.704L313.987 319.46L256 288.52L198.013 319.46L209.152 253.704L161.967 207.04L227.064 197.492L256 138Z"
            fill={`url(#${starFillId})`}
          />
          <path
            d="M256 148L281.343 200.11L338.362 208.47L297.072 249.291L306.82 306.814L256 279.694L205.18 306.814L214.928 249.291L173.638 208.47L230.657 200.11L256 148Z"
            stroke="#F6C08B"
            strokeWidth="4"
            opacity="0.65"
          />
        </g>

        <circle cx="374" cy="122" r="8" fill="#FFF4E6" opacity="0.95" />
        <path
          d="M374 96V111M374 133V148M348 122H363M385 122H400"
          stroke="#FFF4E6"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>
    </svg>
  );
}

export function BrandLogo({
  className,
  markClassName,
  wordmarkClassName,
  taglineClassName,
  titleClassName,
  showTagline = false,
  stacked = false,
}) {
  return (
    <div className={cn('flex items-center gap-3', stacked && 'flex-col text-center', className)}>
      <BrandMark className={cn('h-11 w-11 shrink-0', markClassName)} />
      <div className={cn('leading-none', wordmarkClassName)}>
        <span className={cn('heading-display heading-gradient block text-[1.9rem]', titleClassName)}>STARS</span>
        {showTagline ? (
          <span className={cn('mt-1 block text-[10px] uppercase tracking-[0.28em] text-white/34', taglineClassName)}>
            Movie Intelligence
          </span>
        ) : null}
      </div>
    </div>
  );
}
