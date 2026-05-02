import { INDORE_HOSPITALS } from './mock-hospitals';

/**
 * Haversine formula — returns distance in km between two lat/lng points.
 * This is REAL math, used identically in mock and production modes.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Apply smart filter + sort to a list of hospitals.
 * Works identically on mock OR real Google Places data.
 *
 * @param {Array} hospitals - Raw hospital objects with .lat, .lng, .rating, .reviewCount, .openNow, .consultationFee
 * @param {string} filter - 'bestRating' | 'nearestDistance' | 'criticalCapacity' | 'openNow'
 * @param {{ lat: number, lng: number }} userCoords
 * @returns {Array} sorted + filtered hospitals, each with .distanceKm added
 */
export function applyFilter(hospitals, filter, userCoords) {
  const withDistance = hospitals.map(h => ({
    ...h,
    distanceKm: userCoords
      ? parseFloat(haversineKm(userCoords.lat, userCoords.lng, h.lat, h.lng).toFixed(1))
      : null,
  }));

  switch (filter) {
    case 'bestRating':
      return [...withDistance].sort((a, b) =>
        b.rating !== a.rating ? b.rating - a.rating : b.reviewCount - a.reviewCount
      );

    case 'nearestDistance':
      return [...withDistance].sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    case 'criticalCapacity':
      return [...withDistance]
        .filter(h => h.rating >= 4.0 && h.reviewCount >= 50)
        .sort((a, b) => b.rating !== a.rating ? b.rating - a.rating : b.reviewCount - a.reviewCount);

    case 'openNow':
      return [...withDistance]
        .filter(h => h.openNow)
        .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    default:
      return withDistance;
  }
}

/**
 * Search nearby hospitals.
 * Swap point: set USE_MOCK_PLACES=false in .env.local to call real Google Places API.
 *
 * @param {{ lat: number, lng: number, filter?: string, radius?: number, specialty?: string }} params
 * @returns {Promise<Array>} list of hospital objects
 */
export async function searchNearbyHospitals({ lat, lng, filter = 'nearestDistance', radius = 5000, specialty = null }) {
  const userCoords = { lat, lng };

  if (process.env.USE_MOCK_PLACES !== 'false') {
    let results = [...INDORE_HOSPITALS];

    if (specialty) {
      const sLower = specialty.toLowerCase();
      const filtered = results.filter(h =>
        h.specialties.some(s => s.toLowerCase().includes(sLower) || sLower.includes(s.toLowerCase()))
      );
      results = filtered.length > 0 ? filtered : results;
    }

    return applyFilter(results, filter, userCoords);
  }

  // ── Real Google Places API (New) v1 ────────────────────────────────────
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const url = 'https://places.googleapis.com/v1/places:searchNearby';

  const body = {
    includedTypes: ['hospital', 'doctor'],
    maxResultCount: 20,
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lng }, radius },
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.nationalPhoneNumber,places.googleMapsUri,places.types',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  const places = (data.places || []).map(p => ({
    id: p.id,
    name: p.displayName?.text || 'Hospital',
    address: p.formattedAddress || '',
    lat: p.location?.latitude,
    lng: p.location?.longitude,
    rating: p.rating || 0,
    reviewCount: p.userRatingCount || 0,
    phone: p.nationalPhoneNumber || '',
    openNow: p.currentOpeningHours?.openNow ?? true,
    availableSlot: 'Call to book',
    consultationFee: null,
    googleMapsUri: p.googleMapsUri || `https://maps.google.com/?q=${encodeURIComponent(p.displayName?.text)}`,
    specialties: (p.types || []).includes('doctor') ? ['General Practitioner'] : ['Multi-Specialty'],
    type: 'Hospital',
  }));

  return applyFilter(places, filter, userCoords);
}
