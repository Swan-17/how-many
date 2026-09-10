const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  try {
    const key = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!key) throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    const body = await req.json();
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const radius = Math.min(Math.max(Number(body.radius || 120), 50), 500);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Valid latitude and longitude are required');
    const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.primaryType' },
      body: JSON.stringify({ includedTypes: ['bar', 'pub'], maxResultCount: 10, rankPreference: 'DISTANCE', locationRestriction: { circle: { center: { latitude, longitude }, radius } } }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || 'Google Places request failed');
    const places = (payload.places || []).map((place: any) => ({ id: place.id, name: place.displayName?.text || 'Unknown venue', address: place.formattedAddress || '', latitude: place.location?.latitude, longitude: place.location?.longitude, googleMapsUri: place.googleMapsUri || null, primaryType: place.primaryType || null }));
    return new Response(JSON.stringify({ places }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
