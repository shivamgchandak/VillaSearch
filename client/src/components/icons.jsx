// Line icons drawn for this app, all on a 24 unit grid and coloured by the
// text around them. Decorative, so hidden from screen readers.
const Icon = ({ size = 20, children, fill = "none" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-hidden="true" focusable="false">
    {children}
  </svg>
);
const line = { stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };

export const PinIcon = (p) => (
  <Icon {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" {...line} />
    <circle cx="12" cy="10" r="2.4" {...line} />
  </Icon>
);
export const CalendarIcon = (p) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" {...line} />
    <path d="M3.5 10h17M8 3v4M16 3v4" {...line} />
  </Icon>
);
export const PeopleIcon = (p) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.5" {...line} />
    <path d="M3 19c.8-3.3 3.2-5 6-5s5.2 1.7 6 5M16 5.2a3.2 3.2 0 0 1 0 6M18 14.4c1.5.7 2.5 2.2 3 4.6" {...line} />
  </Icon>
);
export const SearchIcon = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" {...line} strokeWidth="2" />
    <path d="M16 16l4 4" {...line} strokeWidth="2" />
  </Icon>
);
export const ArrowIcon = (p) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" {...line} strokeWidth="2.2" />
  </Icon>
);
export const BackIcon = (p) => (
  <Icon {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" {...line} strokeWidth="2" />
  </Icon>
);
export const CloseIcon = (p) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" {...line} strokeWidth="2.4" />
  </Icon>
);
export const ChevronIcon = (p) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" {...line} strokeWidth="2.4" />
  </Icon>
);
export const MicIcon = (p) => (
  <Icon {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" {...line} strokeWidth="2" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" {...line} strokeWidth="2" />
  </Icon>
);
export const ChatIcon = (p) => (
  <Icon {...p}>
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5z" {...line} />
    <path d="M8 9h8M8 12h5" {...line} />
  </Icon>
);
export const PhoneIcon = (p) => (
  <Icon {...p}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" {...line} />
  </Icon>
);
export const CarIcon = (p) => (
  <Icon {...p}>
    <path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16M4 16h16v3H4zM7 19v1.5M17 19v1.5" {...line} />
  </Icon>
);
export const BedIcon = (p) => (
  <Icon {...p}>
    <path d="M3 18V8M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" {...line} />
    <circle cx="7" cy="11" r="1.8" {...line} />
  </Icon>
);
export const CheckIcon = (p) => (
  <Icon {...p}>
    <path d="M5 12.5l4 4 10-10" {...line} strokeWidth="2.2" />
  </Icon>
);
export const AlertIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" {...line} />
    <path d="M12 7.5v5.5M12 16.5v.2" {...line} strokeWidth="2.2" />
  </Icon>
);
export const PlusIcon = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" {...line} strokeWidth="2.2" />
  </Icon>
);

export function Logo({ size = 30, dot = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false">
      <path d="M5 25V13a9 9 0 0 1 18 0v12" stroke="currentColor" strokeWidth="2.2" />
      <path d="M3 25h22" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="14" cy="14" r="2.6" fill={dot} />
    </svg>
  );
}
