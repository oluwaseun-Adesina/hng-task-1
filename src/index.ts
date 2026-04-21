import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import axios from 'axios';
import cors from 'cors';
import { uuidv7 } from 'uuidv7';
import { PrismaClient, type Profile } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// ── ISO code → country name ──────────────────────────────────────────────────
const ISO_TO_NAME: Record<string, string> = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AO: 'Angola', AR: 'Argentina',
  AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan', BH: 'Bahrain', BD: 'Bangladesh',
  BY: 'Belarus', BE: 'Belgium', BJ: 'Benin', BO: 'Bolivia', BA: 'Bosnia and Herzegovina',
  BW: 'Botswana', BR: 'Brazil', BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi',
  KH: 'Cambodia', CM: 'Cameroon', CA: 'Canada', CV: 'Cape Verde', CF: 'Central African Republic',
  TD: 'Chad', CL: 'Chile', CN: 'China', CO: 'Colombia', CG: 'Congo',
  CD: 'Democratic Republic of Congo', CR: 'Costa Rica', CI: "Côte d'Ivoire", HR: 'Croatia',
  CU: 'Cuba', CY: 'Cyprus', CZ: 'Czech Republic', DK: 'Denmark', DJ: 'Djibouti',
  DO: 'Dominican Republic', EC: 'Ecuador', EG: 'Egypt', SV: 'El Salvador', GQ: 'Equatorial Guinea',
  ER: 'Eritrea', EE: 'Estonia', ET: 'Ethiopia', FI: 'Finland', FR: 'France',
  GA: 'Gabon', GM: 'Gambia', GE: 'Georgia', DE: 'Germany', GH: 'Ghana',
  GR: 'Greece', GT: 'Guatemala', GN: 'Guinea', GW: 'Guinea-Bissau', HT: 'Haiti',
  HN: 'Honduras', HU: 'Hungary', IN: 'India', ID: 'Indonesia', IR: 'Iran',
  IQ: 'Iraq', IE: 'Ireland', IL: 'Israel', IT: 'Italy', JM: 'Jamaica',
  JP: 'Japan', JO: 'Jordan', KZ: 'Kazakhstan', KE: 'Kenya', KW: 'Kuwait',
  KG: 'Kyrgyzstan', LA: 'Laos', LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia',
  LY: 'Libya', LT: 'Lithuania', LU: 'Luxembourg', MG: 'Madagascar', MW: 'Malawi',
  MY: 'Malaysia', ML: 'Mali', MR: 'Mauritania', MU: 'Mauritius', MX: 'Mexico',
  MD: 'Moldova', MN: 'Mongolia', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar',
  NA: 'Namibia', NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand', NI: 'Nicaragua',
  NE: 'Niger', NG: 'Nigeria', NO: 'Norway', OM: 'Oman', PK: 'Pakistan',
  PA: 'Panama', PY: 'Paraguay', PE: 'Peru', PH: 'Philippines', PL: 'Poland',
  PT: 'Portugal', QA: 'Qatar', RO: 'Romania', RU: 'Russia', RW: 'Rwanda',
  SA: 'Saudi Arabia', SN: 'Senegal', RS: 'Serbia', SL: 'Sierra Leone', SO: 'Somalia',
  ZA: 'South Africa', SS: 'South Sudan', ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan',
  SZ: 'Eswatini', SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan',
  TJ: 'Tajikistan', TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste', TG: 'Togo',
  TN: 'Tunisia', TR: 'Turkey', TM: 'Turkmenistan', UG: 'Uganda', UA: 'Ukraine',
  AE: 'United Arab Emirates', GB: 'United Kingdom', US: 'United States', UY: 'Uruguay',
  UZ: 'Uzbekistan', VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia',
  ZW: 'Zimbabwe', KM: 'Comoros', SC: 'Seychelles', ST: 'São Tomé and Príncipe',
  EH: 'Western Sahara', MK: 'North Macedonia', SK: 'Slovakia', SI: 'Slovenia',
  FJ: 'Fiji', PG: 'Papua New Guinea', SB: 'Solomon Islands',
};

