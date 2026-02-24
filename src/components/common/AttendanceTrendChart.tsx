'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type AttendanceTrendPoint = {
  label: string;
  count: number;
};

type AttendanceTrendChartProps = {
  data: AttendanceTrendPoint[];
};

/**
 * 출석 인원 추이를 꺾은선 차트로 렌더링한다.
 */
export default function AttendanceTrendChart({ data }: AttendanceTrendChartProps) {
  return (
    <div className="h-44 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
            axisLine={false}
            tickLine={false}
            width={22}
          />
          <Tooltip
            cursor={{ stroke: 'var(--color-border-strong)' }}
            contentStyle={{
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              background: 'var(--color-surface)',
              fontSize: '12px',
            }}
            formatter={(value) => [`${value}명`, '출석']}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'var(--color-primary)' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
