import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const PRO_CREDITS = parseInt(process.env.PRO_CREDITS || '50');
const PRO_PRICE_CENTS = parseInt(process.env.PRO_PRICE_CENTS || '990');
const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID;

let stripe: Stripe | null = null;
if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey);
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Payment system not configured' }, { status: 503 });
  }

  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { url, error } = await createCheckoutSession(session.user.email);

    if (error || !url) {
      return NextResponse.json({ error: error || 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ url });

  } catch (error: any) {
    console.error('Purchase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function createCheckoutSession(email: string) {
  if (!stripe) {
    return { url: null, error: 'Stripe not configured' };
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: PRO_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/account?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/account?canceled=true`,
      metadata: {
        user_email: email,
        plan: 'pro',
      },
      subscription_data: {
        metadata: {
          user_email: email,
        },
      },
    });

    return { url: checkoutSession.url, error: null };
  } catch (error: any) {
    console.error('Stripe error:', error);
    return { url: null, error: error.message };
  }
}