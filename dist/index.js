import 'dotenv/config';
import express, {} from 'express';
import axios from 'axios';
import cors from 'cors';
import { uuidv7 } from 'uuidv7';
import { PrismaClient } from '@prisma/client';
const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;
app.use(cors({ origin: '*' }));
app.use(express.json());
const getAgeGroup = (age) => {
    if (age <= 12)
        return 'child';
    if (age <= 19)
        return 'teenager';
    if (age <= 59)
        return 'adult';
    return 'senior';
};
const formatProfile = (profile) => ({
    id: profile.id,
    name: profile.name,
    gender: profile.gender,
    gender_probability: profile.gender_probability,
    sample_size: profile.sample_size,
    age: profile.age,
    age_group: profile.age_group,
    country_id: profile.country_id,
    country_probability: profile.country_probability,
    created_at: profile.created_at.toISOString(),
});
const mapExternalError = (externalApi, res) => {
    return res.status(502).json({
        status: '502',
        message: `${externalApi} returned an invalid response`
    });
};
app.post('/api/profiles', async (req, res) => {
    const { name } = req.body;
    if (name === undefined || name === null || name === '') {
        return res.status(400).json({
            status: 'error',
            message: 'Missing or empty name'
        });
    }
    if (typeof name !== 'string') {
        return res.status(422).json({
            status: 'error',
            message: 'Invalid type for name'
        });
    }
    const normalizedName = name.trim();
    if (!normalizedName) {
        return res.status(400).json({
            status: 'error',
            message: 'Missing or empty name'
        });
    }
    try {
        const existingProfile = await prisma.profile.findFirst({
            where: {
                name: {
                    equals: normalizedName,
                    mode: 'insensitive'
                }
            }
        });
        if (existingProfile) {
            return res.status(200).json({
                status: 'success',
                message: 'Profile already exists',
                data: formatProfile(existingProfile)
            });
        }
        const [genderizeRes, agifyRes, nationalizeRes] = await Promise.all([
            axios.get(`https://api.genderize.io?name=${encodeURIComponent(normalizedName)}`),
            axios.get(`https://api.agify.io?name=${encodeURIComponent(normalizedName)}`),
            axios.get(`https://api.nationalize.io?name=${encodeURIComponent(normalizedName)}`)
        ]);
        const genderData = genderizeRes.data;
        const ageData = agifyRes.data;
        const countryData = nationalizeRes.data;
        if (!genderData || typeof genderData !== 'object') {
            return mapExternalError('Genderize', res);
        }
        if (!ageData || typeof ageData !== 'object') {
            return mapExternalError('Agify', res);
        }
        if (!countryData || typeof countryData !== 'object') {
            return mapExternalError('Nationalize', res);
        }
        if (!genderData.gender || genderData.count === 0) {
            return mapExternalError('Genderize', res);
        }
        if (ageData.age === null || ageData.age === undefined) {
            return mapExternalError('Agify', res);
        }
        if (!Array.isArray(countryData.country) || countryData.country.length === 0) {
            return mapExternalError('Nationalize', res);
        }
        const gender = String(genderData.gender);
        const gender_probability = Number(genderData.probability);
        const sample_size = Number(genderData.count);
        const age = Number(ageData.age);
        const age_group = getAgeGroup(age);
        const bestCountry = countryData.country.reduce((prev, current) => {
            return current.probability > prev.probability ? current : prev;
        });
        if (!bestCountry?.country_id || bestCountry.probability === undefined) {
            return mapExternalError('Nationalize', res);
        }
        const country_id = String(bestCountry.country_id);
        const country_probability = Number(bestCountry.probability);
        const id = uuidv7();
        const createdProfile = await prisma.profile.create({
            data: {
                id,
                name: normalizedName,
                gender,
                gender_probability,
                sample_size,
                age,
                age_group,
                country_id,
                country_probability
            }
        });
        return res.status(201).json({
            status: 'success',
            data: formatProfile(createdProfile)
        });
    }
    catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            const url = error.config?.url ?? '';
            if (url.includes('genderize.io')) {
                return mapExternalError('Genderize', res);
            }
            if (url.includes('agify.io')) {
                return mapExternalError('Agify', res);
            }
            if (url.includes('nationalize.io')) {
                return mapExternalError('Nationalize', res);
            }
        }
        console.error('POST /api/profiles error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});
app.get('/api/profiles/:id', async (req, res) => {
    const id = String(req.params.id);
    try {
        const profile = await prisma.profile.findUnique({
            where: { id }
        });
        if (!profile) {
            return res.status(404).json({
                status: 'error',
                message: 'Profile not found'
            });
        }
        return res.status(200).json({
            status: 'success',
            data: formatProfile(profile)
        });
    }
    catch (error) {
        console.error('GET /api/profiles/:id error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});
app.get('/api/profiles', async (req, res) => {
    const gender = typeof req.query.gender === 'string' ? req.query.gender.trim() : undefined;
    const country_id = typeof req.query.country_id === 'string' ? req.query.country_id.trim() : undefined;
    const age_group = typeof req.query.age_group === 'string' ? req.query.age_group.trim() : undefined;
    try {
        const where = {};
        if (gender) {
            where.gender = {
                equals: gender,
                mode: 'insensitive'
            };
        }
        if (country_id) {
            where.country_id = {
                equals: country_id,
                mode: 'insensitive'
            };
        }
        if (age_group) {
            where.age_group = {
                equals: age_group,
                mode: 'insensitive'
            };
        }
        const profiles = await prisma.profile.findMany({
            where,
            orderBy: { created_at: 'desc' }
        });
        const data = profiles.map((profile) => ({
            id: profile.id,
            name: profile.name,
            gender: profile.gender,
            age: profile.age,
            age_group: profile.age_group,
            country_id: profile.country_id
        }));
        return res.status(200).json({
            status: 'success',
            count: data.length,
            data
        });
    }
    catch (error) {
        console.error('GET /api/profiles error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});
app.delete('/api/profiles/:id', async (req, res) => {
    const id = String(req.params.id);
    try {
        const profile = await prisma.profile.findUnique({
            where: { id }
        });
        if (!profile) {
            return res.status(404).json({
                status: 'error',
                message: 'Profile not found'
            });
        }
        await prisma.profile.delete({
            where: { id }
        });
        return res.status(204).send();
    }
    catch (error) {
        console.error('DELETE /api/profiles/:id error:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal server error'
        });
    }
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map