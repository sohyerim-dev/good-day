"use client";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClass?: string;
  labelRequired?: boolean;
  label?: { name: string; labelClass?: string; text: string };
  icon?: string;
  color?: string;
  error?: string;
}

export default function Input({
  label,
  icon,
  color,
  error,
  labelRequired,
  wrapperClass,
  className,
  ...props
}: InputProps) {
  return (
    label && (
      <div className={`flex flex-col ${wrapperClass}`}>
        <label
          htmlFor={label.name}
          className={`${label.labelClass} text-[18px] font-medium mb-1`}
        >
          {label.text}
          {labelRequired && <span className="ml-1 text-red-700">*</span>}
        </label>
        <div className="flex flex-col">
          <div className="relative">
            {icon && (
              <img
                src={icon}
                alt=""
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-[filter]"
              />
            )}
            <input
              name={label.name}
              id={label.name}
              className={`outline-none ${icon ? "pl-12" : ""} ${className ?? ""} text-[16px] rounded-xl border px-5 py-2.5`}
              onFocus={(e) => {
                if (color) e.currentTarget.style.border = `1px solid #${color}`;
                const img = e.currentTarget
                  .previousElementSibling as HTMLElement | null;
                if (img && color)
                  img.style.filter =
                    "brightness(0) saturate(100%) invert(38%) sepia(93%) saturate(1352%) hue-rotate(11deg) brightness(97%) contrast(100%)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.border = "1px solid #000000";
                const img = e.currentTarget
                  .previousElementSibling as HTMLElement | null;
                if (img) img.style.filter = "none";
              }}
              {...props}
            />
          </div>
          <p className="text-[12px] text-red-700 ml-12">{error}</p>
        </div>
      </div>
    )
  );
}
