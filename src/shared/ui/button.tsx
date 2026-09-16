import type { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/shared/lib/utils";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium " +
  "transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 [&_svg]:shrink-0";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-700 text-white shadow-sm hover:bg-primary-800 active:bg-primary-900 focus-visible:outline-primary-700",
  accent:
    "bg-accent-500 text-white shadow-sm hover:bg-accent-600 active:bg-accent-700 focus-visible:outline-accent-600",
  secondary:
    "bg-primary-50 text-primary-800 hover:bg-primary-100 active:bg-primary-200 focus-visible:outline-primary-600",
  outline:
    "border border-surface-300 bg-white text-surface-700 hover:bg-surface-50 hover:text-primary-800 hover:border-primary-300 focus-visible:outline-primary-600",
  ghost:
    "text-surface-600 hover:bg-surface-100 hover:text-primary-800 focus-visible:outline-primary-600",
  danger:
    "bg-danger-500 text-white shadow-sm hover:bg-danger-700 focus-visible:outline-danger-500",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs [&_svg]:size-4",
  md: "h-10 px-4 text-sm [&_svg]:size-4",
  lg: "h-12 px-6 text-base [&_svg]:size-5",
  icon: "size-10 [&_svg]:size-5",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return <button type={type} className={buttonStyles(variant, size, className)} {...props} />;
}

interface LinkButtonProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}

/** Meme apparence qu'un bouton, mais c'est une vraie navigation. */
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: LinkButtonProps) {
  return (
    <Link href={href} className={buttonStyles(variant, size, className)}>
      {children}
    </Link>
  );
}
