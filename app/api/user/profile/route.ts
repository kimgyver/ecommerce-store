import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        createdAt: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "사용자 정보를 불러올 수 없습니다" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, address, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 비밀번호 변경 시 현재 비밀번호 확인
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "현재 비밀번호를 입력해주세요" },
          { status: 400 }
        );
      }

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "현재 비밀번호가 일치하지 않습니다" },
          { status: 400 }
        );
      }

      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "새 비밀번호는 최소 6자 이상이어야 합니다" },
          { status: 400 }
        );
      }
    }

    // 사용자 정보 업데이트
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(newPassword && { password: await bcrypt.hash(newPassword, 10) })
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true
      }
    });

    return NextResponse.json({
      message: "프로필이 업데이트되었습니다",
      user: updatedUser
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "프로필 업데이트 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
