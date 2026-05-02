import { NextResponse } from 'next/server';
import { searchNearbyHospitals } from '@/lib/places/client';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));
    const filter = searchParams.get('filter') || 'nearestDistance';
    const specialty = searchParams.get('specialty') || null;
    const radius = parseInt(searchParams.get('radius') || '5000');

    if (isNaN(lat) || isNaN(lng)) {
      // Return all hospitals with Indore center if no coords given
      const fallback = await searchNearbyHospitals({
        lat: 22.7196,
        lng: 75.8577,
        filter,
        radius,
        specialty,
      });
      return NextResponse.json({ hospitals: fallback, usingFallback: true });
    }

    const hospitals = await searchNearbyHospitals({ lat, lng, filter, radius, specialty });
    return NextResponse.json({ hospitals });
  } catch (error) {
    console.error('[Doctors Nearby API]', error.message);
    return NextResponse.json({ error: 'Failed to fetch hospitals' }, { status: 500 });
  }
}
