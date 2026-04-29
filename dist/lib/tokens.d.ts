export interface AccessTokenPayload {
    sub: string;
    role: string;
    username: string;
}
export declare function signAccessToken(payload: AccessTokenPayload): string;
export declare function verifyAccessToken(token: string): AccessTokenPayload;
export declare function issueRefreshToken(userId: string): Promise<string>;
export declare function rotateRefreshToken(oldToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
} | null>;
export declare function revokeRefreshToken(token: string): Promise<void>;
//# sourceMappingURL=tokens.d.ts.map