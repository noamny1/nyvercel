import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { encode as defaultEncode } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const REMEMBER_AGE = 30 * 24 * 60 * 60;
const VISIT_AGE = 8 * 60 * 60;

async function ensureAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const count = await prisma.user.count();
  if (count > 0) return;
  await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "admin",
    },
  });
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  session: { strategy: "jwt", maxAge: REMEMBER_AGE },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember", type: "text" },
      },
      async authorize(credentials) {
        await ensureAdmin();
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString() || "";
        if (!email || !password) return null;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: String(user.id),
          email: user.email,
          name: user.role,
          remember: credentials?.remember?.toString() === "1",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user && "remember" in user) {
        (token as JWT & { remember?: boolean }).remember = Boolean(user.remember);
      }
      return token;
    },
  },
  jwt: {
    async encode(params) {
      const remember = Boolean((params.token as JWT & { remember?: boolean } | undefined)?.remember);
      return defaultEncode({ ...params, maxAge: remember ? REMEMBER_AGE : VISIT_AGE });
    },
  },
};
