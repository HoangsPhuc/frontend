import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      avatarUrl?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    username: string;
    name: string;
    role: string;
    avatarUrl?: string | null;
  }
}
