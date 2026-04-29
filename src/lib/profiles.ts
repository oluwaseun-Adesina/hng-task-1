import type { Profile } from '@prisma/client';
import { ISO_TO_NAME } from './countries.js';

export const VALID_AGE_GROUPS = ['child', 'teenager', 'adult', 'senior'];
export const VALID_GENDERS = ['male', 'female'];
export const VALID_SORT_BY = ['age', 'created_at', 'gender_probability'];
export const VALID_ORDERS = ['asc', 'desc'];

export function getAgeGroup(age: number): string {
  if (age <= 12) return 'child';
  if (age <= 19) return 'teenager';
  if (age <= 59) return 'adult';
  return 'senior';
}

export function formatProfile(p: Profile) {
  return {
    id: p.id,
    name: p.name,
    gender: p.gender,
    gender_probability: p.gender_probability,
    age: p.age,
    age_group: p.age_group,
    country_id: p.country_id,
    country_name: p.country_name,
    country_probability: p.country_probability,
    created_at: p.created_at.toISOString(),
  };
}

export { ISO_TO_NAME };

export interface QueryFilters {
  gender?: string;
  age_group?: string;
  country_id?: string;
  min_age?: number;
  max_age?: number;
  min_gender_probability?: number;
  min_country_probability?: number;
}

export function buildWhere(f: QueryFilters) {
  const where: Record<string, unknown> = {};
  if (f.gender) where['gender'] = { equals: f.gender, mode: 'insensitive' };
  if (f.age_group) where['age_group'] = { equals: f.age_group, mode: 'insensitive' };
  if (f.country_id) where['country_id'] = { equals: f.country_id.toUpperCase() };
  if (f.min_age !== undefined || f.max_age !== undefined) {
    const age: Record<string, number> = {};
    if (f.min_age !== undefined) age['gte'] = f.min_age;
    if (f.max_age !== undefined) age['lte'] = f.max_age;
    where['age'] = age;
  }
  if (f.min_gender_probability !== undefined) {
    where['gender_probability'] = { gte: f.min_gender_probability };
  }
  if (f.min_country_probability !== undefined) {
    where['country_probability'] = { gte: f.min_country_probability };
  }
  return where;
}

export function parsePositiveInt(val: unknown, fallback: number): number | null {
  if (val === undefined || val === null) return fallback;
  const n = parseInt(String(val), 10);
  return isNaN(n) || n < 1 ? null : n;
}

export function parseFloat01(val: unknown): number | null | undefined {
  if (val === undefined) return undefined;
  const n = parseFloat(String(val));
  if (isNaN(n) || n < 0 || n > 1) return null;
  return n;
}

export function buildPaginationLinks(
  base: string,
  page: number,
  limit: number,
  total: number,
  query: Record<string, string>
) {
  const totalPages = Math.ceil(total / limit);
  const makeUrl = (p: number) => {
    const params = new URLSearchParams({ ...query, page: String(p), limit: String(limit) });
    return `${base}?${params.toString()}`;
  };
  return {
    total_pages: totalPages,
    links: {
      self: makeUrl(page),
      next: page < totalPages ? makeUrl(page + 1) : null,
      prev: page > 1 ? makeUrl(page - 1) : null,
    },
  };
}
