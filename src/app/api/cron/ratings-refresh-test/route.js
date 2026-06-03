import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request) {
  const authHeader = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET}`;

  if (!authHeader || authHeader !== expected) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('Hello World! The cron job just woke up the server.');

  return NextResponse.json({ success: true, message: 'Hello World executed' });
}