// Country name → ISO code (lowercase keys for NLQ matching)
const NAME_TO_ISO: Record<string, string> = Object.fromEntries(
  Object.entries(ISO_TO_NAME).map(([code, name]) => [name.toLowerCase(), code])
);
// Extra aliases
const COUNTRY_ALIASES: Record<string, string> = {
  'nigeria': 'NG', 'kenya': 'KE', 'tanzania': 'TZ', 'ghana': 'GH', 'ethiopia': 'ET',
  'angola': 'AO', 'benin': 'BJ', 'cameroon': 'CM', 'senegal': 'SN', 'mali': 'ML',
  'burkina faso': 'BF', 'zimbabwe': 'ZW', 'mozambique': 'MZ', 'zambia': 'ZM',
  'malawi': 'MW', 'rwanda': 'RW', 'uganda': 'UG', 'south africa': 'ZA', 'egypt': 'EG',
  'morocco': 'MA', 'algeria': 'DZ', 'tunisia': 'TN', 'sudan': 'SD', 'south sudan': 'SS',
  'chad': 'TD', 'niger': 'NE', 'somalia': 'SO', 'eritrea': 'ER', 'djibouti': 'DJ',
  'madagascar': 'MG', 'mauritius': 'MU', 'cape verde': 'CV', 'gabon': 'GA',
  'congo': 'CG', 'dr congo': 'CD', 'drc': 'CD', 'democratic republic of congo': 'CD',
  'central african republic': 'CF', 'equatorial guinea': 'GQ', 'liberia': 'LR',
  'sierra leone': 'SL', 'guinea': 'GN', "guinea-bissau": 'GW', 'gambia': 'GM',
  'togo': 'TG', 'mauritania': 'MR', 'libya': 'LY', 'namibia': 'NA', 'botswana': 'BW',
  'eswatini': 'SZ', 'swaziland': 'SZ', 'lesotho': 'LS', "cote d'ivoire": 'CI',
  'ivory coast': 'CI', 'usa': 'US', 'united states': 'US', 'uk': 'GB',
  'united kingdom': 'GB', 'france': 'FR', 'germany': 'DE', 'india': 'IN',
  'china': 'CN', 'brazil': 'BR', 'canada': 'CA', 'australia': 'AU', 'japan': 'JP',
  'italy': 'IT', 'spain': 'ES', 'portugal': 'PT', 'russia': 'RU', 'indonesia': 'ID',
  'pakistan': 'PK', 'bangladesh': 'BD', 'mexico': 'MX', 'philippines': 'PH',
  'burundi': 'BI', 'comoros': 'KM', 'seychelles': 'SC',
};

const VALID_AGE_GROUPS = ['child', 'teenager', 'adult', 'senior'];
const VALID_GENDERS = ['male', 'female'];
const VALID_SORT_BY = ['age', 'created_at', 'gender_probability'];
const VALID_ORDERS = ['asc', 'desc'];

// ── Helpers ──────────────────────────────────────────────────────────────────

const getAgeGroup = (age: number): string => {
  if (age <= 12) return 'child';
  if (age <= 19) return 'teenager';
  if (age <= 59) return 'adult';
  return 'senior';
};

const formatProfile = (p: Profile) => ({
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
});

const mapExternalError = (externalApi: string, res: Response) =>
  res.status(502).json({ status: 'error', message: `${externalApi} returned an invalid response` });

// ── Natural language query parser ────────────────────────────────────────────

interface NLQFilters {
  gender?: string;
  age_group?: string;
  min_age?: number;
  max_age?: number;
  country_id?: string;
}

function resolveCountry(lower: string): string | undefined {
  // Check aliases first (longer matches first to avoid partial matches)
  const aliases = Object.entries({ ...NAME_TO_ISO, ...COUNTRY_ALIASES })
    .sort((a, b) => b[0].length - a[0].length);
  for (const [name, code] of aliases) {
    if (lower.includes(name)) return code;
  }
  return undefined;
}

function parseNLQuery(q: string): NLQFilters | null {
  const lower = q.toLowerCase().trim();
  if (!lower) return null;

  const filters: NLQFilters = {};
  let matched = false;

  // Gender detection (handle "male and female" → no gender filter)
  const hasMale = /\b(males?|men|man|boys?)\b/.test(lower);
  const hasFemale = /\b(females?|women|woman|girls?)\b/.test(lower);
  if (hasMale && !hasFemale) {
    filters.gender = 'male';
    matched = true;
  } else if (hasFemale && !hasMale) {
    filters.gender = 'female';
    matched = true;
  } else if (hasMale && hasFemale) {
    matched = true; // both mentioned → no gender filter
  }

  // "young" → ages 16–24 (parsing only, not a stored age group)
  if (/\byoung\b/.test(lower)) {
    filters.min_age = 16;
    filters.max_age = 24;
    matched = true;
  }

  // Age group keywords
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

  // Explicit age range: "above X", "over X", "older than X"
  const aboveMatch = lower.match(/\b(?:above|over|older than)\s+(\d+)\b/);
  if (aboveMatch) {
    filters.min_age = parseInt(aboveMatch[1] ?? '0', 10);
    // override "young" max if explicit min is set
    if (filters.max_age !== undefined && filters.min_age > (filters.max_age ?? 0)) {
      delete filters.max_age;
    }
    matched = true;
  }

  // Explicit age range: "below X", "under X", "younger than X"
  const belowMatch = lower.match(/\b(?:below|under|younger than)\s+(\d+)\b/);
  if (belowMatch) {
    filters.max_age = parseInt(belowMatch[1] ?? '0', 10);
    matched = true;
  }

  // Country detection
  const countryCode = resolveCountry(lower);
  if (countryCode) {
    filters.country_id = countryCode;
    matched = true;
  }

  return matched ? filters : null;
}

