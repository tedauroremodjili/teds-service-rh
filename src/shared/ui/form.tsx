import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/shared/lib/utils";

/* -------------------------------------------------------------------------- */
/* Champ de formulaire : label + controle + message d'ereur                    */
/* -------------------------------------------------------------------------- */

const CONTROL =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-surface-800 " +
  "placeholder:text-surface-400 transition-colors " +
  "disabled:cursor-not-allowed disabled:bg-surface-100 disabled:text-surface-500";

const CONTROL_OK = "border-surface-300 hover:border-surface-400 focus:border-primary-600";
const CONTROL_ERROR = "border-danger-500 focus:border-danger-500";

interface FieldProps {
  label: string;
  htmlFor?: string;
  /** Messages renvoyes par la validation Zod cote serveur. */
  error?: string[];
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: FieldProps) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-surface-700">
        {label}
        {required ? <span className="ml-0.5 text-danger-500">*</span> : null}
      </label>
      {children}
      {hint && !error?.length ? <p className="text-xs text-surface-500">{hint}</p> : null}
      {error?.length ? (
        <p id={errorId} className="text-xs font-medium text-danger-700">
          {error[0]}
        </p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export function Input({ className, hasError, ...props }: InputProps) {
  return (
    <input
      className={cn(CONTROL, hasError ? CONTROL_ERROR : CONTROL_OK, className)}
      aria-invalid={hasError || undefined}
      {...props}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export function Select({ className, hasError, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(CONTROL, hasError ? CONTROL_ERROR : CONTROL_OK, "pr-8", className)}
      aria-invalid={hasError || undefined}
      {...props}
    >
      {children}
    </select>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export function Textarea({ className, hasError, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(CONTROL, hasError ? CONTROL_ERROR : CONTROL_OK, "min-h-24", className)}
      aria-invalid={hasError || undefined}
      {...props}
    />
  );
}

/** Regroupe des champs sous un intitule, pour les formulaires longs. */
export function FieldSet({
  legend,
  description,
  children,
  className,
}: {
  legend: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("space-y-4", className)}>
      <div className="border-b border-surface-200 pb-2">
        <legend className="text-sm font-semibold text-primary-900">{legend}</legend>
        {description ? <p className="mt-0.5 text-xs text-surface-500">{description}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
