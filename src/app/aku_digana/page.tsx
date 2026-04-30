"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";
import AQDataViewer from "../../components/AQDataViewer";

type StationKey =
  | "akurana_av_outdoor"
  | "digana"
  | "akurana_pa"
  | "akurana_av_downstairs";

const stationMap: Record<StationKey, string> = {
  akurana_av_outdoor: "Akurana AV Outdoor",
  digana: "Digana",
  akurana_pa: "Akurana PA",
  akurana_av_downstairs: "Akurana AV Downstairs",
};

type AQRow = {
  date: string;
  akurana_av_outdoor: number | string;
  digana: number | string;
  akurana_pa: number | string;
  akurana_av_downstairs: number | string;
};

const cardStyle = {
  backgroundColor: "#ffffff",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
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
    { date: string; aqi: number | null }[]
  >([]);

  const [loading, setLoading] = useState(false);

  const [latestData, setLatestData] = useState<
    Record<StationKey, number | null>
  >({
    akurana_av_outdoor: null,
    digana: null,
    akurana_pa: null,
    akurana_av_downstairs: null,
  });

  const [latestDate, setLatestDate] = useState("");

  // 🔹 Fetch latest data
  useEffect(() => {
    const fetchLatest = async () => {
      const { data, error } = await supabase
        .from("aq_data_akurana_digana")
        .select(
          "date, akurana_av_outdoor, digana, akurana_pa, akurana_av_downstairs"
        )
        .order("date", { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) return;

      const row = data[0] as AQRow;

      setLatestDate(row.date);
      setLatestData({
        akurana_av_outdoor:
          row.akurana_av_outdoor !== "-" && row.akurana_av_outdoor !== null
            ? Number(row.akurana_av_outdoor)
            : null,
        digana:
          row.digana !== "-" && row.digana !== null
            ? Number(row.digana)
            : null,
        akurana_pa:
          row.akurana_pa !== "-" && row.akurana_pa !== null
            ? Number(row.akurana_pa)
            : null,
        akurana_av_downstairs:
          row.akurana_av_downstairs !== "-" &&
          row.akurana_av_downstairs !== null
            ? Number(row.akurana_av_downstairs)
            : null,
      });
    };

    fetchLatest();
  }, []);

  // 🔹 Fetch chart data
  const fetchChartData = useCallback(async () => {
    if (!fromDate || !toDate) {
      alert("Please select both dates first");
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
        aqi:
          value !== null && value !== "-" ? Number(value) : null,
      };
    });

    setChartData(formatted);
  }, [fromDate, toDate, selectedStation]);

  // 🔹 Auto update on station/date change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchChartData();
    }
  }, [selectedStation, fromDate, toDate, fetchChartData]);

  // 🔹 Stats
  const validData = chartData.filter((d) => d.aqi !== null);

  const avgAQI =
    validData.length > 0
      ? Math.round(
          validData.reduce((sum, d) => sum + (d.aqi as number), 0) /
            validData.length
        )
      : null;

  const maxAQI =
    validData.length > 0
      ? Math.max(...validData.map((d) => d.aqi as number))
      : null;

  const minAQI =
    validData.length > 0
      ? Math.min(...validData.map((d) => d.aqi as number))
      : null;

  const recentRows = [...chartData].reverse().slice(0, 10);

  const downloadCSV = () => {
    if (chartData.length === 0) {
      alert("No data to download");
      return;
    }

    const headers = ["Date", "AQI"];
    const rows = chartData.map((row) => [
      row.date,
      row.aqi ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((r) => r.join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${stationMap[selectedStation]}_${fromDate}_to_${toDate}.csv`;

    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "28px", fontWeight: "700" }}>
            Air Quality Dashboard
          </h1>
          <p style={{ color: "#9ca3af" }}>
            Akurana & Digana Monitoring Stations
          </p>
        </div>

        {/* Latest */}
        <div style={cardStyle}>
          <p style={{ fontSize: "12px", marginBottom: "12px" }}>
            Latest update {latestDate || ""}
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            {(Object.keys(stationMap) as StationKey[]).map(
              (key) => {
                const val = latestData[key];

                const color =
                  val !== null
                    ? getAQIColor(val)
                    : "#9ca3af";

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedStation(key)}
                    style={{
                      border:
                        selectedStation === key
                          ? "2px solid #2563eb"
                          : "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "16px",
                      background: "#fff",
                    }}
                  >
                    <p>{stationMap[key]}</p>
                    <h2 style={{ color }}>
                      {val ?? "—"}
                    </h2>
                    <span>
                      {val !== null
                        ? getAQILabel(val)
                        : "N/A"}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <input
              type="date"
              value={fromDate}
              onChange={(e) =>
                setFromDate(e.target.value)
              }
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) =>
                setToDate(e.target.value)
              }
            />

            <button onClick={fetchChartData}>
              Generate
            </button>

            <button
              onClick={downloadCSV}
              disabled={chartData.length === 0}
            >
              Download CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        {chartData.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            {[
              { label: "Average", value: avgAQI },
              { label: "Max", value: maxAQI },
              { label: "Min", value: minAQI },
            ].map((s) => (
              <div key={s.label} style={cardStyle}>
                <p>{s.label}</p>
                <h2>{s.value ?? "—"}</h2>
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div style={cardStyle}>
          {chartData.length > 0 ? (
            <AQDataViewer
              data={chartData}
              stationName={
                stationMap[selectedStation]
              }
              fromDate={fromDate}
              toDate={toDate}
            />
          ) : (
            <p>
              No data yet — select date range
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
