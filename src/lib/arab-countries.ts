// Re-exports world cinema countries under the legacy arab-* names so existing imports keep working.
// Prefer importing from '@/src/lib/world-countries' for new code.
export {
  type WorldCountryCode as ArabCountryCode,
  type WorldCountryCode,
  WORLD_COUNTRY_CODES as ARAB_COUNTRY_CODES,
  WORLD_COUNTRY_CODES,
  WORLD_TMDB_COUNTRIES as ARAB_TMDB_COUNTRIES,
  WORLD_TMDB_COUNTRIES,
  isWorldCountry as isArabCountry,
  isWorldCountry,
  worldCountryOf as arabCountryOf,
  worldCountryOf,
  worldCountryHref as arabCountryHref,
  worldCountryHref,
  worldCountryName as arabCountryName,
  worldCountryName,
} from '@/src/lib/world-countries'
