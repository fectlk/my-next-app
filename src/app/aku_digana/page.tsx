"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import AQDataViewer from "../../components/AQDataViewer";

// Station keys
type StationKey =
  | "akurana_av_outdoor"
  | "digana"
  | "akurana_pa"
  | "akurana_av_downstairs";

// Labels
const stationMap: Record<StationKey, string> = {
  akurana_av_outdoor: "Akurana AV Outdoor",
  digana: "Digana",
  akurana_pa: "Akurana PA",
  akurana_av_downstairs: "Akurana AV Downstairs",
};

// DB row type
type AQRow = {
  date: string;
  akurana_av_outdoor: number | string;
  digana: number | string;
  akurana_pa: number | string;
  akurana_av_downstairs: number | string;
};

function getAQIColor(aqi: number): string {
  if (aqi <= 50) return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  if (aqi <= 300) return "#a855f7";
  return "#7f1d1d";
}

function getAQILabel(aqi: number): string {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for Sensitive";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}

export default function AQTrendsPage() {
  const [selectedStation, setSelectedStation] =
    useState<StationKey>("akurana_av_outdoor");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [chartData, setChartData] = useState<{ date: string; aqi: number }[]>([]);
  const [loading, setLoading] = useState(false);

  const [latestData, setLatestData] = useState<Record<StationKey, number | null>>({
    akurana_av_outdoor: null,
    digana: null,
    akurana_pa: null,
    akurana_av_downstairs: null,
  });
  const [latestDate, setLatestDate] = useState("");

  // Fetch latest reading on mount
  useEffect(() => {
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from("aq_data_akurana_digana")
        .select("date, akurana_av_outdoor, digana, akurana_pa, akurana_av_downstairs")
        .order("date", { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return;
      const row = data[0] as AQRow;
      setLatestDate(row.date);
      setLatestData({
        akurana_av_outdoor: row.akurana_av_outdoor !== "-" && row.akurana_av_outdoor !== null ? Number(row.akurana_av_outdoor) : null,
        digana: row.digana !== "-" && row.digana !== null ? Number(row.digana) : null,
        akurana_pa: row.akurana_pa !== "-" && row.akurana_pa !== null ? Number(row.akurana_pa) : null,
        akurana_av_downstairs: row.akurana_av_downstairs !== "-" && row.akurana_av_downstairs !== null ? Number(row.akurana_av_downstairs) : null,
      });
    };
    fetchLatest();
  }, []);

  // Fetch chart data
  const fetchChartData = useCallback(async () => {
    if (!fromDate || !toDate) {
      alert("Please select date range");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("aq_data_akurana_digana")
      .select("date, akurana_av_outdoor, digana, akurana_pa, akurana_av_downstairs")
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true });

    setLoading(false);

    if (error || !data) {
      console.error(error);
      return;
    }

    const rows = data as AQRow[];
    const formatted = rows.map((row) => {
      const value = row[selectedStation];
      return {
        date: row.date,
        aqi: value !== null && value !== "-" ? Number(value) : 0,
      };
    });

    setChartData(formatted);
  }, [fromDate, toDate, selectedStation]);

  // Re-fetch when station changes if dates already set
  useEffect(() => {
    if (fromDate && toDate) {
      fetchChartData();
    }
  }, [selectedStation]); // eslint-disable-line react-hooks/exhaustive-deps

  // CSV DOWNLOAD
  const downloadCSV = () => {
    if (chartData.length === 0) {
      alert("No data to download");
      return;
    }
    const headers = ["Date", "AQI"];
    const rows = chartData.map((row) => [row.date, row.aqi]);
    const csvContent = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${stationMap[selectedStation]}_${fromDate}_to_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const recentRows = [...chartData].reverse().slice(0, 10);

  const avgAQI =
    chartData.length > 0
      ? Math.round(chartData.reduce((sum, d) => sum + d.aqi, 0) / chartData.length)
      : null;
  const maxAQI = chartData.length > 0 ? Math.max(...chartData.map((d) => d.aqi)) : null;
  const minAQI = chartData.length > 0 ? Math.min(...chartData.map((d) => d.aqi)) : null;

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center pt-2">
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
            Air Quality Dashboard
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Akurana &amp; Digana Monitoring Stations
          </p>
        </div>

        {/* Latest Reading Cards */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3">
            Latest update {latestDate ? `— ${latestDate}` : ""}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(Object.keys(stationMap) as StationKey[]).map((key) => {
              const val = latestData[key];
              const color = val !== null ? getAQIColor(val) : "#9ca3af";
              const label = val !== null ? getAQILabel(val) : "N/A";
              return (
                <button
                  key={key}
                  onClick={() => setSelectedStation(key)}
                  className={`rounded-2xl p-5 text-left transition-all border-2 bg-white shadow-sm hover:shadow-md ${
                    selectedStation === key
                      ? "border-blue-500"
                      : "border-transparent hover:border-gray-200"
                  }`}
                >
                  <p className="text-xs text-gray-400 font-medium mb-2 truncate">
                    {stationMap[key]}
                  </p>
                  <p className="text-3xl font-bold leading-none" style={{ color }}>
                    {val !== null ? val : "—"}
                  </p>
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full mt-3 inline-block"
                    style={{ backgroundColor: color + "22", color }}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-4">
            Filter Data
          </p>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">Station</label>
              <select
                value={selectedStation}
                onChange={(e) => setSelectedStation(e.target.value as StationKey)}
                className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm min-w-[190px] bg-gray-50 text-gray-700"
              >
                {Object.entries(stationMap).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm bg-gray-50 text-gray-700"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-500 font-medium">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="border border-gray-200 px-4 py-2.5 rounded-xl text-sm bg-gray-50 text-gray-700"
              />
            </div>

            <button
              onClick={fetchChartData}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Loading..." : "Generate Chart"}
            </button>

            <button
              onClick={downloadCSV}
              className="border border-gray-200 text-gray-600 px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Download CSV
            </button>
          </div>
        </div>

        {/* Stats Row */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Average AQI", value: avgAQI },
              { label: "Max AQI", value: maxAQI },
              { label: "Min AQI", value: minAQI },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl shadow-sm p-6 text-center">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
                  {label}
                </p>
                <p
                  className="text-3xl font-bold"
                  style={{ color: value !== null ? getAQIColor(value) : "#9ca3af" }}
                >
                  {value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">
              {stationMap[selectedStation]} — AQI Trend
            </h2>
            {chartData.length > 0 && (
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                {chartData.length} days
              </span>
            )}
          </div>

          {chartData.length > 0 ? (
            <AQDataViewer
              data={chartData}
              stationName={stationMap[selectedStation]}
              fromDate={fromDate}
              toDate={toDate}
            />
          ) : (
            <div className="h-52 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-xl gap-2">
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.5l4.5-4.5 3 3 4.5-6 3 3.75" />
              </svg>
              <span className="text-sm">Select a date range and click Generate Chart</span>
            </div>
          )}
        </div>

        {/* Recent Data Table */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-700 mb-4">Recent Readings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b-2 border-gray-100">
                    <th className="pb-3 pr-6 font-medium">Date</th>
                    <th className="pb-3 pr-6 font-medium">AQI</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentRows.map((row, i) => {
                    const color = getAQIColor(row.aqi);
                    return (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 pr-6 text-gray-500 font-mono text-xs">
                          {row.date}
                        </td>
                        <td className="py-3 pr-6 font-bold text-base" style={{ color }}>
                          {row.aqi}
                        </td>
                        <td className="py-3">
                          <span
                            className="text-xs px-3 py-1 rounded-full font-medium"
                            style={{ backgroundColor: color + "22", color }}
                          >
                            {getAQILabel(row.aqi)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AQI Legend */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3">
            AQI Scale
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { range: "0–50", label: "Good", color: "#22c55e" },
              { range: "51–100", label: "Moderate", color: "#eab308" },
              { range: "101–150", label: "Unhealthy (Sensitive)", color: "#f97316" },
              { range: "151–200", label: "Unhealthy", color: "#ef4444" },
              { range: "201–300", label: "Very Unhealthy", color: "#a855f7" },
              { range: "301+", label: "Hazardous", color: "#7f1d1d" },
            ].map(({ range, label, color }) => (
              <div
                key={range}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full font-medium"
                style={{ backgroundColor: color + "22", color }}
              >
                <span className="font-bold">{range}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
