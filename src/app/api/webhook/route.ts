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

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'payment_intent.succeeded': {
        console.log('Payment succeeded event received');
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`Error handling ${event.type}:`, err.message);
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userEmail = session.metadata?.user_email || session.customer_email;
  if (!userEmail) return;

  const subscriptionId = session.subscription as string;
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await updateUserSubscription(userEmail, subscription);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userEmail = subscription.metadata?.user_email;
  if (!userEmail) {
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
    if (customer.email) {
      await updateUserSubscription(customer.email, subscription);
    }
  } else {
    await updateUserSubscription(userEmail, subscription);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userEmail = subscription.metadata?.user_email;
  if (!userEmail) {
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
    if (customer.email) {
      await deactivateSubscription(customer.email);
    }
  } else {
    await deactivateSubscription(userEmail);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
    if (customer.email) {
      await updateUserSubscription(customer.email, subscription);
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
    if (customer.email) {
      await supabase
        .from('profiles')
        .update({ subscription_status: 'past_due' })
        .eq('email', customer.email);
    }
  }
}

async function updateUserSubscription(email: string, subscription: Stripe.Subscription) {
  const { data: { nextBillingDate, status, plan } } = getSubscriptionInfo(subscription);

  await supabase
    .from('profiles')
    .update({
      plan: 'pro',
      subscription_status: status,
      stripe_customer_id: subscription.customer as string,
      subscription_id: subscription.id,
      current_period_end: nextBillingDate,
      monthly_credits_used: 0,
    })
    .eq('email', email);
}

async function deactivateSubscription(email: string) {
  await supabase
    .from('profiles')
    .update({
      plan: 'free',
      subscription_status: 'canceled',
      subscription_id: null,
      current_period_end: null,
    })
    .eq('email', email);
}

function getSubscriptionInfo(subscription: Stripe.Subscription) {
  const status = subscription.status;
  // Stripe returns current_period_end as Unix timestamp (seconds)
  const nextBillingDate = subscription.current_period_end 
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;
  const plan = subscription.items.data[0]?.price?.nickname || 'pro';
  return {
    data: {
      nextBillingDate,
      status,
      plan,
    },
  };
}