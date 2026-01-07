import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const reviewId = resolvedParams.id;

    // Check if review exists and user owns it
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { rating, title, content } = body;

    // Validation
    if (rating && (rating < 1 || rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Update review
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: rating ?? review.rating,
        title: title ?? review.title,
        content: content ?? review.content
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    });

    // Update product rating and reviewCount
    const allReviews = await prisma.review.findMany({
      where: { productId: review.productId },
      select: { rating: true }
    });

    const avgRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await prisma.product.update({
      where: { id: review.productId },
      data: {
        rating: Math.round(avgRating * 10) / 10,
        reviewCount: allReviews.length
      }
    });

    return NextResponse.json(updatedReview);
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const reviewId = resolvedParams.id;

    // Check if review exists and user owns it
    const review = await prisma.review.findUnique({
      where: { id: reviewId }
    });

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Save productId before deleting
    const productId = review.productId;

    // Delete review
    await prisma.review.delete({
      where: { id: reviewId }
    });

    // Update product rating and reviewCount
    const allReviews = await prisma.review.findMany({
      where: { productId },
      select: { rating: true }
    });

    if (allReviews.length > 0) {
      const avgRating =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      await prisma.product.update({
        where: { id: productId },
        data: {
          rating: Math.round(avgRating * 10) / 10,
          reviewCount: allReviews.length
        }
      });
    } else {
      // No reviews left, set to null
      await prisma.product.update({
        where: { id: productId },
        data: {
          rating: null,
          reviewCount: null
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting review:", error);
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    );
  }
}
