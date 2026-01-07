import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Extract email domain for distributor auto-detection
    const emailDomain = email.split("@")[1];

    // Check if this domain belongs to a distributor
    const distributor = await prisma.distributor.findUnique({
      where: { emailDomain }
    });

    // Determine role and distributor association
    const role = distributor ? "distributor" : "customer";
    const distributorId = distributor?.id || null;

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        role,
        distributorId
      },
      include: {
        distributor: true
      }
    });

    return NextResponse.json(
      {
        message: "Registration completed successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          distributor: user.distributor
            ? {
                id: user.distributor.id,
                name: user.distributor.name
              }
            : null
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An error occurred during registration" },
      { status: 500 }
    );
  }
}
