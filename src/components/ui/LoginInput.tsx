"use client";

import Image from "next/image";
import { useState } from "react";

interface LoginInputProps {
  src: string;
  type: string;
  label: string;
  placeholder: string;
  className?: string;
  autoComplete?: string;
}

export default function LoginInput({
  src,
  type,
  label,
  placeholder,
  className,
  autoComplete,
}: LoginInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`relative ${className ?? ""}`}>
      <Image
        src={src}
        width={20}
        height={20}
        alt=""
        className="absolute left-5 top-1/2 -translate-y-1/2"
        style={{
          filter: focused
            ? "brightness(0) saturate(100%) invert(38%) sepia(93%) saturate(1352%) hue-rotate(11deg) brightness(97%) contrast(100%)"
            : "brightness(0) saturate(100%) invert(68%) sepia(8%) saturate(374%) hue-rotate(176deg) brightness(95%) contrast(87%)",
        }}
      />
      <label htmlFor={type} className="sr-only">
        {label}
      </label>
      <input
        type={type}
        name={type}
        id={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`border outline-none rounded-2xl h-12 w-62 pl-12 pr-6 pt-3.5 pb-3.25 text-[14px] border-[#9CA3AF] ${focused ? "border-[#EE6300]" : "border-[#9CA3AF]"}`}
      />
    </div>
  );
}
