import { NextAuthOptions, DefaultSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Extend NextAuth types to include id, role, and distributor info
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      distributorId?: string | null;
      distributor?: {
        id: string;
        name: string;
        emailDomain: string;
      } | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    distributorId?: string | null;
    distributor?: {
      id: string;
      name: string;
      emailDomain: string;
    } | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    distributorId?: string | null;
    distributor?: {
      id: string;
      name: string;
      emailDomain: string;
    } | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            distributor: true
          }
        });

        if (!user) {
          throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          distributorId: user.distributorId,
          distributor: user.distributor
            ? {
                id: user.distributor.id,
                name: user.distributor.name,
                emailDomain: user.distributor.emailDomain
              }
            : null
        };
      }
    })
  ],
  pages: {
    signIn: "/auth/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.distributorId = user.distributorId;
        token.distributor = user.distributor;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
        session.user.distributorId = token.distributorId as string | null;
        session.user.distributor = token.distributor as {
          id: string;
          name: string;
          emailDomain: string;
        } | null;
      }
      return session;
    }
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
};
