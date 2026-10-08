/** Which app a token belongs to. A token is only accepted by routes of its own audience. */
export type Audience = 'owner' | 'customer';

export interface AccessTokenPayload {
  sub: string;
  aud: Audience;
}

export interface AuthenticatedRequest {
  auth?: { sub: string; aud: Audience };
}
