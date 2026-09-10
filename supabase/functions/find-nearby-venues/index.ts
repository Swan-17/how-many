import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    const key = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!key) throw new Error('GOOGLE_MAPS_API_KEY is not configured.');
    if (!query?.trim()) throw new Error('Search query is required.');

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': key,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.primaryType'
      },
      body: JSON.stringify({ textQuery: query.trim(), pageSize: 10 }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Google Places request failed (${response.status}): ${detail}`);
    }

    const payload = await response.json();
    const places = (payload.places || []).map((place: any) => ({
      placeId: place.id,
      name: place.displayName?.text || 'Unknown venue',
      address: place.formattedAddress || '',
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      googleMapsUri: place.googleMapsUri || '',
      primaryType: place.primaryType || '',
    }));

    return new Response(JSON.stringify({ places }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error?.message || 'Unexpected error.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
