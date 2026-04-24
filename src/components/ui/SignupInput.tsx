interface SignupInputProps {
  type: string;
  label: string;
  autoComplete?: string;
  placeholder: string;
  className?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function SignupInput({
  type,
  label,
  autoComplete,
  placeholder,
  className,
  onChange,
}: SignupInputProps) {
  return (
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={type} className="font-bold w-25  mb-2.5">
        {label}
      </label>
      <input
        id={type}
        name={type}
        type={type === "re-password" ? "password" : type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        onChange={onChange}
        className="focus:outline-none focus:border-2 focus:border-[#EE6300] border rounded-2xl text-[14px] h-12 w-70 pt-3.5 pb-3.25 pl-5"
      />
    </div>
  );
}
