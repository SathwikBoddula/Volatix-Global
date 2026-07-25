//
// src/app/api/market-data/[ticker]/route.ts
//
import { NextRequest, NextResponse } from 'next/server';
import { getTickerData } from '@/app/data/marketData.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ ticker: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ticker } = await params;
    const rawTicker = ticker.toUpperCase().trim();

    if (!rawTicker) {
      return NextResponse.json(
        { error: 'Invalid ticker parameter' },
        { status: 400 }
      );
    }

    const data = await getTickerData(rawTicker);

    if (!data) {
      return NextResponse.json(
        { error: 'No data available for ticker', ticker: rawTicker },
        { status: 404 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch {
    console.error('[API /market-data] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}