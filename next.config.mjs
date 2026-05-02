/** @type {import('next').NextConfig} */

console.log("\n=================================");
console.log("🚀 MediAI Server Starting...");
console.log("=================================");

if (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) {
  console.log("✅ [Database] Supabase connection active.");
} else {
  console.log("⚠️ [Database] Supabase keys missing in .env.local");
}


console.log("=================================\n");

const nextConfig = {
  /* config options here */
};

export default nextConfig;
