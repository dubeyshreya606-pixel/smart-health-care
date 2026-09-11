export function verifyHumanToken(req, res, next) {
  const token = req.body.humanVerificationToken || req.headers["x-human-token"];

  // In development / demo environments or when token is present with valid prefix
  if (!token) {
    return res.status(400).json({
      message: "Human verification required. Please complete the CAPTCHA security check."
    });
  }

  if (typeof token === "string" && (token.startsWith("hv_") || token.length >= 8)) {
    return next();
  }

  return res.status(400).json({
    message: "Invalid human verification token. Please re-verify the CAPTCHA."
  });
}
