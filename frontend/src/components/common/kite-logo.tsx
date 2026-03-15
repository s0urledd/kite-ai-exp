export function KiteLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="kg" x1="20" y1="10" x2="80" y2="90">
          <stop offset="0%" stopColor="#DBC993" />
          <stop offset="50%" stopColor="#C4A96A" />
          <stop offset="100%" stopColor="#8B7A4E" />
        </linearGradient>
      </defs>
      <path
        d="M55 12C70 12 88 25 88 42C88 55 78 62 68 68C62 72 55 80 48 88C44 82 35 72 28 65C18 55 12 45 12 35C12 20 28 12 42 12Z"
        fill="url(#kg)"
        opacity="0.9"
      />
      <circle cx="38" cy="38" r="8" fill="#09090B" opacity="0.5" />
      <circle cx="62" cy="38" r="8" fill="#09090B" opacity="0.5" />
      <circle cx="48" cy="62" r="8" fill="#09090B" opacity="0.5" />
    </svg>
  );
}
