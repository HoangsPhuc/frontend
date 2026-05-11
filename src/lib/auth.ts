import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Tài khoản",
      credentials: {
        username: { label: "Tên đăng nhập", type: "text", placeholder: "admin" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

        // Cập nhật sessionToken mới nhất vào database
        await prisma.user.update({
          where: { id: user.id },
          data: { sessionToken },
        });

        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          avatarUrl: user.avatarUrl,
          sessionToken,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Khi vừa đăng nhập xong
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.avatarUrl = (user as any).avatarUrl;
        token.sessionToken = (user as any).sessionToken;
      }

      // Kiểm tra xem token hiện tại có còn khớp với token trong Database không
      // Nếu có người khác đăng nhập, token trong DB sẽ bị đổi -> token cũ bị vô hiệu hóa
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { sessionToken: true, avatarUrl: true, name: true },
        });

        if (!dbUser || dbUser.sessionToken !== token.sessionToken) {
          // Bị đăng xuất trên máy khác
          return {}; // Trả về token rỗng -> NextAuth sẽ báo unauthenticated
        }

        // Cập nhật thông tin mới nhất (khi đổi tên, đổi avatar)
        token.name = dbUser.name;
        token.avatarUrl = dbUser.avatarUrl;
      }

      return token;
    },
    async session({ session, token }) {
      // Nếu token rỗng (bị đá ra), xóa user khỏi session
      if (!token.id) {
        session.user = undefined as any;
        return session;
      }

      if (token) {
        session.user = {
          ...session.user,
          id: token.id as string,
          username: token.username as string,
          role: token.role as string,
          avatarUrl: token.avatarUrl as string | null,
          name: token.name as string,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "dualuoitinhbien-super-secret-key",
};
