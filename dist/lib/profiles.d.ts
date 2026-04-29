import type { Profile } from '@prisma/client';
import { ISO_TO_NAME } from './countries.js';
export declare const VALID_AGE_GROUPS: string[];
export declare const VALID_GENDERS: string[];
export declare const VALID_SORT_BY: string[];
export declare const VALID_ORDERS: string[];
export declare function getAgeGroup(age: number): string;
export declare function formatProfile(p: Profile): {
    id: string;
    name: string;
    gender: string;
    gender_probability: number;
    age: number;
    age_group: string;
    country_id: string;
    country_name: string;
    country_probability: number;
    created_at: string;
};
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
export declare function buildWhere(f: QueryFilters): Record<string, unknown>;
export declare function parsePositiveInt(val: unknown, fallback: number): number | null;
export declare function parseFloat01(val: unknown): number | null | undefined;
export declare function buildPaginationLinks(base: string, page: number, limit: number, total: number, query: Record<string, string>): {
    total_pages: number;
    links: {
        self: string;
        next: string | null;
        prev: string | null;
    };
};
//# sourceMappingURL=profiles.d.ts.map