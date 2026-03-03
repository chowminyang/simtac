export const SITE_AUTH_COOKIE = "simtac_site_access";

function normalizePassword(value: string | undefined): string {
  return (value || "").trim();
}

export function getSiteAccessPassword(): string {
  const configuredPassword = normalizePassword(process.env.SITE_ACCESS_PASSWORD);
  return configuredPassword || "humeaine";
}
