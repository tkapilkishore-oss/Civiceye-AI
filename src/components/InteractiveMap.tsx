"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface InteractiveMapProps {
  center: [number, number];
  zoom: number;
  markers?: {
    id: string;
    latitude: number;
    longitude: number;
    issue_type: string;
    severity: string;
    status: string;
    locality: string;
    city?: string;
    image_url?: string;
  }[];
  draggable?: boolean;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function InteractiveMap({
  center,
  zoom,
  markers = [],
  draggable = false,
  onMarkerDragEnd,
  onMapClick,
}: InteractiveMapProps) {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const activeMarker = useRef<L.Marker | null>(null);
  const markerGroup = useRef<L.LayerGroup | null>(null);

  const getCategoryPhoto = (category: string) => {
    const catLower = (category || "").toLowerCase();
    if (catLower.includes("pothole") || catLower.includes("road")) {
      return "/test_images/pothole.jpg";
    }
    if (catLower.includes("water") || catLower.includes("pipe") || catLower.includes("leak")) {
      return "/test_images/water_pipe_burst.jpg";
    }
    if (catLower.includes("garbage") || catLower.includes("trash") || catLower.includes("waste") || catLower.includes("accum")) {
      return "/test_images/garbage.jpg";
    }
    if (catLower.includes("light") || catLower.includes("lamp") || catLower.includes("street-light") || catLower.includes("broken lights")) {
      return "/test_images/streetlight.jpg";
    }
    if (catLower.includes("drain")) {
      return "/test_images/water_pipe_burst.jpg";
    }
    return "/test_images/pothole.jpg";
  };

  // Setup Custom SVGs as DivIcons to bypass Webpack default image issues
  const createCustomIcon = (severity: string, isDraggablePin = false) => {
    const isCritical = (severity || "").toLowerCase() === "critical";
    const isHigh = (severity || "").toLowerCase() === "high";
    const color = isDraggablePin ? "#a78bfa" : isCritical ? "#ef4444" : isHigh ? "#f59e0b" : "#3b82f6";
    const size = isDraggablePin ? 38 : 30;
    const innerSize = isDraggablePin ? 18 : 14;

    const svgHtml = `
      <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: ${size}px; height: ${size}px; border-radius: 50%; background-color: ${color}; opacity: 0.35; transform: scale(1); animation: marker-ping 1.5s infinite ease-in-out;"></span>
        <div style="width: ${innerSize}px; height: ${innerSize}px; border-radius: 50%; background-color: ${color}; border: 2.5px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 10; display: flex; align-items: center; justify-content: center;">
          ${isDraggablePin ? '<div style="width: 5px; height: 5px; border-radius: 50%; background-color: white;"></div>' : ''}
        </div>
      </div>
    `;

    return L.divIcon({
      html: svgHtml,
      className: "custom-leaflet-marker",
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!leafletMap.current) {
      leafletMap.current = L.map(mapContainerRef.current, {
        zoomControl: false,
      }).setView(center, zoom);

      L.control.zoom({ position: "bottomright" }).addTo(leafletMap.current);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 18,
      }).addTo(leafletMap.current);

      // Listen for popup clicks programmatically for routers
      leafletMap.current.on("popupopen", (e) => {
        const popup = e.popup;
        const container = popup.getElement();
        if (container) {
          const button = container.querySelector(".open-report-btn");
          if (button) {
            button.addEventListener("click", () => {
              const reportId = button.getAttribute("data-id");
              if (reportId) {
                router.push(`/report/${reportId}`);
              }
            });
          }
        }
      });

      // Map Click to shift draggable pin
      if (onMapClick) {
        leafletMap.current.on("click", (e) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      markerGroup.current = L.layerGroup().addTo(leafletMap.current);
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  // Update Center and Zoom dynamically
  useEffect(() => {
    if (leafletMap.current) {
      leafletMap.current.setView(center, zoom, { animate: true, duration: 1 });
    }
  }, [center[0], center[1], zoom]);

  // Sync Markers and Draggable state
  useEffect(() => {
    if (!leafletMap.current) return;

    // 1. Draggable Citizen report pin
    if (draggable) {
      if (activeMarker.current) {
        activeMarker.current.setLatLng(center);
      } else {
        activeMarker.current = L.marker(center, {
          draggable: true,
          icon: createCustomIcon("High", true),
        }).addTo(leafletMap.current);

        activeMarker.current.on("dragend", () => {
          if (activeMarker.current && onMarkerDragEnd) {
            const latlng = activeMarker.current.getLatLng();
            onMarkerDragEnd(latlng.lat, latlng.lng);
          }
        });
      }
    } else {
      if (activeMarker.current) {
        activeMarker.current.remove();
        activeMarker.current = null;
      }
    }

    // 2. Sync Dashboard pins
    if (markerGroup.current) {
      markerGroup.current.clearLayers();

      markers.forEach((m) => {
        if (m.latitude && m.longitude) {
          const mMarker = L.marker([m.latitude, m.longitude], {
            icon: createCustomIcon(m.severity, false),
          });

          // Popup HTML structure matching dark theme
          const popupHtml = `
            <div class="p-1 text-slate-100 font-sans min-w-[200px]">
              <div class="relative h-20 w-full rounded-lg overflow-hidden mb-2 bg-slate-950">
                <img src="${m.image_url || getCategoryPhoto(m.issue_type)}" alt="${m.issue_type}" class="w-full h-full object-cover" />
                <span class="absolute top-1.5 left-1.5 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-900/80 border border-white/10 text-white">${m.severity}</span>
              </div>
              <div class="space-y-1 bg-transparent">
                <div class="flex justify-between items-center">
                  <h4 class="text-xs font-extrabold text-white leading-tight font-display">${m.issue_type}</h4>
                </div>
                <p class="text-[10px] text-slate-400 font-medium">${m.locality || "Unknown Locality"}</p>
                <p class="text-[9px] text-slate-400">City: ${m.city || "Bengaluru"}</p>
                <div class="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                  <span class="text-[9px] font-bold text-electric-blue uppercase">${m.status}</span>
                  <button data-id="${m.id}" class="open-report-btn px-2.5 py-1 bg-electric-blue text-background font-display text-[9px] font-extrabold rounded-md hover:brightness-110 active:scale-95 transition-all text-center cursor-pointer">Open</button>
                </div>
              </div>
            </div>
          `;

          mMarker.bindPopup(popupHtml, {
            maxWidth: 240,
            closeButton: true,
          });

          markerGroup.current?.addLayer(mMarker);
        }
      });
    }
  }, [markers, draggable, center[0], center[1]]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-xl border border-white/10 z-0 bg-slate-950/60">
      <div ref={mapContainerRef} className="w-full h-full min-h-[300px]" />
    </div>
  );
}
