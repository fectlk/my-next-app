"use client";

import { useState, useEffect } from "react";
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

  const [chartData, setChartData] = useState<
    { date: string; aqi: number }[]
  >([]);

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

  // Re-fetch chart when station changes if dates already set
  useEffect(() => {
    if (fromDate && toDate) {
      fetchChartData();
    }
  }, [selectedStation]);

  // Fetch data
  const fetchChartData = async () => {
    if (!fromDate || !toDate) {
      alert("Please select date range");
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from("aq_data_akurana_digana")
      .select(
        "date, akurana_av_outdoor, digana, akurana_pa, akurana_av_downstairs"
      )
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
  };

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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Air Quality Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Akurana & Digana Monitoring Stations</p>
        </div>

        {/* Latest Reading Cards */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
            Latest update {latestDate ? `— ${latestDate}` : ""}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(stationMap) as StationKey[]).map((key) => {
              const val = latestData[key];
              const color = val !== null ? getAQIColor(val) : "#9ca3af";
              const label = val !== null ? getAQILabel(val) : "N/A";
              return (
                <button
                  key={key}
                  onClick={() => setSelectedStation(key)}
                  className={`rounded-xl p-4 text-left transition-all border-2 bg-white shadow-sm ${
                    selectedStation === key
                      ? "border-blue-500"
                      : "border-transparent hover:border-gray-200"
                  }`}
                >
                  <p className="text-xs text-gray-500 font-medium mb-1 truncate">
                    {stationMap[key]}
                  </p>
                  <p className="text-2xl font-bold" style={{ color }}>
                    {val !== null ? val : "—"}
                  </p>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block"
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
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Station</label>
            <select
              value={selectedStation}
              onChange={(e) => setSelectedStation(e.target.value as StationKey)}
              className="border border-gray-200 px-3 py-2 rounded-lg text-sm min-w-[180px] bg-gray-50"
            >
              {Object.entries(stationMap).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-200 px-3 py-2 rounded-lg text-sm bg-gray-50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-200 px-3 py-2 rounded-lg text-sm bg-gray-50"
            />
          </div>

          <button
            onClick={fetchChartData}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? "Loading..." : "Generate Chart"}
          </button>

          <button
            onClick={downloadCSV}
            className="border border-gray-200 text-gray-700 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 font-medium"
          >
            Download CSV
          </button>
        </div>

        {/* Stats Row */}
        {chartData.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Average AQI", value: avgAQI },
              { label: "Max AQI", value: maxAQI },
              { label: "Min AQI", value: minAQI },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-xl shadow-sm p-4 text-center">
                <p className="text-xs text-gray-500 font-medium">{label}</p>
                <p
                  className="text-2xl font-bold mt-1"
                  style={{ color: value !== null ? getAQIColor(value) : "#9ca3af" }}
                >
                  {value ?? "—"}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Chart — always visible */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700 text-sm">
              {stationMap[selectedStation]} — AQI Trend
            </h2>
            {chartData.length > 0 && (
              <span className="text-xs text-gray-400">{chartData.length} days</span>
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
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              Select a date range and click Generate Chart
            </div>
          )}
        </div>

        {/* Recent Data Table */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-700 text-sm mb-3">Recent Readings</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">AQI</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRows.map((row, i) => {
                    const color = getAQIColor(row.aqi);
                    return (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 text-gray-600">{row.date}</td>
                        <td className="py-2 font-semibold" style={{ color }}>
                          {row.aqi}
                        </td>
                        <td className="py-2">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium"
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
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">AQI Scale</p>
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
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium"
                style={{ backgroundColor: color + "22", color }}
              >
                <span>{range}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
