import { PrismaClient } from "@prisma/client";
import { PRESET_THEMES } from "../src/lib/schema/preset-themes";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding preset themes...");
  for (const t of PRESET_THEMES) {
    await prisma.theme.upsert({
      where: { slug: t.slug },
      update: { name: t.name, tokens: t.tokens, isPreset: true },
      create: {
        slug: t.slug,
        name: t.name,
        tokens: t.tokens,
        isPreset: true,
      },
    });
    console.log(`  ✓ ${t.slug}`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
