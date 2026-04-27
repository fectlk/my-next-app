"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import AQDataViewer from "../../../components/AQDataViewer";

// ✅ Station keys
type StationKey =
  | "akurana_av_outdoor"
  | "digana"
  | "akurana_pa"
  | "akurana_av_downstairs";

// ✅ Labels
const stationMap: Record<StationKey, string> = {
  akurana_av_outdoor: "Akurana AV Outdoor",
  digana: "Digana",
  akurana_pa: "Akurana PA",
  akurana_av_downstairs: "Akurana AV Downstairs",
};

// ✅ DB row type
type AQRow = {
  date: string;
  akurana_av_outdoor: number | string;
  digana: number | string;
  akurana_pa: number | string;
  akurana_av_downstairs: number | string;
};

export default function AQTrendsPage() {
  const [selectedStation, setSelectedStation] =
    useState<StationKey>("akurana_av_outdoor");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [chartData, setChartData] = useState<
    { date: string; aqi: number }[]
  >([]);

  // ✅ Fetch data
  const fetchChartData = async () => {
    if (!fromDate || !toDate) {
      alert("Please select date range");
      return;
    }

    const { data, error } = await supabase
      .from("aq_data_akurana_digana")
      .select(
        "date, akurana_av_outdoor, digana, akurana_pa, akurana_av_downstairs"
      )
      .gte("date", fromDate)
      .lte("date", toDate)
      .order("date", { ascending: true });

    if (error || !data) {
      console.error(error);
      return;
    }

    const rows = data as AQRow[];

    // ✅ SAFE + FIXED TRANSFORMATION
    const formatted = rows.map((row) => {
      const value =
        row[selectedStation as keyof AQRow];

      return {
        date: new Date(row.date).toLocaleDateString(),
        aqi: value !== null ? Number(value) : 0, // 🔥 FIX HERE
      };
    });

    setChartData(formatted);
  };

  return (
    <div className="p-10 max-w-4xl mx-auto bg-slate-100 rounded-lg">

      {/* Title */}
      <h1 className="text-2xl font-bold text-center mb-8 text-black">
        AQI Trends Chart
      </h1>

      {/* Controls */}
      <div className="flex flex-wrap justify-center gap-6 mb-8">

        {/* Station Select */}
        <select
          value={selectedStation}
          onChange={(e) =>
            setSelectedStation(e.target.value as StationKey)
          }
          className="border px-4 py-2 rounded min-w-[200px]"
        >
          {Object.entries(stationMap).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        {/* Dates */}
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border px-4 py-2 rounded"
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border px-4 py-2 rounded"
        />

        {/* Button */}
        <button
          onClick={fetchChartData}
          className="bg-blue-600 text-black px-6 py-2 rounded"
        >
          Generate Chart
        </button>
        
      </div>

      {/* Chart */}
      <div className="mt-6">
        {chartData.length > 0 && (
          <AQDataViewer
            data={chartData}
            stationName={stationMap[selectedStation]}
            fromDate={fromDate}
            toDate={toDate}
          />
        )}
      </div>
    </div>
  );
}