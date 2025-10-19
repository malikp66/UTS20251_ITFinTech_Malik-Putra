import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { dbConnect } from "./db";
import User from "@/models/User";
import { generateOtpForUser } from "./auth-service";

export const authOptions: NextAuthConfig = {
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        role: { label: "Role", type: "text" },
        otpBypass: { label: "OTP Bypass", type: "text" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().trim().toLowerCase();
        const password = credentials?.password?.toString() ?? "";
        const requestedRole = credentials?.role === "admin" ? "admin" : "customer";
        const otpBypass = credentials?.otpBypass === "true";

        if (!email) {
          throw new Error("INVALID_CREDENTIALS");
        }

        await dbConnect();
        const userDoc = await User.findOne({ email }).lean();

        if (!userDoc) {
          throw new Error("INVALID_CREDENTIALS");
        }

        if (requestedRole === "admin") {
          if (userDoc.role !== "admin") {
            throw new Error("FORBIDDEN");
          }
          const valid = await bcrypt.compare(password, userDoc.passwordHash);
          if (!valid) {
            throw new Error("INVALID_CREDENTIALS");
          }

          return {
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name,
            role: userDoc.role
          };
        }

        // customer flow
        if (otpBypass) {
          if (password !== "__otp_flow__") {
            throw new Error("INVALID_FLOW");
          }
          return {
            id: userDoc._id.toString(),
            email: userDoc.email,
            name: userDoc.name,
            role: userDoc.role
          };
        }

        const valid = await bcrypt.compare(password, userDoc.passwordHash);
        if (!valid || userDoc.role !== "customer") {
          throw new Error("INVALID_CREDENTIALS");
        }

        await generateOtpForUser({
          _id: userDoc._id.toString(),
          phone: userDoc.phone
        });

        throw new Error(JSON.stringify({ requiresOtp: true }));
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
