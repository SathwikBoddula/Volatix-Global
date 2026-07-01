'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { TabId } from './AnalyticsDashboard';
import type { TickerData } from '../data/mockData';
import OverviewMatrix from './tabs/OverviewMatrix';
import ForecastGrid from './tabs/ForecastGrid';

const MovingAveragesChart = dynamic(() => import('./tabs/MovingAveragesChart'), { ssr: false });
const CombinedTrendsChart = dynamic(() => import('./tabs/CombinedTrendsChart'), { ssr: false });
const RSIMomentumChart = dynamic(() => import('./tabs/RSIMomentumChart'), { ssr: false });
const MACDConvergenceChart = dynamic(() => import('./tabs/MACDConvergenceChart'), { ssr: false });
const BacktestChart = dynamic(() => import('./tabs/BacktestChart'), { ssr: false });
const AITrajectoryChart = dynamic(() => import('./tabs/AITrajectoryChart'), { ssr: false });

interface TabContentProps {
  activeTab: TabId;
  data: TickerData;
  ticker: string;
}

export default function TabContent({ activeTab, data, ticker }: TabContentProps) {
  return (
    <div className="mt-6 animate-fade-in-up">
      {activeTab === 'overview' && <OverviewMatrix data={data} ticker={ticker} />}
      {activeTab === 'moving-averages' && <MovingAveragesChart data={data} ticker={ticker} />}
      {activeTab === 'combined-trends' && <CombinedTrendsChart data={data} ticker={ticker} />}
      {activeTab === 'rsi-momentum' && <RSIMomentumChart data={data} ticker={ticker} />}
      {activeTab === 'macd-convergence' && <MACDConvergenceChart data={data} ticker={ticker} />}
      {activeTab === 'backtest' && <BacktestChart data={data} ticker={ticker} />}
      {activeTab === 'forecast-grid' && <ForecastGrid data={data} ticker={ticker} />}
      {activeTab === 'ai-trajectory' && <AITrajectoryChart data={data} ticker={ticker} />}
    </div>
  );
}
