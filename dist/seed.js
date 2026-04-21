import 'dotenv/config';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { uuidv7 } from 'uuidv7';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));
async function seed() {
    const filePath = join(__dirname, '..', 'seed_profiles.json');
    const raw = readFileSync(filePath, 'utf-8');
    const { profiles } = JSON.parse(raw);
    console.log(`Seeding ${profiles.length} profiles...`);
    // Fetch all existing names in one query
    const existing = await prisma.profile.findMany({ select: { name: true } });
    const existingNames = new Set(existing.map((p) => p.name));
    const toInsert = profiles.filter((p) => !existingNames.has(p.name));
    if (toInsert.length === 0) {
        console.log(`Seed complete: 0 created, ${profiles.length} skipped (all already exist).`);
        return;
    }
    // Batch insert in chunks of 100
    const CHUNK = 100;
    let created = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
        const chunk = toInsert.slice(i, i + CHUNK);
        await prisma.profile.createMany({
            data: chunk.map((p) => ({
                id: uuidv7(),
                name: p.name,
                gender: p.gender,
                gender_probability: p.gender_probability,
                age: p.age,
                age_group: p.age_group,
                country_id: p.country_id,
                country_name: p.country_name,
                country_probability: p.country_probability,
            })),
            skipDuplicates: true,
        });
        created += chunk.length;
        process.stdout.write(`\r  ${created}/${toInsert.length} inserted...`);
    }
    console.log(`\nSeed complete: ${created} created, ${existingNames.size} skipped.`);
}
seed()
    .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map