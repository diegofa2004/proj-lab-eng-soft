export const accessTokenCookieName = "livrusp_access_token";

export const accessTokenCookieOptions = {
  httpOnly: true,
  maxAge: 60 * 30,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};
