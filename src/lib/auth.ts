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
        // Check if profile already exists
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single();

        if (error || !data) {
          // Create new profile with the same id as auth.users.id
          await supabase.from('profiles').insert({
            id: user.id,
            email: user.email,
            credits: FREE_CREDITS,
          });
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user) {
        // Pass user ID from token to session so other parts of the app can use it
        (session.user as any).id = token.sub;

        const { data } = await supabase
          .from('profiles')
          .select('credits, plan, subscription_status, monthly_credits_used, current_period_end')
          .eq('id', token.sub!)
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
        token.sub = user.id;
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