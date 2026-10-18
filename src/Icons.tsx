import React from "react";

export type IconName = "sparkle" | "bolt" | "cap" | "check" | "arrow" | "briefcase" | "bell" | "bulb";

export const Icon: React.FC<{ name: IconName; size: number; color: string; inner?: string }> = ({
  name,
  size,
  color,
  inner = "#000000",
}) => {
  let body: React.ReactNode;
  switch (name) {
    case "sparkle":
      body = <path fill={color} d="M12 2l2.3 6.4L20.7 10.7l-6.4 2.3L12 19.4l-2.3-6.4L3.3 10.7l6.4-2.3z" />;
      break;
    case "bolt":
      body = <path fill={color} d="M13.5 2L4 13.5h6.2L9 22l10-12.5h-6.4z" />;
      break;
    case "cap":
      body = (
        <>
          <path fill={color} d="M12 4L1.5 9.4 12 14.8l8.5-4.4V16h2V9.4z" />
          <path fill={color} d="M5.5 13v3.8c0 1.7 3 3.2 6.5 3.2s6.5-1.5 6.5-3.2V13L12 16.4z" />
        </>
      );
      break;
    case "check":
      body = (
        <>
          <circle cx="12" cy="12" r="10" fill={color} />
          <path d="M7 12.5l3.2 3.2L17 9" stroke={inner} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      );
      break;
    case "arrow":
      body = <path d="M7 17L17 7M9 7h8v8" stroke={color} strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />;
      break;
    case "briefcase":
      body = (
        <>
          <rect x="3" y="7.5" width="18" height="12.5" rx="2.2" fill={color} />
          <path d="M9 7.5V5.6c0-.9.7-1.6 1.6-1.6h2.8c.9 0 1.6.7 1.6 1.6v1.9" stroke={color} strokeWidth="1.8" fill="none" />
          <path d="M3 12.5h18" stroke={inner} strokeWidth="1.4" />
        </>
      );
      break;
    case "bell":
      body = (
        <>
          <path fill={color} d="M12 3a6 6 0 00-6 6v3.6L4 16.5h16l-2-3.9V9a6 6 0 00-6-6z" />
          <path fill={color} d="M9.6 18.5a2.4 2.4 0 004.8 0z" />
        </>
      );
      break;
    default:
      body = (
        <>
          <path fill={color} d="M12 2.5a6.5 6.5 0 00-3.8 11.8c.6.5 1 1.2 1 2v.7h5.6v-.7c0-.8.4-1.5 1-2A6.5 6.5 0 0012 2.5z" />
          <rect x="9.4" y="18.2" width="5.2" height="1.8" rx="0.9" fill={color} />
          <rect x="10.2" y="20.6" width="3.6" height="1.5" rx="0.75" fill={color} />
        </>
      );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
      {body}
    </svg>
  );
};