// ── Filter builder for Prisma ─────────────────────────────────────────────────

interface QueryFilters {
  gender?: string;
  age_group?: string;
  country_id?: string;
  min_age?: number;
  max_age?: number;
  min_gender_probability?: number;
  min_country_probability?: number;
}

function buildWhere(f: QueryFilters) {
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

function parsePositiveInt(val: unknown, fallback: number): number | null {
  if (val === undefined || val === null) return fallback;
  const n = parseInt(String(val), 10);
  return isNaN(n) || n < 1 ? null : n;
}

function parseFloat01(val: unknown): number | null | undefined {
  if (val === undefined) return undefined;
  const n = parseFloat(String(val));
  if (isNaN(n) || n < 0 || n > 1) return null;
  return n;
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/profiles
app.post('/api/profiles', async (req: Request, res: Response) => {
  const { name } = req.body as { name?: unknown };

  if (name === undefined || name === null || name === '') {
    return res.status(400).json({ status: 'error', message: 'Missing or empty name' });
  }
  if (typeof name !== 'string') {
    return res.status(422).json({ status: 'error', message: 'Invalid type for name' });
  }

  const normalizedName = name.trim();
  if (!normalizedName) {
    return res.status(400).json({ status: 'error', message: 'Missing or empty name' });
  }

  try {
    const existing = await prisma.profile.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });
    if (existing) {
      return res.status(200).json({ status: 'success', message: 'Profile already exists', data: formatProfile(existing) });
    }

    const [genderizeRes, agifyRes, nationalizeRes] = await Promise.all([
      axios.get(`https://api.genderize.io?name=${encodeURIComponent(normalizedName)}`),
      axios.get(`https://api.agify.io?name=${encodeURIComponent(normalizedName)}`),
      axios.get(`https://api.nationalize.io?name=${encodeURIComponent(normalizedName)}`),
    ]);

    const genderData = genderizeRes.data as Record<string, unknown>;
    const ageData = agifyRes.data as Record<string, unknown>;
    const countryData = nationalizeRes.data as Record<string, unknown>;

    if (!genderData?.gender || genderData['count'] === 0) return mapExternalError('Genderize', res);
    if (ageData['age'] === null || ageData['age'] === undefined) return mapExternalError('Agify', res);
    if (!Array.isArray(countryData['country']) || (countryData['country'] as unknown[]).length === 0) {
      return mapExternalError('Nationalize', res);
    }

    const gender = String(genderData['gender']);
    const gender_probability = Number(genderData['probability']);
    const age = Number(ageData['age']);
    const age_group = getAgeGroup(age);

    const countries = countryData['country'] as Array<{ country_id: string; probability: number }>;
    const best = countries.reduce((a, b) => b.probability > a.probability ? b : a);
    if (!best?.country_id) return mapExternalError('Nationalize', res);

    const country_id = String(best.country_id).toUpperCase();
    const country_name = ISO_TO_NAME[country_id] ?? country_id;
    const country_probability = Number(best.probability);

    const created = await prisma.profile.create({
      data: { id: uuidv7(), name: normalizedName, gender, gender_probability, age, age_group, country_id, country_name, country_probability },
    });

    return res.status(201).json({ status: 'success', data: formatProfile(created) });
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      const url = error.config?.url ?? '';
      if (url.includes('genderize.io')) return mapExternalError('Genderize', res);
      if (url.includes('agify.io')) return mapExternalError('Agify', res);
      if (url.includes('nationalize.io')) return mapExternalError('Nationalize', res);
    }
    console.error('POST /api/profiles error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/profiles/search  ← must be before /:id
app.get('/api/profiles/search', async (req: Request, res: Response) => {
  const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';

  if (!q) {
    return res.status(400).json({ status: 'error', message: 'Missing or empty query parameter q' });
  }

  // Pagination
  const page = parsePositiveInt(req.query['page'], 1);
  const limitRaw = parsePositiveInt(req.query['limit'], 10);
  if (page === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  if (limitRaw === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  const limit = Math.min(limitRaw, 50);

  const nlqFilters = parseNLQuery(q);
  if (!nlqFilters) {
    return res.status(200).json({ status: 'error', message: 'Unable to interpret query' });
  }

  try {
    const where = buildWhere(nlqFilters);
    const [total, profiles] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.status(200).json({
      status: 'success',
      page,
      limit,
      total,
      data: profiles.map(formatProfile),
    });
  } catch (error) {
    console.error('GET /api/profiles/search error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/profiles/:id
app.get('/api/profiles/:id', async (req: Request, res: Response) => {
  const id = String(req.params['id']);
  try {
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });
    return res.status(200).json({ status: 'success', data: formatProfile(profile) });
  } catch (error) {
    console.error('GET /api/profiles/:id error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/profiles
app.get('/api/profiles', async (req: Request, res: Response) => {
  const q = req.query;

  // Extract and validate filters
  const gender = typeof q['gender'] === 'string' ? q['gender'].trim().toLowerCase() : undefined;
  const age_group = typeof q['age_group'] === 'string' ? q['age_group'].trim().toLowerCase() : undefined;
  const country_id = typeof q['country_id'] === 'string' ? q['country_id'].trim() : undefined;
  const sort_by = typeof q['sort_by'] === 'string' ? q['sort_by'].trim() : undefined;
  const order = typeof q['order'] === 'string' ? q['order'].trim().toLowerCase() : 'desc';

  // Validate enum params
  if (gender !== undefined && !VALID_GENDERS.includes(gender)) {
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  }
  if (age_group !== undefined && !VALID_AGE_GROUPS.includes(age_group)) {
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  }
  if (sort_by !== undefined && !VALID_SORT_BY.includes(sort_by)) {
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  }
  if (!VALID_ORDERS.includes(order)) {
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  }

  // Numeric filters
  const minAgeRaw = q['min_age'];
  const maxAgeRaw = q['max_age'];
  const minGPRaw = q['min_gender_probability'];
  const minCPRaw = q['min_country_probability'];

  let min_age: number | undefined;
  let max_age: number | undefined;
  let min_gender_probability: number | undefined;
  let min_country_probability: number | undefined;

  if (minAgeRaw !== undefined) {
    const v = parseInt(String(minAgeRaw), 10);
    if (isNaN(v) || v < 0) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
    min_age = v;
  }
  if (maxAgeRaw !== undefined) {
    const v = parseInt(String(maxAgeRaw), 10);
    if (isNaN(v) || v < 0) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
    max_age = v;
  }
  if (minGPRaw !== undefined) {
    const v = parseFloat01(minGPRaw);
    if (v === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
    if (v !== undefined) min_gender_probability = v;
  }
  if (minCPRaw !== undefined) {
    const v = parseFloat01(minCPRaw);
    if (v === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
    if (v !== undefined) min_country_probability = v;
  }

  // Pagination
  const page = parsePositiveInt(q['page'], 1);
  const limitRaw = parsePositiveInt(q['limit'], 10);
  if (page === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  if (limitRaw === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  const limit = Math.min(limitRaw, 50);

  try {
    const filters: QueryFilters = {};
    if (gender !== undefined) filters.gender = gender;
    if (age_group !== undefined) filters.age_group = age_group;
    if (country_id !== undefined) filters.country_id = country_id;
    if (min_age !== undefined) filters.min_age = min_age;
    if (max_age !== undefined) filters.max_age = max_age;
    if (min_gender_probability !== undefined) filters.min_gender_probability = min_gender_probability;
    if (min_country_probability !== undefined) filters.min_country_probability = min_country_probability;
    const where = buildWhere(filters);

    const resolvedSortBy = sort_by ?? 'created_at';
    const orderBy: Record<string, string> = { [resolvedSortBy]: order };

    const [total, profiles] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.status(200).json({
      status: 'success',
      page,
      limit,
      total,
      data: profiles.map(formatProfile),
    });
  } catch (error) {
    console.error('GET /api/profiles error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// DELETE /api/profiles/:id
app.delete('/api/profiles/:id', async (req: Request, res: Response) => {
  const id = String(req.params['id']);
  try {
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });
    await prisma.profile.delete({ where: { id } });
    return res.status(204).send();
  } catch (error) {
    console.error('DELETE /api/profiles/:id error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
