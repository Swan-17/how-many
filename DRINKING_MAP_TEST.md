# Drinking Map test environment

This branch contains the test implementation for location-linked drinking destinations.

## Setup

1. Apply `supabase/drinking_map.sql` to the test Supabase database.
2. Deploy `supabase/functions/find-nearby-venues/index.ts` as the `find-nearby-venues` Edge Function.
3. Add `GOOGLE_MAPS_API_KEY` as an Edge Function secret. Do not commit the key.
4. Enable Google Places API (New) for the test Google Cloud project.
5. Open the branch deployment over HTTPS and grant browser location permission.
6. Set a drinking venue, confirm the suggested pub, log drinks, then inspect the Map tab.

The app intentionally asks the user to confirm the venue instead of silently choosing one from GPS.
