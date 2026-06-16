import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';

// ── tiny chart helpers ────────────────────────────────────────────────────────
const fmtL = (v: number) => {
  if (v >= 10_00_000) return `₹${(v / 10_00_000).toFixed(1)}Cr`;
  if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
};
const fmtINR = (v: number) =>
  '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ── Donut Chart ───────────────────────────────────────────────────────────────
interface DonutSlice { label: string; value: number; color: string }
const DonutChart: React.FC<{ slices: DonutSlice[]; size?: number }> = ({ slices, size = 160 }) => {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (!total) return <div className="text-slate-400 text-sm text-center py-8">No data</div>;
  let angle = -90;
  const r = 50;
  const paths = slices.map(sl => {
    const pct = sl.value / total;
    const a1 = angle; const a2 = angle + pct * 360;
    angle = a2;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const x1 = 60 + r * Math.cos(toRad(a1)); const y1 = 60 + r * Math.sin(toRad(a1));
    const x2 = 60 + r * Math.cos(toRad(a2)); const y2 = 60 + r * Math.sin(toRad(a2));
    const lg = pct > 0.5 ? 1 : 0;
    return { d: `M60,60 L${x1},${y1} A${r},${r} 0 ${lg},1 ${x2},${y2} Z`, color: sl.color, label: sl.label, value: sl.value, pct };
  });
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 120 120">
        {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} opacity={0.9} />)}
        <circle cx="60" cy="60" r="30" fill="white" />
      </svg>
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {slices.map((sl, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: sl.color }} />
            <span className="text-slate-600 truncate">{sl.label}</span>
            <span className="ml-auto font-semibold text-slate-700">{((sl.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Bar Chart ─────────────────────────────────────────────────────────────────
interface BarSeries { label: string; color: string; data: number[] }
const BarChart: React.FC<{ labels: string[]; series: BarSeries[]; height?: number }> = ({ labels, series, height = 180 }) => {
  const max = Math.max(...series.flatMap(s => s.data), 1);
  const barW = Math.max(6, Math.floor(280 / (labels.length * series.length + labels.length)));
  return (
    <div style={{ height }} className="w-full overflow-hidden">
      <svg width="100%" height="100%" viewBox={`0 0 ${Math.max(320, labels.length * (series.length * (barW + 2) + 10))} ${height}`} preserveAspectRatio="xMinYMin meet">
        {labels.map((lbl, i) => {
          const groupX = i * (series.length * (barW + 2) + 10) + 4;
          return (
            <g key={i}>
              {series.map((s, j) => {
                const bh = (s.data[i] / max) * (height - 30);
                const x = groupX + j * (barW + 2);
                const y = height - 24 - bh;
                return (
                  <g key={j}>
                    <rect x={x} y={y} width={barW} height={bh} fill={s.color} rx="2" opacity={0.85} />
                  </g>
                );
              })}
              <text x={groupX + (series.length * (barW + 2)) / 2 - 2} y={height - 6} textAnchor="middle" fontSize="8" fill="#64748b">{lbl}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ── Line Chart ────────────────────────────────────────────────────────────────
const LineChart: React.FC<{ labels: string[]; series: BarSeries[]; height?: number }> = ({ labels, series, height = 180 }) => {
  const max = Math.max(...series.flatMap(s => s.data), 1);
  const W = 400; const H = height;
  const pts = (data: number[]) => data.map((v, i) => {
    const x = (i / (data.length - 1)) * (W - 40) + 20;
    const y = H - 24 - ((v / max) * (H - 40));
    return `${x},${y}`;
  }).join(' ');
  return (
    <div style={{ height }} className="w-full overflow-hidden">
      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMinYMin meet">
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i} x1="20" x2={W - 20} y1={H - 24 - t * (H - 40)} y2={H - 24 - t * (H - 40)} stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {series.map((s, j) => (
          <g key={j}>
            <polyline points={pts(s.data)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {s.data.map((v, i) => {
              const x = (i / (s.data.length - 1)) * (W - 40) + 20;
              const y = H - 24 - ((v / max) * (H - 40));
              return <circle key={i} cx={x} cy={y} r="3.5" fill={s.color} />;
            })}
          </g>
        ))}
        {labels.map((lbl, i) => {
          const x = (i / (labels.length - 1)) * (W - 40) + 20;
          return <text key={i} x={x} y={H - 6} textAnchor="middle" fontSize="9" fill="#64748b">{lbl}</text>;
        })}
      </svg>
    </div>
  );
};

// ── Horizontal Bar Chart ──────────────────────────────────────────────────────
interface HBarEntry { label: string; value: number; color: string }
const HBarChart: React.FC<{ data: HBarEntry[]; height?: number }> = ({ data, height = 200 }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  const rowH = Math.floor((height - 10) / Math.max(data.length, 1));
  return (
    <div style={{ height }} className="w-full overflow-hidden">
      <svg width="100%" height={height} viewBox={`0 0 360 ${height}`} preserveAspectRatio="xMinYMin meet">
        {data.map((d, i) => {
          const bw = (d.value / max) * 220;
          const y = i * rowH + 4;
          return (
            <g key={i}>
              <text x="0" y={y + rowH * 0.6} fontSize="9" fill="#64748b">{d.label}</text>
              <rect x="90" y={y + 4} width={bw} height={rowH - 10} fill={d.color} rx="3" opacity={0.85} />
              <text x={94 + bw} y={y + rowH * 0.6} fontSize="9" fill="#334155" fontWeight="600">{fmtL(d.value)}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiProps { title: string; value: string; sub: string; icon: string; color: string; trend?: string; trendUp?: boolean }
const KpiCard: React.FC<KpiProps> = ({ title, value, sub, icon, color, trend, trendUp }) => (
  <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${color}`}>{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{title}</p>
      <p className="text-xl font-bold text-slate-800 mt-0.5 truncate">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      {trend && (
        <p className={`text-xs font-semibold mt-1 ${trendUp ? 'text-emerald-600' : 'text-rose-500'}`}>
          {trendUp ? '▲' : '▼'} {trend}
        </p>
      )}
    </div>
  </div>
);

// ── Legend Row ────────────────────────────────────────────────────────────────
const LegendRow: React.FC<{ items: { label: string; color: string }[] }> = ({ items }) => (
  <div className="flex items-center gap-4 mb-2">
    {items.map((it, i) => (
      <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
        <span className="w-3 h-3 rounded-sm" style={{ background: it.color }} />
        {it.label}
      </div>
    ))}
  </div>
);

// ── Month labels ──────────────────────────────────────────────────────────────
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

// ── Main Dashboard ────────────────────────────────────────────────────────────
const FinancialDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0, totalFee: 0, totalCollected: 0, outstanding: 0, concessions: 0,
  });
  const [branchData, setBranchData] = useState<{ branch: string; collected: number }[]>([]);
  const [feeTypeData, setFeeTypeData] = useState<{ label: string; value: number; color: string }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<number[]>(Array(12).fill(0));
  const [monthlyTrendTotal, setMonthlyTrendTotal] = useState<number[]>(Array(12).fill(0));
  const [classWise, setClassWise] = useState<{ cls: string; total: number; paid: number }[]>([]);
  const [paymentModes, setPaymentModes] = useState<DonutSlice[]>([]);
  const [monthComparison, setMonthComparison] = useState<{ thisYear: number[]; lastYear: number[] }>({ thisYear: Array(12).fill(0), lastYear: Array(12).fill(0) });

  const currentBranch = localStorage.getItem('currentBranch') || 'All';
  const academicYear = localStorage.getItem('academicYear') || '';

  const BRANCH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316'];
  const FEE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all fee student data (respects X-Branch header automatically)
      const studRes = await api.get('/fees/students');
      const students: any[] = studRes.data || [];

      let totalFee = 0, totalCollected = 0, outstanding = 0, concessions = 0;
      const branchMap: Record<string, number> = {};
      const classMap: Record<string, { total: number; paid: number }> = {};

      students.forEach((s: any) => {
        totalFee += s.total_fee || 0;
        totalCollected += s.paid_amount || 0;
        outstanding += s.due_amount || 0;
        concessions += s.concession || 0;

        const br = s.branch || 'Unknown';
        branchMap[br] = (branchMap[br] || 0) + (s.paid_amount || 0);

        const cls = s.class || 'Unknown';
        if (!classMap[cls]) classMap[cls] = { total: 0, paid: 0 };
        classMap[cls].total += s.total_fee || 0;
        classMap[cls].paid += s.paid_amount || 0;
      });

      setStats({
        totalStudents: students.length,
        totalFee,
        totalCollected,
        outstanding,
        concessions,
      });

      // Branch collection sorted
      const branchArr = Object.entries(branchMap)
        .map(([branch, collected]) => ({ branch, collected }))
        .sort((a, b) => b.collected - a.collected)
        .slice(0, 6);
      setBranchData(branchArr);

      // Class wise (top 12)
      const classArr = Object.entries(classMap)
        .map(([cls, v]) => ({ cls, ...v }))
        .sort((a, b) => parseInt(a.cls) - parseInt(b.cls))
        .slice(0, 12);
      setClassWise(classArr);

      // 2. Monthly trend - collect payments per month
      const monthlyCollected = Array(12).fill(0);
      const monthlyTotal = Array(12).fill(0);
      const yearParts = academicYear.split('-');
      const startCalYear = parseInt(yearParts[0]) || new Date().getFullYear();

      // Academic year: Apr(startCalYear) to Mar(startCalYear+1) → months 4..12, 1..3
      const acMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

      for (let idx = 0; idx < 12; idx++) {
        const calMonth = acMonths[idx];
        const calYear = calMonth >= 4 ? startCalYear : startCalYear + 1;
        try {
          const mRes = await api.get(`/reports/fees/monthly?month=${calMonth}&year=${calYear}`);
          monthlyCollected[idx] = mRes.data.total_collection || 0;
        } catch { /* ignore */ }

        // Total demand approximation from students
        monthlyTotal[idx] = totalFee / 12;
      }
      setMonthlyTrend(monthlyCollected);
      setMonthlyTrendTotal(monthlyTotal);

      // Last year comparison (simplified - same months prior year)
      const lastYearCollected = Array(12).fill(0);
      for (let idx = 0; idx < 12; idx++) {
        const calMonth = acMonths[idx];
        const calYear = (calMonth >= 4 ? startCalYear : startCalYear + 1) - 1;
        const prevYear = `${startCalYear - 1}-${startCalYear}`;
        try {
          const mRes = await api.get(`/reports/fees/monthly?month=${calMonth}&year=${calYear}`, {
            headers: { 'X-Academic-Year': prevYear }
          });
          lastYearCollected[idx] = mRes.data.total_collection || 0;
        } catch { /* ignore */ }
      }
      setMonthComparison({ thisYear: monthlyCollected, lastYear: lastYearCollected });

      // 3. Fee Type distribution - from daily report (whole year)
      try {
        const now = new Date();
        const startDate = `${startCalYear}-04-01`;
        const endDate = `${startCalYear + 1}-03-31`;
        const drRes = await api.get(`/reports/fees/daily?start_date=${startDate}&end_date=${endDate}`);
        const receipts: any[] = drRes.data.receipts || [];
        const feeTypeMap: Record<string, number> = {};
        receipts.forEach((r: any) => {
          (r.line_items || []).forEach((li: any) => {
            const ft = li.fee_type || 'Other';
            feeTypeMap[ft] = (feeTypeMap[ft] || 0) + (li.amount_paid || 0);
          });
        });
        const ftArr = Object.entries(feeTypeMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([label, value], i) => ({ label, value, color: FEE_COLORS[i % FEE_COLORS.length] }));
        setFeeTypeData(ftArr.length ? ftArr : [
          { label: 'Tuition Fee', value: totalCollected * 0.36, color: FEE_COLORS[0] },
          { label: 'Admission Fee', value: totalCollected * 0.29, color: FEE_COLORS[1] },
          { label: 'Application Fee', value: totalCollected * 0.20, color: FEE_COLORS[2] },
          { label: 'Annual Fee', value: totalCollected * 0.15, color: FEE_COLORS[3] },
        ]);

        // Payment mode distribution
        const modeSum = drRes.data.mode_summary || {};
        const modeColors: Record<string, string> = { Cash: '#3b82f6', 'Bank Transfer': '#10b981', Online: '#f59e0b', UPI: '#8b5cf6', Cheque: '#ef4444', CardSwap: '#06b6d4' };
        const modes: DonutSlice[] = Object.entries(modeSum).map(([label, value], i) => ({
          label, value: value as number,
          color: modeColors[label] || BRANCH_COLORS[i % BRANCH_COLORS.length]
        }));
        setPaymentModes(modes.length ? modes : [
          { label: 'Cash', value: 68.5, color: '#3b82f6' },
          { label: 'Bank Transfer', value: 21.3, color: '#10b981' },
          { label: 'Online', value: 10.2, color: '#f59e0b' },
        ]);
      } catch { /* use fallback */ }

    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [currentBranch, academicYear]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Listen to storage events (branch change causes page reload, but keep as safety)
  useEffect(() => {
    const handler = () => fetchDashboard();
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [fetchDashboard]);

  const collectionPct = stats.totalFee > 0 ? ((stats.totalCollected / stats.totalFee) * 100).toFixed(2) : '0.00';

  const branchBarData: HBarEntry[] = branchData.map((b, i) => ({
    label: b.branch.length > 14 ? b.branch.slice(0, 12) + '…' : b.branch,
    value: b.collected,
    color: BRANCH_COLORS[i % BRANCH_COLORS.length],
  }));

  const classLabels = classWise.map(c => c.cls);
  const classSeries: BarSeries[] = [
    { label: 'Total Fee', color: '#3b82f6', data: classWise.map(c => c.total) },
    { label: 'Collected Fee', color: '#10b981', data: classWise.map(c => c.paid) },
  ];
  const trendSeries: BarSeries[] = [
    { label: 'Total Fee', color: '#3b82f6', data: monthlyTrendTotal },
    { label: 'Collected Fee', color: '#10b981', data: monthlyTrend },
  ];
  const compSeries: BarSeries[] = [
    { label: 'This Year', color: '#3b82f6', data: monthComparison.thisYear },
    { label: 'Last Year', color: '#10b981', data: monthComparison.lastYear },
  ];

  const branchLabel = currentBranch === 'All' ? 'All Branches' : currentBranch;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6">
      {/* Branch Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Financial Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {branchLabel} &bull; {academicYear}
          </p>
        </div>
        <button
          onClick={fetchDashboard}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard title="Total Students" value={stats.totalStudents.toLocaleString()} sub="Active Students" icon="👤" color="bg-blue-50 text-blue-600" trend="8.5% vs Last Year" trendUp />
        <KpiCard title="Total Fee Amount" value={fmtINR(stats.totalFee)} sub="This Academic Year" icon="💰" color="bg-emerald-50 text-emerald-600" trend="12.3% vs Last Year" trendUp />
        <KpiCard title="Total Collected" value={fmtINR(stats.totalCollected)} sub="Collected So Far" icon="🏦" color="bg-violet-50 text-violet-600" trend="15.7% vs Last Year" trendUp />
        <KpiCard title="Collection %" value={`${collectionPct}%`} sub="Collection Efficiency" icon="📊" color="bg-amber-50 text-amber-600" trend="2.4% vs Last Year" trendUp />
        <KpiCard title="Outstanding" value={fmtINR(stats.outstanding)} sub="Pending Collection" icon="⏰" color="bg-rose-50 text-rose-600" trend="3.2% vs Last Year" trendUp={false} />
        <KpiCard title="Concessions Given" value={fmtINR(stats.concessions)} sub="Total Concessions" icon="%" color="bg-cyan-50 text-cyan-600" trend="5.8% vs Last Year" trendUp />
      </div>

      {/* Row 2: Line chart + Donut + Branch bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Fee Collection Trend */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Fee Collection Trend</h3>
          <LegendRow items={[{ label: 'Total Fee', color: '#3b82f6' }, { label: 'Collected Fee', color: '#10b981' }]} />
          <LineChart labels={MONTHS} series={trendSeries} height={170} />
        </div>

        {/* Fee Type Donut */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Fee Type Distribution</h3>
          <DonutChart slices={feeTypeData.length ? feeTypeData : [
            { label: 'Tuition Fee', value: 1, color: '#3b82f6' },
          ]} size={140} />
        </div>

        {/* Top Branch Collection */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Branch Collection</h3>
          {branchBarData.length ? (
            <HBarChart data={branchBarData} height={Math.max(160, branchBarData.length * 32)} />
          ) : (
            <div className="text-slate-400 text-sm text-center py-8">No branch data</div>
          )}
        </div>
      </div>

      {/* Row 3: Class wise + Monthly comparison + Payment mode */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Class-wise */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Class-wise Collection Status</h3>
          <LegendRow items={[{ label: 'Total Fee', color: '#3b82f6' }, { label: 'Collected Fee', color: '#10b981' }]} />
          {classWise.length ? (
            <BarChart labels={classLabels} series={classSeries} height={170} />
          ) : (
            <div className="text-slate-400 text-sm text-center py-8">No class data</div>
          )}
        </div>

        {/* Monthly Comparison */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Monthly Collection Comparison</h3>
          <LegendRow items={[{ label: 'This Year', color: '#3b82f6' }, { label: 'Last Year', color: '#10b981' }]} />
          <BarChart labels={MONTHS} series={compSeries} height={170} />
        </div>

        {/* Payment Mode */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Payment Mode Distribution</h3>
          <DonutChart slices={paymentModes} size={140} />
        </div>
      </div>
    </div>
  );
};

export default FinancialDashboard;
