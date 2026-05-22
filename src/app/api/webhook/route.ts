import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

const stripe = new Stripe(stripeSecretKey);

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = headers().get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const credits = parseInt(session.metadata?.credits || '0');
    const userEmail = session.metadata?.user_email;

    if (userEmail && credits > 0) {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits')
        .eq('email', userEmail)
        .single();

      if (!error && data) {
        await supabase
          .from('profiles')
          .update({ credits: data.credits + credits })
          .eq('email', userEmail);
      }
    }
  }

  return NextResponse.json({ received: true });
}
