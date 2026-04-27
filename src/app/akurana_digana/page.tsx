"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import AQDataViewer from "../../../components/AQDataViewer";

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

    const formatted = rows.map((row) => {
      const value = row[selectedStation];

      return {
        date: row.date,
        aqi: value !== null && value !== "-" ? Number(value) : 0,
      };
    });

    setChartData(formatted);
  };

  // ✅ CSV DOWNLOAD FUNCTION (NOW IN PARENT)
  const downloadCSV = () => {
    if (chartData.length === 0) {
      alert("No data to download");
      return;
    }

    const headers = ["Date", "AQI"];

    const rows = chartData.map((row) => [row.date, row.aqi]);

    const csvContent = [headers, ...rows]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${stationMap[selectedStation]}_${fromDate}_to_${toDate}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-10 max-w-4xl mx-auto bg-slate-100 rounded-lg">

      {/* Title */}
      <h1 className="text-2xl font-bold text-center mb-8 text-black">
        AQI 
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

        {/* Generate Chart Button */}
        <button
          onClick={fetchChartData}
          className="bg-green-600 text-white px-6 p-2 ml-2 rounded hover:bg-green-700"
        >
          Generate Chart
        </button>

        {/* Download CSV Button */}
        <button
          onClick={downloadCSV}
          className="bg-green-600 text-white px-6 p-2 ml-2 rounded hover:bg-green-700"
        >
          Download CSV
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