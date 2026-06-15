import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getServiceRoleClient } from '@/lib/supabase';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

const stripe = new Stripe(stripeSecretKey);

export async function POST(request: NextRequest) {
  console.log('=== Webhook received ===');

  // Create Supabase client inside the request handler to ensure env vars are available
  const supabase = getServiceRoleClient();

  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = headers().get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`Event type: ${event.type}`);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('Handling checkout.session.completed');
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session, supabase);
        break;
      }
      case 'customer.subscription.created': {
        console.log('Handling customer.subscription.created');
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription, supabase);
        break;
      }
      case 'customer.subscription.updated': {
        console.log('Handling customer.subscription.updated');
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription, supabase);
        break;
      }
      case 'customer.subscription.deleted': {
        console.log('Handling customer.subscription.deleted');
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription, supabase);
        break;
      }
      case 'payment_intent.succeeded': {
        console.log('Handling payment_intent.succeeded');
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment intent:', paymentIntent.id, 'Amount:', paymentIntent.amount);
        await handlePaymentIntentSucceeded(paymentIntent, supabase);
        break;
      }
      case 'invoice.paid': {
        console.log('Handling invoice.paid');
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice, supabase);
        break;
      }
      case 'invoice.payment_succeeded': {
        console.log('Handling invoice.payment_succeeded');
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice, supabase);
        break;
      }
      case 'invoice.payment_failed': {
        console.log('Handling invoice.payment_failed');
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice, supabase);
        break;
      }
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`Error handling ${event.type}:`, err.message, err.stack);
  }

  return NextResponse.json({ received: true });
}

// Helper function to find user ID by email from profiles table
// NOTE: This project uses NextAuth (not Supabase Auth), so auth.users is always empty.
// User profiles are created in the profiles table by the NextAuth signIn callback.
async function getUserIdByEmail(email: string, supabase: ReturnType<typeof getServiceRoleClient>): Promise<string | null> {
  console.log('=== getUserIdByEmail: Looking for user with email:', email);

  const { data: userData, error: userError } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email)
    .single();

  console.log('=== getUserIdByEmail: Full response - data:', JSON.stringify(userData), 'error:', userError ? JSON.stringify({ code: userError.code, message: userError.message, details: userError.details, hint: userError.hint }) : 'null');

  if (userError) {
    console.error('=== getUserIdByEmail ERROR:', userError.code, userError.message, 'Details:', userError.details, 'Hint:', userError.hint);
    return null;
  }

  if (!userData) {
    console.log('=== getUserIdByEmail: No user found with email:', email);
    return null;
  }

  console.log('=== getUserIdByEmail: Found user ID:', userData.id, 'for email:', userData.email);
  return userData.id;
}

