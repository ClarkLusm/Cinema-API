const trimTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const splitEnvList = (value) =>
  String(value || "")
    .split(",")
    .map((item) => trimTrailingSlash(item).trim())
    .filter(Boolean);

const frontendOrigins = splitEnvList(process.env.FRONTEND_URLS);
const primaryFrontendUrl = trimTrailingSlash(process.env.FRONTEND_URL || "http://localhost:3000");

if (primaryFrontendUrl) {
  frontendOrigins.unshift(primaryFrontendUrl);
}

const uniqueFrontendOrigins = [...new Set(frontendOrigins)];

const fallbackBackendUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:5000";

const backendPublicUrl = trimTrailingSlash(
  process.env.BACKEND_PUBLIC_URL || fallbackBackendUrl
);

module.exports = {
  backendPublicUrl,
  frontendUrl: uniqueFrontendOrigins[0] || "http://localhost:3000",
  frontendOrigins: uniqueFrontendOrigins,
  isVercel: process.env.VERCEL === "1",
  trimTrailingSlash,
};

