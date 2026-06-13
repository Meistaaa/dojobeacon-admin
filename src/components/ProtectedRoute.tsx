import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

export default function ProtectedRoute({ children }: { children: ReactElement }) {
  const { accessToken, user } = useAuthStore();

  // Must be authenticated.
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  // Must hold an admin role — a valid token alone is not enough. This blocks a
  // non-admin (e.g. a student) token from rendering admin views. Server-side
  // checks remain authoritative; this is defense in depth.
  const role = user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return <Navigate to="/login" replace />;
  }

  return children;
}