// Helper function to upsert profile
async function upsertProfile(userId: string, stripeCustomerId: string | null, subscriptionId: string | null, plan: string, subscriptionStatus: string, currentPeriodEnd: string | null, supabase: ReturnType<typeof getServiceRoleClient>) {
  console.log('=== upsertProfile START ===');
  console.log('userId:', userId);
  console.log('stripeCustomerId:', stripeCustomerId);
  console.log('subscriptionId:', subscriptionId);
  console.log('plan:', plan);
  console.log('subscriptionStatus:', subscriptionStatus);
  console.log('currentPeriodEnd:', currentPeriodEnd);

  const profileData: any = {
    id: userId,
    plan: plan,
    subscription_status: subscriptionStatus,
  };

  if (stripeCustomerId) {
    profileData.stripe_customer_id = stripeCustomerId;
  }

  if (subscriptionId) {
    profileData.subscription_id = subscriptionId;
  }

  if (currentPeriodEnd) {
    profileData.current_period_end = currentPeriodEnd;
  }

  console.log('=== upsertProfile: profileData to upsert:', JSON.stringify(profileData, null, 2));

  // Use Supabase native upsert - handles both INSERT and UPDATE atomically
  // onConflict 'id' means: if a row with this id exists, update it; otherwise insert
  console.log('=== upsertProfile: Attempting UPSERT with onConflict: id...');
  const { data: upsertData, error: upsertError } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' })
    .select();

  console.log('=== upsertProfile: UPSERT result - error:', upsertError ? JSON.stringify({ code: upsertError.code, message: upsertError.message, details: upsertError.details, hint: upsertError.hint }) : 'null');
  console.log('=== upsertProfile: UPSERT result - data:', JSON.stringify(upsertData));

  if (upsertError) {
    console.error('=== upsertProfile: UPSERT FAILED:', JSON.stringify(upsertError));
    return false;
  }

  console.log('=== upsertProfile: UPSERT SUCCESS - rows returned:', upsertData?.length ?? 0);
  return true;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, supabase: ReturnType<typeof getServiceRoleClient>) {
  console.log('=== handleCheckoutCompleted START ===');

  const userEmail = session.metadata?.user_email || session.customer_email;
  console.log('User email from session:', userEmail);

  if (!userEmail) {
    console.log('No user email found in checkout session');
    return;
  }

  const subscriptionId = session.subscription as string;
  console.log('Subscription ID:', subscriptionId);

  if (!subscriptionId) {
    console.log('No subscription ID in checkout session');
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log('Retrieved subscription:', subscription.id, 'Status:', subscription.status);

    // Find user ID by email
    const userId = await getUserIdByEmail(userEmail, supabase);
    if (!userId) {
      console.log('Cannot proceed: user ID not found for email:', userEmail);
      return;
    }

    // Parse current_period_end
    let currentPeriodEnd: string | null = null;
    if (subscription.current_period_end) {
      if (typeof subscription.current_period_end === 'number') {
        currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      } else if (typeof subscription.current_period_end === 'string') {
        currentPeriodEnd = new Date(subscription.current_period_end).toISOString();
      }
    }

    await upsertProfile(
      userId,
      subscription.customer as string,
      subscription.id,
      'pro',
      subscription.status,
      currentPeriodEnd,
      supabase
    );
  } catch (err: any) {
    console.error('Error retrieving subscription:', err.message);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent, supabase: ReturnType<typeof getServiceRoleClient>) {
  console.log('=== handlePaymentIntentSucceeded START ===');
  console.log('PaymentIntent ID:', paymentIntent.id);

  let userEmail: string | undefined = paymentIntent.metadata?.user_email;
  console.log('Email from metadata:', userEmail);

  // If no email in metadata, try to get from customer
  if (!userEmail && paymentIntent.customer) {
    try {
      const customer = await stripe.customers.retrieve(paymentIntent.customer as string) as Stripe.Customer;
      console.log('Customer retrieved:', customer.id, 'Email:', customer.email);
      userEmail = customer.email ?? undefined;
    } catch (err: any) {
      console.error('Error retrieving customer:', err.message);
    }
  }

  if (!userEmail) {
    console.log('Cannot proceed: no email found');
    return;
  }

  // Find user ID by email
  const userId = await getUserIdByEmail(userEmail, supabase);
  if (!userId) {
    console.log('Cannot proceed: user ID not found for email:', userEmail);
    return;
  }

  // If we have an invoice, get subscription from it
  let subscriptionId: string | undefined;
  let currentPeriodEnd: string | null = null;

  if (paymentIntent.invoice) {
    try {
      const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string);
      console.log('Invoice retrieved:', invoice.id, 'Subscription:', invoice.subscription);
      subscriptionId = invoice.subscription as string | undefined;

      if (invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
        console.log('Subscription retrieved:', subscription.id, 'Status:', subscription.status);

        if (subscription.current_period_end) {
          if (typeof subscription.current_period_end === 'number') {
            currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
          } else if (typeof subscription.current_period_end === 'string') {
            currentPeriodEnd = new Date(subscription.current_period_end).toISOString();
          }
        }

        await upsertProfile(
          userId,
          paymentIntent.customer as string,
          subscription.id,
          'pro',
          subscription.status,
          currentPeriodEnd,
          supabase
        );
        return;
      }
    } catch (err: any) {
      console.error('Error retrieving invoice/subscription:', err.message);
    }
  }

  // No subscription - create basic pro profile
  console.log('No subscription found, creating basic profile');
  await upsertProfile(
    userId,
    paymentIntent.customer as string,
    null,
    'pro',
    'active',
    null,
    supabase
  );
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription, supabase: ReturnType<typeof getServiceRoleClient>) {
  console.log('=== handleSubscriptionUpdate START ===');
  console.log('Subscription ID:', subscription.id, 'Status:', subscription.status);

  let userEmail: string | undefined = subscription.metadata?.user_email;
  console.log('Email from metadata:', userEmail);

  if (!userEmail) {
    console.log('No email in metadata, fetching customer...');
    try {
      const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      console.log('Customer retrieved:', customer.id, 'Email:', customer.email);
      userEmail = customer.email ?? undefined;
    } catch (err: any) {
      console.error('Error retrieving customer:', err.message);
      return;
    }
  }

  if (!userEmail) {
    console.log('Cannot proceed: no email found');
    return;
  }

  const userId = await getUserIdByEmail(userEmail, supabase);
  if (!userId) {
    console.log('Cannot proceed: user ID not found for email:', userEmail);
    return;
  }

  // Parse current_period_end
  let currentPeriodEnd: string | null = null;
  if (subscription.current_period_end) {
    if (typeof subscription.current_period_end === 'number') {
      currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    } else if (typeof subscription.current_period_end === 'string') {
      currentPeriodEnd = new Date(subscription.current_period_end).toISOString();
    }
  }

  await upsertProfile(
    userId,
    subscription.customer as string,
    subscription.id,
    'pro',
    subscription.status,
    currentPeriodEnd,
    supabase
  );
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, supabase: ReturnType<typeof getServiceRoleClient>) {
  console.log('=== handleSubscriptionDeleted START ===');
  console.log('Subscription ID:', subscription.id);

  const { data, error } = await supabase
    .from('profiles')
    .update({
      plan: 'free',
      subscription_status: 'canceled',
      subscription_id: null,
      current_period_end: null,
    })
    .eq('subscription_id', subscription.id)
    .select();

  if (error) {
    console.error('Error deactivating subscription:', error.code, error.message, 'Details:', error.details, 'Hint:', error.hint);
  } else {
    console.log('Successfully deactivated subscription for:', subscription.id, 'Rows affected:', data?.length ?? 0);
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice, supabase: ReturnType<typeof getServiceRoleClient>) {
  console.log('=== handleInvoicePaid START ===');
  console.log('Invoice ID:', invoice.id, 'Subscription:', invoice.subscription);

  if (!invoice.subscription) {
    console.log('No subscription in invoice');
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    console.log('Subscription retrieved:', subscription.id);

    let userEmail: string | undefined = subscription.metadata?.user_email;
    if (!userEmail) {
      const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      console.log('Customer:', customer.id, 'Email:', customer.email);
      userEmail = customer.email ?? undefined;
    }

    if (!userEmail) {
      console.log('Cannot proceed: no email found');
      return;
    }

    const userId = await getUserIdByEmail(userEmail, supabase);
    if (!userId) {
      console.log('Cannot proceed: user ID not found for email:', userEmail);
      return;
    }

    let currentPeriodEnd: string | null = null;
    if (subscription.current_period_end) {
      if (typeof subscription.current_period_end === 'number') {
        currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      } else if (typeof subscription.current_period_end === 'string') {
        currentPeriodEnd = new Date(subscription.current_period_end).toISOString();
      }
    }

    await upsertProfile(
      userId,
      subscription.customer as string,
      subscription.id,
      'pro',
      subscription.status,
      currentPeriodEnd,
      supabase
    );
  } catch (err: any) {
    console.error('Error in handleInvoicePaid:', err.message);
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice, supabase: ReturnType<typeof getServiceRoleClient>) {
  console.log('=== handlePaymentFailed START ===');
  console.log('Invoice ID:', invoice.id);

  if (!invoice.subscription) {
    console.log('No subscription in invoice');
    return;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    console.log('Subscription retrieved:', subscription.id);

    let userEmail: string | undefined = subscription.metadata?.user_email;
    if (!userEmail) {
      const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      userEmail = customer.email ?? undefined;
    }

    if (!userEmail) {
      console.log('Cannot proceed: no email found');
      return;
    }

    const userId = await getUserIdByEmail(userEmail, supabase);
    if (!userId) {
      console.log('Cannot proceed: user ID not found for email:', userEmail);
      return;
    }

    console.log('Updating subscription_status to past_due for userId:', userId);

    const { data, error } = await supabase
      .from('profiles')
      .update({ subscription_status: 'past_due' })
      .eq('id', userId)
      .select();

    if (error) {
      console.error('Error updating past_due status:', error.code, error.message, 'Details:', error.details, 'Hint:', error.hint);
    } else {
      console.log('Successfully updated past_due status, rows affected:', data?.length ?? 0);
    }
  } catch (err: any) {
    console.error('Error in handlePaymentFailed:', err.message);
  }
}
