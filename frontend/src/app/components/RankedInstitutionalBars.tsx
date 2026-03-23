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
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(1200);

  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const el = wrapRef.current;
    if (!el) return;

    const update = () => {
      const w = el.getBoundingClientRect().width;
      setContainerWidth(w || window.innerWidth);
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = containerWidth < 768;
  // Treat smaller laptops (like 13") as tablet so left-side labels fit.
  const isTablet = containerWidth < 1400;
  // Extra-small laptop breakpoint to tighten labels for 13"-ish screens.
  const isSmallLaptop = containerWidth < 1280;

  const option = useMemo(() => {
    const sortedData = [...data]
      .sort((a, b) => b.lakhs - a.lakhs)
      .slice(0, 20);

    const leftSpace = isMobile ? 150 : isSmallLaptop ? 310 : isTablet ? 280 : 380;
    const labelMargin = isMobile ? 10 : isSmallLaptop ? 16 : 18;
    const axisLabelFontSize = isMobile ? 11 : isSmallLaptop ? 12 : 13;

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
          // Keep "sell" in red, but show "buy"/positive change in neutral black/foreground (matches tables).
          const changeColor = d.change > 0
            ? (theme === 'dark' ? '#FFFFFF' : '#00205B')
            : d.change < 0
              ? '#FF3D00'
              : (theme === 'dark' ? '#E2E8F0' : '#64748b');
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
        nameGap: leftSpace - (isMobile ? 35 : 45),
        nameRotate: 90,
        nameTextStyle: {
            color: theme === 'dark' ? '#94a3b8' : '#64748b',
            fontFamily: 'Adani',
            fontWeight: '900',
            fontSize: isMobile ? 12 : isSmallLaptop ? 12 : 13,
            align: 'center'
        },
        data: sortedData.map(item => item.name),
        inverse: true, // Rank 1 at top
        axisLabel: {
          color: theme === 'dark' ? '#E2E8F0' : '#1e293b',
          fontFamily: 'Adani',
          fontWeight: '900',
          fontSize: axisLabelFontSize,
          width: leftSpace - 60,
          margin: labelMargin,
          overflow: 'none',
          interval: 0,
          formatter: (value: string, idx: number) => {
            const safeIdx = typeof idx === 'number' ? idx : 0;
            // Always render a label (truncated if needed) to avoid "missing names" on smaller widths.
            const maxLen =
              safeIdx < (isMobile ? 8 : isSmallLaptop ? 10 : 20)
                ? (isMobile ? 15 : isSmallLaptop ? 28 : 120)
                : (isMobile ? 12 : isSmallLaptop ? 20 : 80);
            const truncated = value.length > maxLen ? value.slice(0, maxLen) + '...' : value;
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
  }, [data, theme, containerWidth, isMobile, isTablet, isSmallLaptop]);

  return (
    <div ref={wrapRef} className="w-full h-full min-h-[800px] bg-transparent overflow-x-visible p-4">
      <ReactECharts 
        option={option} 
        style={{ height: '800px', width: '100%' }}
        notMerge={true}
      />
    </div>
  );
}
