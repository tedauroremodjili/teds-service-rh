import Image from "next/image";

import { cn } from "@/shared/lib/utils";
import { initials } from "@/shared/lib/format";

const SIZES = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-24 text-2xl",
} as const;

const PIXELS = { sm: 32, md: 40, lg: 56, xl: 96 } as const;

/**
 * Photo de l'employe, avec repli sur ses initiales sur fond degrade.
 * Le module 2 rend la photo facultative : le repli est donc la regle, pas
 * l'exception.
 */
export function Avatar({
  firstName,
  lastName,
  photoUrl,
  size = "md",
  className,
}: {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const fullName = `${firstName} ${lastName}`;

  if (photoUrl) {
    return (
      <Image
        src={photoUrl}
        alt={fullName}
        width={PIXELS[size]}
        height={PIXELS[size]}
        className={cn(
          "rounded-full object-cover ring-2 ring-white",
          SIZES[size].split(" ")[0],
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-label={fullName}
      title={fullName}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white bg-brand-gradient",
        SIZES[size],
        className,
      )}
    >
      {initials(firstName, lastName)}
    </span>
  );
}
