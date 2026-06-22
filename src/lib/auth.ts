import { NextAuthOptions } from 'next-auth';
import { supabase, getServiceRoleClient } from '@/lib/supabase';
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
        try {
          // Use service role client to bypass RLS - this runs server-side only
          const adminClient = getServiceRoleClient();

          // Check if profile already exists by id
          const { data, error } = await adminClient
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();

          console.log('=== signIn: profile check for', user.email, '- data:', JSON.stringify(data), 'error:', error ? JSON.stringify({ code: error.code, message: error.message }) : 'null');

          if (error || !data) {
            // Create new profile with the same id as NextAuth user id
            const { error: insertError } = await adminClient.from('profiles').insert({
              id: user.id,
              email: user.email,
              credits: FREE_CREDITS,
            });
            console.log('=== signIn: profile insert for', user.email, '- error:', insertError ? JSON.stringify({ code: insertError.code, message: insertError.message, details: insertError.details }) : 'null (success)');
          } else {
            console.log('=== signIn: profile already exists for', user.email);
          }
        } catch (err) {
          // Never block sign-in even if profile creation fails
          console.error('=== signIn: exception for', user.email, '-', err);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session?.user && token.sub) {
        // Pass user ID from token to session so other parts of the app can use it
        (session.user as any).id = token.sub;

        try {
          // Use service role client to bypass any RLS
          const adminClient = getServiceRoleClient();
          const { data } = await adminClient
            .from('profiles')
            .select('credits, plan, subscription_status, monthly_credits_used, current_period_end')
            .eq('id', token.sub)
            .single();

          if (data) {
            (session.user as any).credits = data.credits;
            (session.user as any).plan = data.plan || 'free';
            (session.user as any).subscription_status = data.subscription_status || 'inactive';
            (session.user as any).monthly_credits_used = data.monthly_credits_used || 0;
            (session.user as any).current_period_end = data.current_period_end;
          } else {
            // Profile not found - return defaults
            (session.user as any).credits = FREE_CREDITS;
            (session.user as any).plan = 'free';
            (session.user as any).subscription_status = 'inactive';
            (session.user as any).monthly_credits_used = 0;
          }
        } catch (err) {
          console.error('=== session: exception for', token.sub, '-', err);
          (session.user as any).credits = FREE_CREDITS;
          (session.user as any).plan = 'free';
          (session.user as any).subscription_status = 'inactive';
          (session.user as any).monthly_credits_used = 0;
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