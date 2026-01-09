// Quote file upload API (POST)
// Path: /api/admin/quotes/[id]/upload
// Description: Upload a PDF file and store the file URL in the database
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import path from "path";
import fs from "fs/promises";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // Authentication check
  const session = await getServerSession({ req, ...authOptions });
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = await context.params;
  const id = params.id;
  // Parse file from form data
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  // Determine upload directory
  const uploadDir = path.join(process.cwd(), "public", "uploads", "quotes");
  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = `${id}-${Date.now()}.pdf`;
  const filePath = path.join(uploadDir, fileName);
  // Save the file
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);
  // Generate file URL
  const fileUrl = `/uploads/quotes/${fileName}`;
  // Save file URL to DB
  const updated = await prisma.quoteRequest.update({
    where: { id },
    data: { quoteFileUrl: fileUrl }
  });
  return NextResponse.json(updated);
}
