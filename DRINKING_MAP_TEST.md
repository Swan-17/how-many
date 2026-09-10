# Drinking Map test environment

This branch contains the test implementation for pub check-in.

## Setup

1. Apply `supabase/drinking_map.sql` to the test Supabase database.
2. Deploy `supabase/functions/find-nearby-venues/index.ts` as the `find-nearby-venues` Edge Function.
3. Add `GOOGLE_MAPS_API_KEY` as an Edge Function secret. Do not commit the key.
4. Enable Google Places API (New) for the test Google Cloud project.
5. Open the branch deployment over HTTPS.
6. On Tracker, press **Check in at a pub**. The Pub tab opens, search for the pub, then tap the matching venue to log the check-in.

No map, GPS lookup, or popular-spots list is used in this test flow.
