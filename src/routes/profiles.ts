import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { uuidv7 } from 'uuidv7';
import { prisma } from '../lib/db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { requireApiVersion } from '../middleware/apiVersion.js';
import {
  formatProfile,
  getAgeGroup,
  ISO_TO_NAME,
  buildWhere,
  parsePositiveInt,
  parseFloat01,
  buildPaginationLinks,
  VALID_AGE_GROUPS,
  VALID_GENDERS,
  VALID_SORT_BY,
  VALID_ORDERS,
  type QueryFilters,
} from '../lib/profiles.js';

const router = Router();

// All profile routes require auth + API version header
router.use(requireAuth, requireApiVersion);

const mapExternalError = (api: string, res: Response) =>
  res.status(502).json({ status: 'error', message: `${api} returned an invalid response` });

// GET /api/profiles/export — must be before /:id
router.get('/export', async (req: Request, res: Response) => {
  const q = req.query;
  const gender = typeof q['gender'] === 'string' ? q['gender'].trim().toLowerCase() : undefined;
  const age_group = typeof q['age_group'] === 'string' ? q['age_group'].trim().toLowerCase() : undefined;
  const country_id = typeof q['country_id'] === 'string' ? q['country_id'].trim() : undefined;
  const sort_by = typeof q['sort_by'] === 'string' ? q['sort_by'].trim() : undefined;
  const order = typeof q['order'] === 'string' ? q['order'].trim().toLowerCase() : 'desc';

  if (gender !== undefined && !VALID_GENDERS.includes(gender))
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  if (age_group !== undefined && !VALID_AGE_GROUPS.includes(age_group))
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  if (sort_by !== undefined && !VALID_SORT_BY.includes(sort_by))
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  if (!VALID_ORDERS.includes(order))
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });

  const filters: QueryFilters = {};
  if (gender) filters.gender = gender;
  if (age_group) filters.age_group = age_group;
  if (country_id) filters.country_id = country_id;

  const minAge = q['min_age'] !== undefined ? parseInt(String(q['min_age']), 10) : undefined;
  const maxAge = q['max_age'] !== undefined ? parseInt(String(q['max_age']), 10) : undefined;
  if (minAge !== undefined && !isNaN(minAge)) filters.min_age = minAge;
  if (maxAge !== undefined && !isNaN(maxAge)) filters.max_age = maxAge;

  const where = buildWhere(filters);
  const resolvedSortBy = sort_by ?? 'created_at';

  try {
    const profiles = await prisma.profile.findMany({
      where,
      orderBy: { [resolvedSortBy]: order },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `profiles_${timestamp}.csv`;
    const headers = ['id', 'name', 'gender', 'gender_probability', 'age', 'age_group', 'country_id', 'country_name', 'country_probability', 'created_at'];
    const rows = profiles.map(p =>
      [p.id, p.name, p.gender, p.gender_probability, p.age, p.age_group, p.country_id, p.country_name, p.country_probability, p.created_at.toISOString()]
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err) {
    console.error('GET /api/profiles/export error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/profiles/search — must be before /:id
router.get('/search', async (req: Request, res: Response) => {
  const { parseNLQuery } = await import('../lib/nlq.js');
  const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';

  if (!q) return res.status(400).json({ status: 'error', message: 'Missing or empty query parameter q' });

  const page = parsePositiveInt(req.query['page'], 1);
  const limitRaw = parsePositiveInt(req.query['limit'], 10);
  if (page === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  if (limitRaw === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  const limit = Math.min(limitRaw, 50);

  const nlqFilters = parseNLQuery(q);
  if (!nlqFilters) return res.status(200).json({ status: 'error', message: 'Unable to interpret query' });

  try {
    const where = buildWhere(nlqFilters);
    const [total, profiles] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({ where, orderBy: { created_at: 'desc' }, skip: (page - 1) * limit, take: limit }),
    ]);

    const { total_pages, links } = buildPaginationLinks('/api/profiles/search', page, limit, total, { q });

    return res.status(200).json({
      status: 'success',
      page,
      limit,
      total,
      total_pages,
      links,
      data: profiles.map(formatProfile),
    });
  } catch (err) {
    console.error('GET /api/profiles/search error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/profiles/:id
router.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params['id']);
  try {
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });
    return res.json({ status: 'success', data: formatProfile(profile) });
  } catch (err) {
    console.error('GET /api/profiles/:id error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/profiles
router.get('/', async (req: Request, res: Response) => {
  const q = req.query;
  const gender = typeof q['gender'] === 'string' ? q['gender'].trim().toLowerCase() : undefined;
  const age_group = typeof q['age_group'] === 'string' ? q['age_group'].trim().toLowerCase() : undefined;
  const country_id = typeof q['country_id'] === 'string' ? q['country_id'].trim() : undefined;
  const sort_by = typeof q['sort_by'] === 'string' ? q['sort_by'].trim() : undefined;
  const order = typeof q['order'] === 'string' ? q['order'].trim().toLowerCase() : 'desc';

  if (gender !== undefined && !VALID_GENDERS.includes(gender))
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  if (age_group !== undefined && !VALID_AGE_GROUPS.includes(age_group))
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  if (sort_by !== undefined && !VALID_SORT_BY.includes(sort_by))
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  if (!VALID_ORDERS.includes(order))
    return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });

  let min_age: number | undefined;
  let max_age: number | undefined;
  let min_gender_probability: number | undefined;
  let min_country_probability: number | undefined;

  if (q['min_age'] !== undefined) {
    const v = parseInt(String(q['min_age']), 10);
    if (isNaN(v) || v < 0) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
    min_age = v;
  }
  if (q['max_age'] !== undefined) {
    const v = parseInt(String(q['max_age']), 10);
    if (isNaN(v) || v < 0) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
    max_age = v;
  }
  if (q['min_gender_probability'] !== undefined) {
    const v = parseFloat01(q['min_gender_probability']);
    if (v === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
    if (v !== undefined) min_gender_probability = v;
  }
  if (q['min_country_probability'] !== undefined) {
    const v = parseFloat01(q['min_country_probability']);
    if (v === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
    if (v !== undefined) min_country_probability = v;
  }

  const page = parsePositiveInt(q['page'], 1);
  const limitRaw = parsePositiveInt(q['limit'], 10);
  if (page === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  if (limitRaw === null) return res.status(422).json({ status: 'error', message: 'Invalid query parameters' });
  const limit = Math.min(limitRaw, 50);

  try {
    const filters: QueryFilters = {};
    if (gender) filters.gender = gender;
    if (age_group) filters.age_group = age_group;
    if (country_id) filters.country_id = country_id;
    if (min_age !== undefined) filters.min_age = min_age;
    if (max_age !== undefined) filters.max_age = max_age;
    if (min_gender_probability !== undefined) filters.min_gender_probability = min_gender_probability;
    if (min_country_probability !== undefined) filters.min_country_probability = min_country_probability;

    const where = buildWhere(filters);
    const resolvedSortBy = sort_by ?? 'created_at';

    const [total, profiles] = await Promise.all([
      prisma.profile.count({ where }),
      prisma.profile.findMany({ where, orderBy: { [resolvedSortBy]: order }, skip: (page - 1) * limit, take: limit }),
    ]);

    const queryRecord: Record<string, string> = {};
    if (gender) queryRecord['gender'] = gender;
    if (age_group) queryRecord['age_group'] = age_group;
    if (country_id) queryRecord['country_id'] = country_id;
    if (sort_by) queryRecord['sort_by'] = sort_by;
    if (order !== 'desc') queryRecord['order'] = order;

    const { total_pages, links } = buildPaginationLinks('/api/profiles', page, limit, total, queryRecord);

    return res.json({
      status: 'success',
      page,
      limit,
      total,
      total_pages,
      links,
      data: profiles.map(formatProfile),
    });
  } catch (err) {
    console.error('GET /api/profiles error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/profiles — admin only
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  const { name } = req.body as { name?: unknown };

  if (name === undefined || name === null || name === '')
    return res.status(400).json({ status: 'error', message: 'Missing or empty name' });
  if (typeof name !== 'string')
    return res.status(422).json({ status: 'error', message: 'Invalid type for name' });

  const normalizedName = name.trim();
  if (!normalizedName)
    return res.status(400).json({ status: 'error', message: 'Missing or empty name' });

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

    if (!genderData?.['gender'] || genderData['count'] === 0) return mapExternalError('Genderize', res);
    if (ageData['age'] === null || ageData['age'] === undefined) return mapExternalError('Agify', res);
    if (!Array.isArray(countryData['country']) || (countryData['country'] as unknown[]).length === 0)
      return mapExternalError('Nationalize', res);

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

// DELETE /api/profiles/:id — admin only
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  const id = String(req.params['id']);
  try {
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) return res.status(404).json({ status: 'error', message: 'Profile not found' });
    await prisma.profile.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /api/profiles/:id error:', err);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;
