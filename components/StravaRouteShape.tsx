"use client";

import { useMemo } from "react";
import { MUSTARD } from "@/lib/design";

// Decodes Google's polyline algorithm format (used by Strava's
// summary_polyline) into [lat, lng] pairs. Standard, well-known algorithm —
// see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

// Draws the route as a plain shape (no basemap/tiles — no API key or
// network request needed), scaled to fit a small card.
export function StravaRouteShape({ polyline, height = 90 }: { polyline: string; height?: number }) {
  const path = useMemo(() => {
    const points = decodePolyline(polyline);
    if (points.length < 2) return null;

    const lats = points.map((p) => p[0]);
    const lngs = points.map((p) => p[1]);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const width = 300;
    const pad = 8;
    const latRange = maxLat - minLat || 1;
    const lngRange = maxLng - minLng || 1;
    // roughly correct aspect ratio at typical running-route latitudes
    const scaleX = (width - pad * 2) / lngRange;
    const scaleY = (height - pad * 2) / latRange;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (width - lngRange * scale) / 2;
    const offsetY = (height - latRange * scale) / 2;

    const d = points
      .map(([plat, plng], i) => {
        const x = offsetX + (plng - minLng) * scale;
        const y = height - (offsetY + (plat - minLat) * scale);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    return { d, width };
  }, [polyline, height]);

  if (!path) return null;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${path.width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <path d={path.d} fill="none" stroke={MUSTARD} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
