'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type Report = {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
};

export default function WebsiteReportsPage() {
  const params = useParams();
  const siteName = params?.site ?? '';
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!siteName) return;

    async function fetchReports() {
      try {
        const response = await fetchWithAuthRedirect(router, `/api/reports?db=${siteName}`);
        if (response.status === 401) return;
        if (!response.ok) {
          throw new Error('Could not load reports for this website');
        }
        const data = await response.json();
        setReports(Array.isArray(data?.reports) ? data.reports : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, [siteName]);

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <h1 className="text-2xl font-semibold text-slate-900">Reports for {siteName}</h1>
        <p className="mt-2 text-sm text-slate-600">View the latest report summaries stored in this website's database.</p>
      </div>

      {loading ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">Loading reports...</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">Error: {error}</div>
      ) : reports.length === 0 ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">No reports found for this website.</div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{report.title}</h2>
                  <p className="mt-2 text-sm text-slate-600">Updated {report.updatedAt}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">{report.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
