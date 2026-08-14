export interface AccessTokenPayload {
  sub: string; // user id
  jti: string; // unique per issuance — jwt.sign's second-granularity `iat` alone can collide
}

export interface RefreshTokenPayload {
  sub: string; // user id
  jti: string; // unique token id, used for revocation
}
