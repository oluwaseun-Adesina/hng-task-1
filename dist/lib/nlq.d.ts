export interface NLQFilters {
    gender?: string;
    age_group?: string;
    min_age?: number;
    max_age?: number;
    country_id?: string;
}
export declare function parseNLQuery(q: string): NLQFilters | null;
//# sourceMappingURL=nlq.d.ts.map