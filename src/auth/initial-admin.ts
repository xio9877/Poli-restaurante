export function isInitialAdmin(
  email: string | undefined,
  initialAdminEmail: string | undefined
): boolean {
  return Boolean(
    email &&
    initialAdminEmail &&
    email.trim().toLowerCase() === initialAdminEmail.trim().toLowerCase()
  );
}
