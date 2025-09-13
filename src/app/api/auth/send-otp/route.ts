export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

import { NextResponse } from 'next/server';

export async function POST(_req: Request) {
  // stub response agar build/preview jalan tanpa token
  return NextResponse.json({ ok: true, stub: true }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ ok: true, stub: true }, { status: 200 });
}
