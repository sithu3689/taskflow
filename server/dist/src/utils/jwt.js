import jwt from "jsonwebtoken";
export function generateAccessToken(payload) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured.");
    }
    return jwt.sign(payload, secret, {
        expiresIn: "1d",
    });
}
