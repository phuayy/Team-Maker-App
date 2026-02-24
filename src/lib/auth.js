import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import prisma from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (!user.email) return false;

            try {
                // Upsert user on sign-in
                const dbUser = await prisma.user.upsert({
                    where: { email: user.email },
                    update: {
                        name: user.name,
                        image: user.image,
                    },
                    create: {
                        email: user.email,
                        name: user.name,
                        image: user.image,
                    },
                });

                // Upsert account link
                if (account) {
                    await prisma.account.upsert({
                        where: {
                            provider_providerAccountId: {
                                provider: account.provider,
                                providerAccountId: account.providerAccountId,
                            },
                        },
                        update: {
                            access_token: account.access_token,
                            refresh_token: account.refresh_token,
                            expires_at: account.expires_at,
                        },
                        create: {
                            userId: dbUser.id,
                            type: account.type,
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                            access_token: account.access_token,
                            refresh_token: account.refresh_token,
                            expires_at: account.expires_at,
                            token_type: account.token_type,
                            scope: account.scope,
                            id_token: account.id_token,
                            session_state: account.session_state,
                        },
                    });
                }

                return true;
            } catch (error) {
                console.error('[auth] signIn callback error:', error);
                return false;
            }
        },
        async jwt({ token, user }) {
            if (user?.email) {
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email },
                    include: {
                        ownedClubs: { select: { id: true } },
                        memberships: { select: { clubId: true, role: true } },
                    },
                });
                if (dbUser) {
                    token.userId = dbUser.id;
                    token.ownedClubs = dbUser.ownedClubs.map((c) => c.id);
                    token.memberships = dbUser.memberships;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.userId;
                session.user.ownedClubs = token.ownedClubs || [];
                session.user.memberships = token.memberships || [];
            }
            return session;
        },
    },
    pages: {
        signIn: '/login',
    },
    session: {
        strategy: 'jwt',
    },
});
