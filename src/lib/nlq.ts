import { resolveCountry } from './countries.js';

export interface NLQFilters {
  gender?: string;
  age_group?: string;
  min_age?: number;
  max_age?: number;
  country_id?: string;
}

export function parseNLQuery(q: string): NLQFilters | null {
  const lower = q.toLowerCase().trim();
  if (!lower) return null;

  const filters: NLQFilters = {};
  let matched = false;

  const hasMale = /\b(males?|men|man|boys?)\b/.test(lower);
  const hasFemale = /\b(females?|women|woman|girls?)\b/.test(lower);
  if (hasMale && !hasFemale) {
    filters.gender = 'male';
    matched = true;
  } else if (hasFemale && !hasMale) {
    filters.gender = 'female';
    matched = true;
  } else if (hasMale && hasFemale) {
    matched = true;
  }

  if (/\byoung\b/.test(lower)) {
    filters.min_age = 16;
    filters.max_age = 24;
    matched = true;
  }

  if (/\bchildren?\b/.test(lower)) {
    filters.age_group = 'child';
    matched = true;
  } else if (/\bteen(ager)?s?\b/.test(lower)) {
    filters.age_group = 'teenager';
    matched = true;
  } else if (/\badults?\b/.test(lower)) {
    filters.age_group = 'adult';
    matched = true;
  } else if (/\b(seniors?|elderly)\b/.test(lower)) {
    filters.age_group = 'senior';
    matched = true;
  }

  const aboveMatch = lower.match(/\b(?:above|over|older than)\s+(\d+)\b/);
  if (aboveMatch) {
    filters.min_age = parseInt(aboveMatch[1] ?? '0', 10);
    if (filters.max_age !== undefined && filters.min_age > (filters.max_age ?? 0)) {
      delete filters.max_age;
    }
    matched = true;
  }

  const belowMatch = lower.match(/\b(?:below|under|younger than)\s+(\d+)\b/);
  if (belowMatch) {
    filters.max_age = parseInt(belowMatch[1] ?? '0', 10);
    matched = true;
  }

  const countryCode = resolveCountry(lower);
  if (countryCode) {
    filters.country_id = countryCode;
    matched = true;
  }

  return matched ? filters : null;
}
