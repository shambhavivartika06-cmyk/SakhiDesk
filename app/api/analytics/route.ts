import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import {
  getOnlineTotals,
  getOfflineTotals,
  getOrderPipeline,
  getMonthlySummary,
  getMonthlyPoints,
  getMonthRecords,
  getTopProducts,
  getBestCustomers
} from '@/lib/metrics';

export const dynamic = 'force-dynamic';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || currentMonth();

    const totals = getOnlineTotals(db);
    const offline = getOfflineTotals(db);
    const pipeline = getOrderPipeline(db);
    const monthly = getMonthlySummary(db, month);
    const monthRecords = getMonthRecords(db, month);
    const monthlyTrend = getMonthlyPoints(db, 6);

    const hasDemoData = totals.paidOnlineDemo > 0 || totals.pendingDemo > 0;

    return NextResponse.json({
      success: true,
      analytics: {
        currency: 'USD',
        isSandbox: true,
        sandboxNote: 'All PayPal amounts are Sandbox (test) transactions, not real received income.',

        // --- Business overview (lifetime) ---
        totalOrders: totals.totalOrders,
        completedOrders: totals.completedOrders,
        paidOnline: totals.paidOnline,
        paidOnlineCount: totals.paidOnlineCount,
        paidOnlineDemo: totals.paidOnlineDemo,
        pendingPayments: totals.pendingPayments,
        pendingCount: totals.pendingCount,
        pendingDemo: totals.pendingDemo,
        outstandingInvoices: totals.outstandingInvoices,
        draftAmount: totals.draftAmount,
        draftCount: totals.draftCount,
        offlineTotal: offline.offlineTotal,
        offlineCount: offline.offlineCount,
        combinedRecordedSales: totals.paidOnline + offline.offlineTotal,
        hasDemoData,

        // --- Order pipeline (mutually exclusive, sums to totalOrders) ---
        pipeline: pipeline.buckets,
        pipelineTotal: pipeline.total,

        // --- Selected month records ---
        month,
        monthly,
        monthRecords,

        // --- Trend (last 6 months, real data) ---
        monthlyTrend,

        // --- Keeping the useful extras ---
        topProducts: getTopProducts(db),
        bestCustomers: getBestCustomers(db)
      }
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
