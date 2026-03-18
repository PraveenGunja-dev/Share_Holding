import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../context/ThemeContext';
import { getCategoryColor } from '../constants/colors';
import { formatName } from './ui/utils';

interface DataItem {
  name: string;
  category: string;
  lakhs: number;
  percent: number;
  change: number;
}

interface RankedInstitutionalBarsProps {
  data: DataItem[];
}

export function RankedInstitutionalBars({ data }: RankedInstitutionalBarsProps) {
  const { theme } = useTheme();
  const [dimensions, setDimensions] = React.useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200
  });

  React.useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = dimensions.width < 768;
  const isTablet = dimensions.width < 1024;

  const option = useMemo(() => {
    const sortedData = [...data]
      .sort((a, b) => b.lakhs - a.lakhs)
      .slice(0, 20);

    const leftSpace = isMobile ? 150 : isTablet ? 320 : 480;
    const labelMargin = isMobile ? 10 : 25;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: theme === 'dark' ? 'rgba(0, 32, 91, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 32, 91, 0.1)',
        textStyle: { color: theme === 'dark' ? '#FFFFFF' : '#00205B', fontFamily: 'Adani' },
        formatter: (params: any) => {
          const d = params[0].data;
          const arrow = d.change > 0 ? '▲' : d.change < 0 ? '▼' : '';
          const changeColor = d.change > 0 ? '#00C853' : d.change < 0 ? '#FF3D00' : (theme === 'dark' ? '#E2E8F0' : '#64748b');
          return `
            <div style="padding: 4px; font-family: Adani;">
              <div style="font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 900; margin-bottom: 4px;">${d.category}</div>
              <div style="font-size: 13px; font-weight: 900; color: ${theme === 'dark' ? '#FFFFFF' : '#00205B'}; margin-bottom: 8px;">${d.name}</div>
              <div style="display: flex; justify-content: space-between; gap: 20px;">
                <span style="color: #94a3b8; font-size: 11px;">HOLDING</span>
                <span style="font-weight: 900; font-size: 11px; color: ${theme === 'dark' ? '#FFFFFF' : '#00205B'};">${d.value.toLocaleString()} L</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 20px;">
                <span style="color: #94a3b8; font-size: 11px;">CHANGE</span>
                <span style="font-weight: 900; font-size: 11px; color: ${changeColor};">${d.change > 0 ? '+' : ''}${d.change.toLocaleString()} L ${arrow}</span>
              </div>
            </div>
          `;
        }
      },
      grid: {
        left: leftSpace,
        right: isMobile ? '5%' : '15%', 
        bottom: '12%',
        top: '5%',
        containLabel: false
      },
      xAxis: {
        type: 'value',
        name: 'HOLDINGS (LAKHS)',
        nameLocation: 'middle',
        nameGap: 35,
        nameTextStyle: {
            color: theme === 'dark' ? '#94a3b8' : '#64748b',
            fontFamily: 'Adani',
            fontWeight: '900',
            fontSize: isMobile ? 10 : 13,
            opacity: 0.8
        },
        show: true,
        axisLine: { show: true, lineStyle: { color: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,32,91,0.2)' } },
        splitLine: { show: false },
        axisLabel: { show: false }
      },
      yAxis: {
        type: 'category',
        name: isMobile ? '' : 'INSTITUTIONAL SHAREHOLDERS',
        nameLocation: 'middle',
        nameGap: leftSpace - 40,
        nameRotate: 90,
        nameTextStyle: {
            color: theme === 'dark' ? '#94a3b8' : '#64748b',
            fontFamily: 'Adani',
            fontWeight: '900',
            fontSize: 13,
            align: 'center'
        },
        data: sortedData.map(item => item.name),
        inverse: true, // Rank 1 at top
        axisLabel: {
          color: theme === 'dark' ? '#E2E8F0' : '#1e293b',
          fontFamily: 'Adani',
          fontWeight: '900',
          fontSize: 13,
          width: leftSpace - 60,
          margin: labelMargin,
          overflow: 'none',
          interval: 0,
          formatter: (value: string) => {
             const maxLen = isMobile ? 15 : 120;
             const truncated = value.length > maxLen ? value.slice(0, maxLen) + "..." : value;
             return formatName(truncated);
          }
        },
        axisLine: { show: true, lineStyle: { color: theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,32,91,0.2)' } },
        axisTick: { show: false }
      },
      series: [
        {
          name: 'Holding',
          type: 'bar',
          barWidth: '60%',
          data: sortedData.map(item => ({
            name: item.name,
            value: item.lakhs,
            category: item.category,
            change: item.change,
            itemStyle: {
              color: getCategoryColor(item.category),
              borderRadius: [0, 4, 4, 0]
            },
            label: {
              show: true,
              position: 'right',
              distance: 10,
              color: theme === 'dark' ? '#FFFFFF' : '#00205B',
              fontWeight: '900',
              fontFamily: 'Adani',
              fontSize: 12,
              formatter: (params: any) => {
                const c = params.data.change;
                const arrow = c > 0 ? '▲' : c < 0 ? '▼' : '';
                return `${params.value.toLocaleString()} L  (${c > 0 ? '+' : ''}${c.toLocaleString()} ${arrow})`;
              }
            }
          }))
        }
      ]
    };
  }, [data, theme]);

  return (
    <div className="w-full h-full min-h-[800px] bg-transparent overflow-hidden p-4">
      <ReactECharts 
        option={option} 
        style={{ height: '800px', width: '100%' }}
        notMerge={true}
      />
    </div>
  );
}
