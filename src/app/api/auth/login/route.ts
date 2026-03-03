import { NextResponse } from "next/server";

import { SITE_AUTH_COOKIE, getSiteAccessPassword } from "@/lib/site-auth";

export const runtime = "nodejs";

type LoginRequestBody = {
  password?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginRequestBody;
    const submittedPassword = typeof body.password === "string" ? body.password.trim() : "";

    if (!submittedPassword) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    if (submittedPassword !== getSiteAccessPassword()) {
      return NextResponse.json({ error: "Invalid password." }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: SITE_AUTH_COOKIE,
      value: "1",
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
  }
}
