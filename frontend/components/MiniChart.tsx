"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, AreaSeries } from "lightweight-charts";
import type { IChartApi } from "lightweight-charts";
import { PriceBar } from "@/lib/api";

interface MiniChartProps {
  bars: PriceBar[];
}

export default function MiniChart({ bars }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontSize: 10,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: {
          color: "rgba(148, 163, 184, 0.06)",
          visible: true,
        },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.04 },
        entireTextOnly: true,
      },
      timeScale: {
        borderVisible: false,
        visible: false,
      },
      crosshair: {
        vertLine: { visible: false, labelVisible: false },
        horzLine: {
          color: "rgba(56, 189, 248, 0.5)",
          labelVisible: true,
          labelBackgroundColor: "#0f172a",
        },
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: "rgba(34, 197, 94, 0.25)",
      bottomColor: "rgba(34, 197, 94, 0.01)",
      lineColor: "#22c55e",
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBackgroundColor: "#22c55e",
      crosshairMarkerBorderColor: "#030712",
      crosshairMarkerBorderWidth: 2,
      priceLineVisible: true,
      priceLineColor: "#22c55e",
      priceLineWidth: 1,
      priceLineStyle: 2, // dashed
      lastValueVisible: true,
    });

    const chartData = bars
      .map((bar) => {
        const timestamp = new Date(bar.timestamp);
        if (isNaN(timestamp.getTime())) return null;
        return {
          time: Math.floor(timestamp.getTime() / 1000) as any,
          value: bar.close,
        };
      })
      .filter(Boolean) as any[];

    chartData.sort((a: any, b: any) => a.time - b.time);
    const unique: any[] = [];
    const seen = new Set();
    for (const d of chartData) {
      if (!seen.has(d.time)) {
        seen.add(d.time);
        unique.push(d);
      }
    }

    if (unique.length > 0) {
      areaSeries.setData(unique);
      chart.timeScale().fitContent();
    }

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [bars]);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[160px]" />
  );
}
