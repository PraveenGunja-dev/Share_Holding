/**
 * Ownership Mix ribbon donut sizing: **half** of the Recharts radii used by
 * `TopMutualFunds` (`pieRadii`: mobile 35/55, default 50/85, ultra 60/100).
 * Keeps the small donut proportional to the main MF pies across viewports.
 */
export type OwnershipMixPieLayout = {
  innerRadius: number;
  outerRadius: number;
  /** Square wrapper size (px) for ResponsiveContainer; fits 2×outer + padding */
  boxSizePx: number;
};

export function getOwnershipMixPieLayout(viewportWidth: number): OwnershipMixPieLayout {
  const isUltraWide = viewportWidth >= 1920;
  const isMobile = viewportWidth < 768;

  let inner: number;
  let outer: number;

  if (isUltraWide) {
    inner = 30;
    outer = 50;
  } else if (isMobile) {
    inner = Math.round(35 / 2);
    outer = Math.round(55 / 2);
  } else {
    // Laptop / tablet (768–1919): same MF tier as main pie — half of 50 / 85
    inner = 25;
    outer = Math.round(85 / 2);
  }

  const boxSizePx = Math.ceil(outer * 2 + 16);

  return { innerRadius: inner, outerRadius: outer, boxSizePx };
}
