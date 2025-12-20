"use client";

import { useState } from "react";
import {
  PaymentElement,
  useStripe,
  useElements
} from "@stripe/react-stripe-js";

interface PaymentFormProps {
  totalAmount: number;
  onSuccess: () => void;
}

export default function PaymentForm({
  totalAmount,
  onSuccess
}: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success`
        }
      });

      if (error) {
        setErrorMessage(error.message || "Payment failed");
      }
    } catch (err) {
      setErrorMessage("An error occurred during payment");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:bg-gray-400"
      >
        {isLoading ? "Processing..." : `Pay $${totalAmount.toFixed(2)}`}
      </button>

      <p className="text-sm text-gray-600 text-center">
        Test card: 4242 4242 4242 4242 | Any future date | Any CVC
      </p>
    </form>
  );
}
