"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from "recharts";

import { useRef } from "react";
import html2canvas from "html2canvas";
import { FiDownload } from "react-icons/fi";

type Props = {
  data: { date: string; aqi: number }[];
  stationName: string;
  fromDate: string;
  toDate: string;
};

export default function AQDataViewer({
  data,
  stationName,
  fromDate,
  toDate,
}: Props) {
  const chartRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const downloadChart = async () => {
    if (!chartRef.current) return;

    // hide button
    if (buttonRef.current) buttonRef.current.style.display = "none";

    const canvas = await html2canvas(chartRef.current);
    const image = canvas.toDataURL("image/png");

    // show button again
    if (buttonRef.current) buttonRef.current.style.display = "block";

    const link = document.createElement("a");
    link.href = image;
    link.download = `${stationName}-${fromDate}-to-${toDate}.png`;
    link.click();
  };

  const downloadCSV = () => {
    if (!data || data.length === 0) {
      alert("No data to download");
      return;
    }
  
    const headers = ["Date", "AQI"];
  
    const rows = data.map((row) => [row.date, row.aqi]);
  
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
  
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement("a");
    link.href = url;
    link.download = `${stationName}_${fromDate}_to_${toDate}.csv`;
  
    link.click();
  
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={chartRef} className="bg-white p-6 rounded-lg shadow-md relative">

      {/* Download button */}
      <button
        ref={buttonRef}
        onClick={downloadChart}
        className="absolute top-3 right-3 p-2 bg-cyan-600 text-white rounded-full shadow hover:bg-cyan-700"
      >
        <FiDownload size={18} />
      </button>

      {/* Title */}
      <h2 className="text-center font-semibold mb-2">
        AQI Trend - {stationName}
      </h2>

      <p className="text-center text-sm text-gray-500 mb-4">
        {fromDate} → {toDate}
      </p>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>

          <ReferenceArea y1={0} y2={50} fill="#16a34a" fillOpacity={0.3} />
          <ReferenceArea y1={50} y2={100} fill="#fde047" fillOpacity={0.3} />
          <ReferenceArea y1={100} y2={150} fill="#f97316" fillOpacity={0.3} />
          <ReferenceArea y1={150} y2={200} fill="#dc2626" fillOpacity={0.3} />
          <ReferenceArea y1={200} y2={300} fill="#7e22ce" fillOpacity={0.3} />

          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            angle={-45}
            textAnchor="end"
            height={60}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <YAxis domain={[0, 300]} />
          <Tooltip />

          <Line
            type="monotone"
            dataKey="aqi"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

    </div>
  );
}
