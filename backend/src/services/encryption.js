import crypto from "crypto";

const algorithm = "aes-256-gcm";

function getKey() {
  const key = process.env.ENCRYPTION_KEY || "";
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 characters for this demo.");
  }
  return Buffer.from(key, "utf8");
}

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    iv: iv.toString("base64"),
    content: encrypted.toString("base64"),
    tag: tag.toString("base64")
  };
}

export function decrypt(data) {
  const decipher = crypto.createDecipheriv(
    algorithm,
    getKey(),
    Buffer.from(data.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(data.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data.content, "base64")),
    decipher.final()
  ]);
  return decrypted.toString("utf8");
}
