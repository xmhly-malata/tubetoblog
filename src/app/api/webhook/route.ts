import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getServiceRoleClient } from '@/lib/supabase';

// Use service role client to bypass RLS
const supabase = getServiceRoleClient();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured');
}

const stripe = new Stripe(stripeSecretKey);

export async function POST(request: NextRequest) {
  console.log('=== Webhook received ===');

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
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.created': {
        console.log('Handling customer.subscription.created');
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }
      case 'customer.subscription.updated': {
        console.log('Handling customer.subscription.updated');
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        console.log('Handling customer.subscription.deleted');
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'payment_intent.succeeded': {
        console.log('Handling payment_intent.succeeded');
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment intent:', paymentIntent.id, 'Amount:', paymentIntent.amount);
        await handlePaymentIntentSucceeded(paymentIntent);
        break;
      }
      case 'invoice.paid': {
        console.log('Handling invoice.paid');
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case 'invoice.payment_succeeded': {
        console.log('Handling invoice.payment_succeeded');
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case 'invoice.payment_failed': {
        console.log('Handling invoice.payment_failed');
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
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

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('handleCheckoutCompleted called');
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
    await updateUserSubscription(subscription.customer as string, subscription);
  } catch (err: any) {
    console.error('Error retrieving subscription:', err.message);
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('handlePaymentIntentSucceeded called');

  let userEmail: string | undefined = paymentIntent.metadata?.user_email;
  console.log('Email from payment intent metadata:', userEmail);

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

  // If we have an invoice, get subscription from it
  let subscriptionId: string | undefined;
  
  if (paymentIntent.invoice) {
    try {
      const invoice = await stripe.invoices.retrieve(paymentIntent.invoice as string);
      subscriptionId = invoice.subscription as string | undefined;
    } catch (err: any) {
      console.error('Error retrieving invoice:', err.message);
    }
  }
  
  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log('Subscription retrieved:', subscription.id, 'Status:', subscription.status);
      if (userEmail) {
        await updateUserSubscription(subscription.customer as string, subscription);
      }
    } catch (err: any) {
      console.error('Error retrieving subscription:', err.message);
    }
  } else if (paymentIntent.customer) {
    // No subscription, just create a basic pro entry with customer ID
    console.log('No subscription found, creating basic profile for customer:', paymentIntent.customer);
    await createBasicProProfile(paymentIntent.customer as string);
  }
}

async function createBasicProProfile(customerId: string) {
  console.log('Creating basic pro profile for customer:', customerId);

  // First try UPDATE by stripe_customer_id
  const { error: updateError, count } = await supabase
    .from('profiles')
    .update({ plan: 'pro', subscription_status: 'active' })
    .eq('stripe_customer_id', customerId);

  if (updateError) {
    console.error('Supabase update error:', updateError.code, updateError.message);
  }

  if (count === 0) {
    console.log('No existing profile, creating new record');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        plan: 'pro',
        subscription_status: 'active',
        stripe_customer_id: customerId,
        monthly_credits_used: 0,
      });

    if (insertError) {
      console.error('Supabase insert error:', insertError.code, insertError.message);
    } else {
      console.log('Successfully created new pro profile for customer:', customerId);
    }
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('handleSubscriptionUpdate called, subscription:', subscription.id);
  console.log('Subscription status:', subscription.status);
  console.log('current_period_end value:', subscription.current_period_end);

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

  if (userEmail) {
    await updateUserSubscription(subscription.customer as string, subscription);
  } else {
    console.log('Still no email found, cannot update user');
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('handleSubscriptionDeleted called');
  await deactivateSubscription(subscription.id);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log('handleInvoicePaid called');
  console.log('Invoice:', invoice.id, 'Subscription:', invoice.subscription);

  if (invoice.subscription) {
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      console.log('Subscription retrieved:', subscription.id);

      const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
      console.log('Customer:', customer.id, 'Email:', customer.email);

      if (customer.email) {
        await updateUserSubscription(customer.id, subscription);
      }
    } catch (err: any) {
      console.error('Error in handleInvoicePaid:', err.message);
    }
  } else {
    console.log('No subscription in invoice');
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('handlePaymentFailed called');

  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const customer = await stripe.customers.retrieve(subscription.customer as string) as Stripe.Customer;
    if (customer.email) {
      console.log('Updating subscription_status to past_due for:', customer.email);
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: 'past_due' })
        .eq('email', customer.email);

      if (error) {
        console.error('Error updating past_due status:', error);
      }
    }
  }
}

async function updateUserSubscription(customerId: string, subscription: Stripe.Subscription) {
  console.log('updateUserSubscription called for customer:', customerId);

  // Safely parse the timestamp
  let nextBillingDate: string | null = null;
  if (subscription.current_period_end) {
    if (typeof subscription.current_period_end === 'number') {
      nextBillingDate = new Date(subscription.current_period_end * 1000).toISOString();
    } else if (typeof subscription.current_period_end === 'string') {
      const parsed = new Date(subscription.current_period_end);
      if (!isNaN(parsed.getTime())) {
        nextBillingDate = parsed.toISOString();
      }
    }
  }

  console.log('Parsed nextBillingDate:', nextBillingDate);
  console.log('Updating with status:', subscription.status);

  const updateData: any = {
    plan: 'pro',
    subscription_status: subscription.status,
    stripe_customer_id: subscription.customer as string,
    subscription_id: subscription.id,
    monthly_credits_used: 0,
  };

  if (nextBillingDate) {
    updateData.current_period_end = nextBillingDate;
  }

  console.log('Update/Insert data:', JSON.stringify(updateData));

  // First try UPDATE by stripe_customer_id
  const { data: updateDataResult, error: updateError, count } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('stripe_customer_id', customerId);

  if (updateError) {
    console.error('Supabase update error:', updateError.code, updateError.message);
  }

  // If no rows were updated (count === 0), try INSERT
  if (count === 0) {
    console.log('No existing profile found, creating new record for customer:', customerId);
    
    const insertData: any = {
      plan: 'pro',
      subscription_status: subscription.status,
      stripe_customer_id: subscription.customer as string,
      subscription_id: subscription.id,
      monthly_credits_used: 0,
    };

    if (nextBillingDate) {
      insertData.current_period_end = nextBillingDate;
    }

    const { error: insertError } = await supabase
      .from('profiles')
      .insert(insertData);

    if (insertError) {
      console.error('Supabase insert error:', insertError.code, insertError.message);
    } else {
      console.log('Successfully created new profile for customer:', customerId);
    }
  } else {
    console.log('Successfully updated profile for customer:', customerId);
  }
}

async function deactivateSubscription(subscriptionId: string) {
  console.log('deactivateSubscription called for subscription:', subscriptionId);

  const { error } = await supabase
    .from('profiles')
    .update({
      plan: 'free',
      subscription_status: 'canceled',
      subscription_id: null,
      current_period_end: null,
    })
    .eq('subscription_id', subscriptionId);

  if (error) {
    console.error('Error deactivating subscription:', error);
  } else {
    console.log('Successfully deactivated subscription for:', subscriptionId);
  }
}
