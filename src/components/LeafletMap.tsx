import { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { DiscoveredPlace, HotelOption, ItineraryActivity, ItineraryDay } from '../types/travel';

interface LeafletMapProps {
  centerLat: number;
  centerLng: number;
  days: ItineraryDay[];
  hotel?: HotelOption;
  selectedDay: number;
  viewMode: 'day' | 'full';
  selectedActivityId: string | null;
  onSelectActivity?: (activityId: string, dayNumber: number) => void;
  extraPlaces?: DiscoveredPlace[];
  showExtraPlaces?: boolean;
  focusedPlaceId?: string | null;
  onSelectExtraPlace?: (place: DiscoveredPlace) => void;
}

const DAY_COLORS = ['#0f766e', '#1d4ed8', '#b45309', '#7e22ce', '#be123c', '#047857', '#4338ca'];

export function LeafletMap({
  centerLat,
  centerLng,
  days,
  hotel,
  selectedDay,
  viewMode,
  selectedActivityId,
  onSelectActivity,
  extraPlaces = [],
  showExtraPlaces = true,
  focusedPlaceId = null,
  onSelectExtraPlace,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const extraMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [centerLat, centerLng],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(mapRef.current);
    }

    const map = mapRef.current;
    markersRef.current.clear();
    extraMarkersRef.current.clear();

    map.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        map.removeLayer(layer);
      }
    });

    const visibleDays =
      viewMode === 'full' ? days : days.filter((d) => d.day_number === selectedDay);
    const allLatLngs: L.LatLngExpression[] = [];
    const visibleTitles = new Set<string>();

    if (hotel && Number.isFinite(hotel.lat) && Number.isFinite(hotel.lng)) {
      const hotelIcon = L.divIcon({
        className: 'custom-hotel-pin',
        html: `<div style="background:#0f172a;color:#fff;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;border:1.5px solid #fff;white-space:nowrap;box-shadow:0 2px 8px rgba(15,23,42,0.35);">Stay</div>`,
        iconSize: [46, 24],
        iconAnchor: [23, 12],
      });
      L.marker([hotel.lat, hotel.lng], { icon: hotelIcon })
        .addTo(map)
        .bindPopup(
          `<strong>${hotel.name}</strong><br/>${hotel.area} · ₹${hotel.price_per_night}/night<br/><span style="font-family:monospace;font-size:11px;">${hotel.lat.toFixed(
            4
          )}, ${hotel.lng.toFixed(4)}</span>`
        );
      allLatLngs.push([hotel.lat, hotel.lng]);
    }

    visibleDays.forEach((day) => {
      const color = DAY_COLORS[(day.day_number - 1) % DAY_COLORS.length];
      const dayPath: L.LatLngExpression[] = [];

      if (viewMode === 'day' && hotel && Number.isFinite(hotel.lat) && Number.isFinite(hotel.lng)) {
        dayPath.push([hotel.lat, hotel.lng]);
      }

      day.activities.forEach((act: ItineraryActivity, idx: number) => {
        if (!Number.isFinite(act.lat) || !Number.isFinite(act.lng)) return;
        visibleTitles.add(act.title.toLowerCase());
        const label = viewMode === 'full' ? `D${day.day_number}.${idx + 1}` : `${idx + 1}`;
        const isActive = act.id === selectedActivityId;

        const markerIcon = L.divIcon({
          className: 'custom-stop-pin',
          html: `<div style="background:${isActive ? '#d97706' : color};color:#fff;min-width:26px;height:26px;padding:0 5px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:${
            isActive ? '2.5px solid #0f172a' : '1.5px solid #fff'
          };box-shadow:0 2px 8px rgba(0,0,0,0.28);transform:${
            isActive ? 'scale(1.15)' : 'scale(1)'
          };">${label}</div>`,
          iconSize: [28, 26],
          iconAnchor: [14, 13],
        });

        const marker = L.marker([act.lat, act.lng], { icon: markerIcon, zIndexOffset: isActive ? 900 : 400 })
          .addTo(map)
          .bindPopup(
            `<strong>Day ${day.day_number} · ${act.slot}: ${act.title}</strong><br/>${act.opening_hours} (${act.duration_minutes}m)<br/>${act.distance_from_prev_km} km (${act.travel_time_from_prev_min} min transit)<br/><span style="font-family:monospace;font-size:11px;">${act.lat.toFixed(
              4
            )}, ${act.lng.toFixed(4)}</span>`
          );

        marker.on('click', () => {
          onSelectActivity?.(act.id, day.day_number);
        });

        markersRef.current.set(act.id, marker);
        dayPath.push([act.lat, act.lng]);
        allLatLngs.push([act.lat, act.lng]);
      });

      if (dayPath.length > 1) {
        L.polyline(dayPath, {
          color,
          weight: 3,
          opacity: 0.85,
          dashArray: viewMode === 'full' ? undefined : '6, 6',
        }).addTo(map);
      }
    });

    // Plot unscheduled / nearby discovered tourist attractions as secondary map pins
    if (showExtraPlaces && extraPlaces.length > 0) {
      extraPlaces.forEach((place) => {
        if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
        if (visibleTitles.has(place.title.toLowerCase())) return;
        const isFocused = place.id === focusedPlaceId;

        const extraIcon = L.divIcon({
          className: 'custom-discovery-pin',
          html: `<div style="background:${isFocused ? '#a16207' : '#ffffff'};color:${
            isFocused ? '#ffffff' : '#0f4c45'
          };width:${isFocused ? 24 : 18}px;height:${isFocused ? 24 : 18}px;border-radius:9999px;display:flex;align-items:center;justify-content:center;font-size:${
            isFocused ? 12 : 11
          }px;font-weight:700;border:2px solid ${
            isFocused ? '#14211e' : '#0f4c45'
          };box-shadow:0 1px 6px rgba(20,33,30,0.3);">+</div>`,
          iconSize: isFocused ? [24, 24] : [18, 18],
          iconAnchor: isFocused ? [12, 12] : [9, 9],
        });

        const marker = L.marker([place.lat, place.lng], {
          icon: extraIcon,
          zIndexOffset: isFocused ? 950 : 100,
        })
          .addTo(map)
          .bindPopup(
            `<strong>${place.title}</strong><br/>${place.category} · ${
              place.is_indoor ? 'Indoor' : 'Outdoor'
            }<br/>${place.opening_hours} (${place.duration_minutes}m) · ${
              place.estimated_cost_inr > 0 ? `₹${place.estimated_cost_inr}` : 'Free entry'
            }<br/><span style="font-family:monospace;font-size:11px;">${place.lat.toFixed(
              4
            )}, ${place.lng.toFixed(4)}</span>`
          );

        marker.on('click', () => {
          onSelectExtraPlace?.(place);
        });

        extraMarkersRef.current.set(place.id, marker);
        allLatLngs.push([place.lat, place.lng]);
      });
    }

    if (focusedPlaceId && extraMarkersRef.current.has(focusedPlaceId)) {
      const targetMarker = extraMarkersRef.current.get(focusedPlaceId)!;
      const latLng = targetMarker.getLatLng();
      map.setView(latLng, 13, { animate: true });
      targetMarker.openPopup();
    } else if (allLatLngs.length > 1) {
      map.fitBounds(L.latLngBounds(allLatLngs), { padding: [36, 36], maxZoom: 13 });
    } else {
      map.setView([centerLat, centerLng], 12);
    }

    if (selectedActivityId) {
      const targetMarker = markersRef.current.get(selectedActivityId);
      if (targetMarker) {
        targetMarker.openPopup();
      }
    }

    setTimeout(() => {
      map.invalidateSize();
    }, 80);
  }, [
    centerLat,
    centerLng,
    days,
    hotel,
    selectedDay,
    viewMode,
    selectedActivityId,
    onSelectActivity,
    extraPlaces,
    showExtraPlaces,
    focusedPlaceId,
    onSelectExtraPlace,
  ]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-[380px] rounded-md border border-[#E4DFD4] bg-[#F3EFE6] overflow-hidden"
      aria-label={`OpenStreetMap trip route visualization (${viewMode === 'full' ? 'All Days' : `Day ${selectedDay}`})`}
    />
  );
}
