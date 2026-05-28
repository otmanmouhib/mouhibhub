import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../lib/auth';
import { getDb } from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;

  if (!token || !verifyAuthToken(token)) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const dbName = request.nextUrl.searchParams.get('db');
  if (!dbName) {
    return new NextResponse(JSON.stringify({ message: 'Database parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = await getDb(dbName);
  const reports = await db.collection('reports').find().sort({ _id: -1 }).limit(10).toArray();

  if (reports.length > 0) {
    return NextResponse.json({
      reports: reports.map((report) => ({
        id: String(report._id),
        title: report.title ?? 'Report',
        status: report.status ?? 'Open',
        updatedAt: report.updatedAt ? new Date(report.updatedAt).toLocaleDateString() : 'Unknown',
      })),
    });
  }

  const contactCount = await db.collection('contacts').countDocuments();
  return NextResponse.json({
    reports: [
      {
        id: 'placeholder',
        title: 'Data summary generated',
        status: 'Pending',
        updatedAt: `${contactCount} contact records available`,
      },
    ],
  });
}
