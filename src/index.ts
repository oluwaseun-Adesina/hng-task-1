import express, { type Request, type Response } from 'express';
import axios from 'axios';
import cors from 'cors';
import { uuidv7 } from 'uuidv7';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Age Group Classification Logic
const getAgeGroup = (age: number): string => {
  if (age <= 12) return 'child';
  if (age <= 19) return 'teenager';
  if (age <= 59) return 'adult';
  return 'senior';
};

app.post('/api/profiles', async (req: Request, res: Response) => {
  const { name } = req.body;

  // Validation
  if (name === undefined || name === null || name === '') {
    return res.status(400).json({
      status: 'error',
      message: 'Missing or empty name'
    });
  }

  if (typeof name !== 'string') {
    return res.status(422).json({
      status: 'error',
      message: 'Non-string name'
    });
  }

  try {
    // Idempotency check
    const existingProfile = await prisma.profile.findUnique({
      where: { name }
    });

    if (existingProfile) {
      return res.status(200).json({
        status: 'success',
        message: 'Profile already exists',
        data: {
          id: existingProfile.id,
          name: existingProfile.name,
          gender: existingProfile.gender,
          gender_probability: existingProfile.gender_probability,
          sample_size: existingProfile.sample_size,
          age: existingProfile.age,
          age_group: existingProfile.age_group,
          country_id: existingProfile.country_id,
          country_probability: existingProfile.country_probability,
          created_at: existingProfile.created_at.toISOString().split('.')[0] + 'Z'
        }
      });
    }

    // External API calls
    const [genderizeRes, agifyRes, nationalizeRes] = await Promise.all([
      axios.get(`https://api.genderize.io/?name=${name}`),
      axios.get(`https://api.agify.io/?name=${name}`),
      axios.get(`https://api.nationalize.io/?name=${name}`)
    ]);

    const genderData = genderizeRes.data;
    const ageData = agifyRes.data;
    const countryData = nationalizeRes.data;

    // Edge cases validation
    if (!genderData.gender || genderData.count === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Insufficient Genderize data'
      });
    }

    if (ageData.age === null) {
      return res.status(404).json({
        status: 'error',
        message: 'Insufficient Agify data'
      });
    }

    if (!countryData.country || countryData.country.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Insufficient Nationalize data'
      });
    }

    // Processed result
    const gender = genderData.gender;
    const gender_probability = genderData.probability;
    const sample_size = genderData.count;

    const age = ageData.age;
    const age_group = getAgeGroup(age);

    // Pick highest probability country
    const bestCountry = countryData.country.reduce((prev: any, current: any) => {
      return (prev.probability > current.probability) ? prev : current;
    });

    const country_id = bestCountry.country_id;
    const country_probability = bestCountry.probability;

    const id = uuidv7();
    const created_at = new Date();

    const newProfile = await prisma.profile.create({
      data: {
        id,
        name,
        gender,
        gender_probability,
        sample_size,
        age,
        age_group,
        country_id,
        country_probability,
        created_at
      }
    });

    return res.status(201).json({
      status: 'success',
      data: {
        id: newProfile.id,
        name: newProfile.name,
        gender: newProfile.gender,
        gender_probability: newProfile.gender_probability,
        sample_size: newProfile.sample_size,
        age: newProfile.age,
        age_group: newProfile.age_group,
        country_id: newProfile.country_id,
        country_probability: newProfile.country_probability,
        created_at: newProfile.created_at.toISOString().split('.')[0] + 'Z'
      }
    });

  } catch (error: any) {
    console.error('Detailed Error:', error);
    if (error.response) {
      console.error('API Response Error:', error.response.data);
    }
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Internal server error'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
