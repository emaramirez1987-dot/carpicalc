// icons.jsx — All SVG icons for Vista 3D
// Rules:
//   • Always stroke/fill with currentColor — inherits from parent
//   • Uniform API: ({ size = 14 }) => JSX
//   • No hardcoded color values anywhere
//   • One export per icon, named exports only

export const IsoIcon = ({ size = 14 }) => (
  <svg width={size} height={Math.round(size * 14 / 16)} viewBox="0 0 16 14" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
    <path d="M8 1L15 5V9L8 13L1 9V5L8 1Z" />
    <path d="M8 1V13" strokeWidth="0.8" />
    <path d="M1 5L8 8.5L15 5" strokeWidth="0.8" />
  </svg>
);

export const FrontIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3">
    <rect x="2" y="2" width="10" height="10" />
  </svg>
);

export const SideIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3">
    <rect x="4" y="2" width="6" height="10" />
  </svg>
);

export const TopIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3">
    <rect x="2" y="4" width="10" height="6" />
  </svg>
);

export const GridIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.2">
    <path d="M2 2H12V12H2Z" />
    <path d="M2 7H12M7 2V12" />
  </svg>
);

export const LightIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3">
    <circle cx="7" cy="6" r="2.5" />
    <path d="M7 1V2M7 10V11M2 6H3M11 6H12M3.5 3.5L4.2 4.2M9.8 3.5L9.1 4.2M3.5 8.5L4.2 7.8M9.8 8.5L9.1 7.8" />
    <path d="M5.5 11H8.5" strokeWidth="1.1" />
    <path d="M6 13H8" strokeWidth="1.1" />
  </svg>
);

export const RefreshIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <path d="M12 7A5 5 0 1 1 9 2.5" />
    <path d="M9 1v2.5H11.5" />
  </svg>
);

export const MaximizeIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <path d="M9 2h3v3M5 12H2V9M12 2L8 6M2 12L6 8" />
  </svg>
);

export const MinimizeIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <path d="M6 2H3v3M8 12h3V9M3 5L7 9M11 9L7 5" />
  </svg>
);

export const RotateIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
    <path d="M11.5 7A4.5 4.5 0 1 1 7 2.5" />
    <path d="M7 1v2.5H9.5" />
  </svg>
);

export const TrashIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <path d="M3 4h8" />
    <path d="M5.5 4V3h3v1" />
    <path d="M4.5 4l.5 7h4l.5-7" />
    <path d="M6 6.5v3M8 6.5v3" strokeWidth="1.1" />
  </svg>
);

export const WallsIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12V4L7 2L12 4V12" />
    <path d="M2 12H12" />
    <path d="M7 2V9" strokeWidth="0.8" opacity="0.55" />
  </svg>
);

export const ContourIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
    <rect x="2.5" y="2.5" width="9" height="9" strokeDasharray="2.5 1.5" />
  </svg>
);

export const CaptureIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
    <path d="M7 2l5 5-5 5-5-5z" />
    <path d="M7 1V2M7 12v1M1 7H2M12 7h1" strokeWidth="0.9" opacity="0.5" />
  </svg>
);

// Floor plane — isometric rhombus viewed from above
export const FloorIcon = ({ size = 14 }) => (
  <svg width={size} height={Math.round(size * 10 / 14)} viewBox="0 0 14 10" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round">
    <path d="M7 1L13 4.5L7 8L1 4.5L7 1Z" />
    <path d="M7 4.5V8" strokeWidth="0.8" opacity="0.45" />
    <path d="M1 4.5L7 4.5L13 4.5" strokeWidth="0.8" opacity="0.45" />
  </svg>
);

// Countertop — horizontal slab with front overhang
export const MesadaIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" fill="none"
    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1.5" y="5.5" width="11" height="2.5" />
    <path d="M3.5 8v3M10.5 8v3" />
  </svg>
);
