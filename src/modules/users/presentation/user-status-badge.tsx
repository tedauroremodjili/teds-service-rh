import { Badge, type BadgeTone } from "@/shared/ui/badge";
import { ROLE_LABELS, type RoleName } from "@/modules/auth/domain/permissions";

import { USER_STATUS_LABELS, type UserStatus } from "../domain/user-account";

const TONES: Record<UserStatus, BadgeTone> = {
  ACTIF: "success",
  INACTIF: "neutral",
  SUSPENDU: "danger",
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={TONES[status]}>{USER_STATUS_LABELS[status]}</Badge>;
}

/** Le super administrateur se distingue : c'est le seul role a tout pouvoir. */
export function RoleBadge({ role }: { role: RoleName }) {
  return (
    <Badge tone={role === "SUPER_ADMIN" ? "accent" : "primary"}>{ROLE_LABELS[role]}</Badge>
  );
}
