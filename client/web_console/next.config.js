/** @type {import('next').NextConfig} */
const path = require("path");

const nextConfig = {
  // Pin the project root to the real path so Next.js doesn't mix
  // the symlinked path (C:\Projects\...) with the real path (D:\Projects-Shem\...)
  // on Windows when running through a junction/symlink.
  outputFileTracingRoot: path.resolve(__dirname),
};

module.exports = nextConfig;
