import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import Stripe from "stripe";
import { authOptions } from "@/lib/auth";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface PaymentItem {
  productId: string;
  quantity: number;
  price: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items, totalAmount } = body as {
      items: PaymentItem[];
      totalAmount: number;
    };

    if (!items || !totalAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: "usd",
      metadata: {
        userId: session.user.email,
        itemCount: items.length
      },
      description: `Order from ${session.user.email}`
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error("Payment error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Payment processing failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
