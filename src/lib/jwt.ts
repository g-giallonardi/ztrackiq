import { jwtVerify, SignJWT } from "jose";

type JwtPayload = {
  sub?: string;
  role?: string;
};

function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET ??
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "ztrackiq-dev-secret-change-me");

  if (!secret) return null;

  return new TextEncoder().encode(secret);
}

export async function createJwtToken(user: { id: number; role: string }) {
  const secret = getJwtSecret();

  if (!secret) {
    throw new Error("JWT_SECRET manquant");
  }

  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyJwtToken(token: string) {
  const secret = getJwtSecret();

  if (!secret) return null;

  try {
    const { payload } = await jwtVerify<JwtPayload>(token, secret, {
      algorithms: ["HS256"],
    });
    const userId = Number(payload.sub);

    if (!Number.isInteger(userId) || userId <= 0) return null;

    return {
      userId,
      role: payload.role ?? null,
    };
  } catch {
    return null;
  }
}
