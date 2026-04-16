import { SignJWT, jwtVerify } from 'jose'
import { env } from '../config/env.js'

const secret = new TextEncoder().encode(env.JWT_SECRET)

interface TokenPayload {
  sub: string
  openId: string
}

const EXPIRATION = '7d'

export async function generateToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ openId: payload.openId })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(EXPIRATION)
    .sign(secret)
}

export async function verifyToken(
  token: string
): Promise<TokenPayload & { iat: number; exp: number }> {
  const { payload } = await jwtVerify(token, secret)
  return {
    sub: payload.sub as string,
    openId: payload.openId as string,
    iat: payload.iat as number,
    exp: payload.exp as number,
  }
}
