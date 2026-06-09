import { NextAuthOptions } from 'next-auth';
import { supabase } from '@/lib/supabase';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';

const FREE_CREDITS = parseInt(process.env.FREE_CREDITS || '2');

const providers = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (user.email) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .single();

        if (error || !data) {
          await supabase.from('profiles').insert({
            email: user.email,
            credits: FREE_CREDITS,
          });
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user?.email) {
        const { data } = await supabase
          .from('profiles')
          .select('credits, plan, subscription_status, monthly_credits_used, current_period_end')
          .eq('email', session.user.email)
          .single();

        if (data) {
          (session.user as any).credits = data.credits;
          (session.user as any).plan = data.plan || 'free';
          (session.user as any).subscription_status = data.subscription_status || 'inactive';
          (session.user as any).monthly_credits_used = data.monthly_credits_used || 0;
          (session.user as any).current_period_end = data.current_period_end;
        }
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.email = user.email;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
};