import type React from "react";

interface IconProps {
  name: string;
  variant?: "fill" | "line";
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({
  name,
  variant = "line",
  size = 20,
  className = "",
  style,
}: IconProps) {
  const url = `/svg/${name}-${variant}.svg`;
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: "currentColor",
        maskImage: `url(${url})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskImage: `url(${url})`,
        WebkitMaskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        ...style,
      }}
    />
  );
}
