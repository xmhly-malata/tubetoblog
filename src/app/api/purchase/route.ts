import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const PRO_CREDITS = parseInt(process.env.PRO_CREDITS || '50');
const PRO_PRICE_CENTS = parseInt(process.env.PRO_PRICE_CENTS || '990');

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

    const { success, session: checkoutSession } = await createCheckoutSession(
      session.user.email
    );

    if (!success || !checkoutSession) {
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });

  } catch (error: any) {
    console.error('Purchase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function createCheckoutSession(email: string) {
  if (!stripe) {
    return { success: false, session: null };
  }

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'TubeToBlog Pro Credits',
              description: `${PRO_CREDITS} blog generations`,
            },
            unit_amount: PRO_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?canceled=true`,
      customer_email: email,
      metadata: {
        credits: PRO_CREDITS.toString(),
        user_email: email,
      },
    });

    return { success: true, session: checkoutSession };
  } catch (error) {
    console.error('Stripe error:', error);
    return { success: false, session: null };
  }
}
