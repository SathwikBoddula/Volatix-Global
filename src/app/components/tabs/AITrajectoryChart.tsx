'use client';
import { formatPrice } from '@/utils/formatCurrency';
import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import type { TickerData } from '../../data/mockData';

interface Props {
  data: TickerData;
  ticker: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  ticker,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; dataKey: string; color: string }>;
  label?: string;
  ticker?: string;
}) => {
  if (!active || !payload?.length) return null;
  const isForecast = payload.some((p) => p.dataKey === 'forecasted');
  return (
    <div
      className={`rounded-lg p-3 border shadow-2xl min-w-[200px] ${isForecast ? 'glass-card border-accent/30' : 'glass-card border-border'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {isForecast && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20 font-mono-data">
            AI FORECAST
          </span>
        )}
        <p className="text-xs font-mono-data text-muted-foreground">{label}</p>
      </div>
      {payload.map((p) => (
        <div
          key={`tt-ai-${p.dataKey}-${p.name}`}
          className="flex items-center justify-between gap-4 mb-1"
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-xs text-muted-foreground">{p.name}</span>
          </div>
          <span className="text-xs font-mono-data font-semibold text-foreground">
            {formatPrice(p.value, ticker || '')}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function AITrajectoryChart({ data, ticker }: Props) {
  const { forecast, summary } = data;
  const recentHistory = data.history.slice(-60).reverse();

  // Stitch history + forecast for continuous line
  const lastHistDate = recentHistory[recentHistory.length - 1];
  const combinedData = [
    ...recentHistory.map((d) => ({
      date: d.date,
      actual: d.close,
      forecasted: null as number | null,
      forecastLow: null as number | null,
      forecastHigh: null as number | null,
      isForecast: false,
    })),
    // Bridge point
    {
      date: lastHistDate.date,
      actual: summary.currentPrice,
      forecasted: summary.currentPrice,
      forecastLow: null as number | null,
      forecastHigh: null as number | null,
      isForecast: false,
    },
    ...forecast.map((f) => ({
      date: f.date,
      actual: null as number | null,
      forecasted: f.predicted,
      forecastLow: f.low,
      forecastHigh: f.high,
      isForecast: true,
    })),
  ];

  const totalReturn =
    ((forecast[forecast.length - 1].predicted - summary.currentPrice) / summary.currentPrice) * 100;
  const isPositive = totalReturn > 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{ticker} AI Trajectory</h2>
          <p className="text-sm text-muted-foreground">
            LSTM neural network · 60-day context + 7-day forward prediction
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono-data font-semibold ${
              isPositive
                ? 'bg-success/10 border-success/20 text-positive'
                : 'bg-danger/10 border-danger/20 text-negative'
            }`}
          >
            AI Target: {formatPrice(forecast[forecast.length - 1].predicted, ticker)} (
            {isPositive ? '+' : ''}
            {totalReturn.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="glass-card rounded-xl p-4 border border-border glow-magenta">
        <div className="flex items-center gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-8 h-0.5 bg-foreground/60 rounded" />
            <span className="text-muted-foreground">Historical Close</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-8 h-0.5 rounded" style={{ background: 'var(--accent)' }} />
            <span className="text-muted-foreground">AI Forecast</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-8 h-3 rounded opacity-30" style={{ background: 'var(--accent)' }} />
            <span className="text-muted-foreground">Confidence Band</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 text-xs text-accent border border-accent/20 bg-accent/5 px-2 py-1 rounded-md font-mono-data">
            LSTM · 100-day lookback · MinMax scaled
          </div>
        </div>

        <ResponsiveContainer width="100%" height={460}>
          <ComposedChart data={combinedData} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--foreground)" stopOpacity={0.08} />
                <stop offset="95%" stopColor="var(--foreground)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.04} />
              </linearGradient>
              <filter id="trajectoryGlow">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
            <XAxis
              dataKey="date"
              tick={{
                fill: 'var(--muted-foreground)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={Math.floor(combinedData.length / 10)}
            />
            <YAxis
              tick={{
                fill: 'var(--muted-foreground)',
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
              }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatPrice(v, ticker)}
              width={70}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip ticker={ticker} />} />

            {/* Confidence band — high */}
            <Area
              type="monotone"
              dataKey="forecastHigh"
              fill="url(#bandGrad)"
              stroke="transparent"
              dot={false}
              connectNulls={false}
              legendType="none"
              name="Forecast High"
            />

            {/* Historical area */}
            <Area
              type="monotone"
              dataKey="actual"
              fill="url(#histGrad)"
              stroke="var(--foreground)"
              strokeWidth={1.5}
              strokeOpacity={0.7}
              dot={false}
              connectNulls={false}
              name="Historical"
            />

            {/* Forecast area fill */}
            <Area
              type="monotone"
              dataKey="forecasted"
              fill="url(#forecastGrad)"
              stroke="transparent"
              dot={false}
              connectNulls={false}
              legendType="none"
              name="Forecast Fill"
            />

            {/* Forecast line with glow */}
            <Line
              type="monotone"
              dataKey="forecasted"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={(props) => {
                if (!props.payload.isForecast || props.payload.forecasted === null)
                  return <g key={`dot-empty-${props.index}`} />;
                return (
                  <g key={`dot-forecast-${props.index}`}>
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={8}
                      fill="var(--accent)"
                      fillOpacity={0.15}
                    />
                    <circle cx={props.cx} cy={props.cy} r={4} fill="var(--accent)" />
                    <circle cx={props.cx} cy={props.cy} r={2} fill="white" fillOpacity={0.9} />
                  </g>
                );
              }}
              connectNulls={false}
              name="AI Forecast"
            />

            {/* Confidence low band line */}
            <Line
              type="monotone"
              dataKey="forecastLow"
              stroke="var(--accent)"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.3}
              dot={false}
              connectNulls={false}
              legendType="none"
              name="Forecast Low"
            />

            {/* Today reference line */}
            <ReferenceLine
              x={lastHistDate.date}
              stroke="var(--primary)"
              strokeDasharray="4 2"
              strokeWidth={1.5}
              label={{
                value: 'TODAY',
                position: 'insideTopLeft',
                fill: 'var(--primary)',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Forecast Node Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
        {forecast.map((f, idx) => {
          const delta = ((f.predicted - summary.currentPrice) / summary.currentPrice) * 100;
          const prevPrice = idx === 0 ? summary.currentPrice : forecast[idx - 1].predicted;
          const dayDelta = ((f.predicted - prevPrice) / prevPrice) * 100;
          const isUp = delta >= 0;
          return (
            <div
              key={`node-${f.date}`}
              className={`rounded-xl p-3 border text-center transition-all duration-200 hover:scale-105 ${
                isUp
                  ? 'glass-card border-accent/20 hover:border-accent/40'
                  : 'glass-card border-danger/20 hover:border-danger/30'
              }`}
            >
              <div className="text-xs text-muted-foreground font-mono-data mb-1">D+{idx + 1}</div>
              <div className="text-xs text-muted-foreground font-mono-data mb-2 truncate">
                {f.date}
              </div>
              <div className="font-mono-data text-sm font-bold text-foreground">
                {formatPrice(f.predicted, ticker)}
              </div>
              <div
                className={`text-xs font-mono-data mt-1 ${isUp ? 'text-positive' : 'text-negative'}`}
              >
                {isUp ? '+' : ''}
                {delta.toFixed(1)}%
              </div>
              <div
                className={`text-xs font-mono-data ${dayDelta >= 0 ? 'text-positive' : 'text-negative'} opacity-70`}
              >
                {dayDelta >= 0 ? '▲' : '▼'}
                {Math.abs(dayDelta).toFixed(1)}%
              </div>
              <div className="mt-2 w-full h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${f.confidence}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Architecture Info */}
      <div className="mt-4 glass-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3">LSTM Model Architecture</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {[
            { label: 'Architecture', value: 'Seq2Seq LSTM' },
            { label: 'Lookback Window', value: '100 days' },
            { label: 'Forecast Horizon', value: '7 days' },
            { label: 'Train Split', value: '70 / 30' },
            { label: 'Scaling', value: 'MinMax [0,1]' },
            { label: 'Input Feature', value: 'Close Price' },
          ].map((item) => (
            <div key={`arch-${item.label}`}>
              <div className="text-xs text-muted-foreground mb-0.5">{item.label}</div>
              <div className="font-mono-data text-xs font-semibold text-primary">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
