import { useId, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, error, hint, className, ...inputProps }: TextFieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-stone-700">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={`mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-stone-900 shadow-sm outline-none transition focus:ring-2 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
            : "border-stone-300 focus:border-brand-500 focus:ring-brand-100"
        }`}
        {...inputProps}
      />
      {message && (
        <p id={messageId} className={`mt-1 text-sm ${error ? "text-red-600" : "text-stone-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
