import type { SourceStatus } from '../types/travel';

export const DESTINATION_IMAGES: Record<string, string> = {
  goa: '/src/assets/images/hero_goa_coast_1794911960775.jpg',
  munnar: '/src/assets/images/dest_munnar_hills_1794911960529.jpg',
  coorg: '/src/assets/images/dest_coorg_forest_1794911960724.jpg',
  ooty: '/src/assets/images/dest_ooty_rail_1794911961075.jpg',
  hotel: '/src/assets/images/stay_boutique_hotel_1794911961308.jpg',
};

export function getDestinationImage(key?: string): string {
  if (!key) return DESTINATION_IMAGES.hotel;
  return DESTINATION_IMAGES[key.toLowerCase()] || DESTINATION_IMAGES.hotel;
}

export function formatINR(amount: number): string {
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatSourceMeaning(status: SourceStatus): string {
  switch (status) {
    case 'Live':
      return 'Verified from external provider (OpenStreetMap / Open-Meteo)';
    case 'Estimated':
      return 'Calculated using disclosed Haversine & rate model';
    case 'Simulated':
      return 'Prototype demo inventory (not live airline/hotel confirmation)';
    case 'Unavailable':
      return 'External source could not be verified';
  }
}
