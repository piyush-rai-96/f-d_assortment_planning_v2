/**
 * Store coordinate registry used by geographic visualizations.
 *
 * Future updates:
 * 1. Add or replace a record using the store's numeric `storeId`.
 * 2. Supply decimal-degree `latitude` and `longitude`.
 * 3. Set `accuracy` to "verified" when coordinates are confirmed.
 *
 * The map joins these records to store metadata by `storeId`, so no map
 * component changes are required when the network or coordinates change.
 */
export const STORE_COORDINATES = [
  { storeId: 104, storeName: "Dallas",          state: "TX", latitude: 32.78,   longitude: -96.80,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 131, storeName: "Mesquite",        state: "TX", latitude: 32.77,   longitude: -96.61,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 240, storeName: "South Austin",    state: "TX", latitude: 30.22,   longitude: -97.78,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 107, storeName: "Almeda",          state: "TX", latitude: 29.65,   longitude: -95.42,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 376, storeName: "SW San Antonio",  state: "TX", latitude: 29.42,   longitude: -98.49,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 101, storeName: "I-85",            state: "GA", latitude: 33.75,   longitude: -84.39,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 160, storeName: "Mall of Georgia", state: "GA", latitude: 34.12,   longitude: -84.00,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 152, storeName: "Savannah",        state: "GA", latitude: 32.08,   longitude: -81.10,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 360, storeName: "Davie",           state: "FL", latitude: 26.07,   longitude: -80.24,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 173, storeName: "Riviera Beach",   state: "FL", latitude: 26.78,   longitude: -80.06,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 286, storeName: "West Hartford",   state: "CT", latitude: 41.76,   longitude: -72.74,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 237, storeName: "Nashua",          state: "NH", latitude: 42.77,   longitude: -71.47,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 344, storeName: "Allentown",       state: "PA", latitude: 40.61,   longitude: -75.49,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 184, storeName: "Farmingdale",     state: "NY", latitude: 40.73,   longitude: -73.45,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 236, storeName: "Toms River",      state: "NJ", latitude: 39.95,   longitude: -74.20,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 205, storeName: "Denver",          state: "CO", latitude: 39.74,   longitude: -104.98,  status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 358, storeName: "North Seattle",   state: "WA", latitude: 47.61,   longitude: -122.33,  status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 341, storeName: "Bremerton",       state: "WA", latitude: 47.57,   longitude: -122.63,  status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 294, storeName: "Lexington",       state: "KY", latitude: 38.05,   longitude: -84.50,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 356, storeName: "Deerfield",       state: "IL", latitude: 42.17,   longitude: -87.84,   status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 129, storeName: "Santa Ana",       state: "CA", latitude: 33.75,   longitude: -117.87,  status: "existing", accuracy: "approximate", source: "seed-data" },
  { storeId: 381, storeName: "Billings",        state: "MT", latitude: 45.7833, longitude: -108.5007, status: "new",      accuracy: "approximate", source: "planning-input" },
];

export const STORE_COORDINATES_BY_ID = new Map(
  STORE_COORDINATES.map((record) => [String(record.storeId), record]),
);

export function getStoreCoordinates(storeId) {
  return STORE_COORDINATES_BY_ID.get(String(storeId)) || null;
}
