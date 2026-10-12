import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Data contoh untuk katalog. Silakan sesuaikan / tambah lewat file ini atau lewat aplikasi (CRUD figur).
const seriesData = [
  { name: "The Other One", releaseYear: 2021, description: "Seri debut Hirono.",
    figures: ["The Ghost","The Fox","Amnesia","Nowhere Safe","Vagrancy","The Monster","The Crow","Being Alive","Marionette","Raving","Staring","Cuckoo","Dreaming"] },
  { name: "Little Mischief", releaseYear: 2022, description: "Seri dengan tema kenakalan dan sisi diri.",
    figures: ["Loose Fish","Manacle","The Aviator","Protector","Persona","Robot","Birdman","Ragpicker","Destroyer","Pretender","Boiling Frog","Float","Unknown Journey"] },
  { name: "City of Mercy", releaseYear: 2022, description: "Seri bertema kehidupan kota dan emosi.",
    figures: ["The Other","Insight","Comfortably Numb","Healer","Fallen Angel","Echo","Belonging","Wandering"] },
  { name: "Mime", releaseYear: 2023, description: "Seri yang mengeksplorasi ekspresi dan peran.",
    figures: ["Guardian","Blind","Seeker","Devilry","Drifter","Fool","Patience","Unspoken","Prison","Destroy","Poem","Secrecy","Silence"] }
];

async function main() {
  for (const item of seriesData) {
    const { figures, ...series } = item;
    const saved = await prisma.series.upsert({
      where: { name: series.name },
      update: { releaseYear: series.releaseYear, description: series.description },
      create: series
    });
    for (const figureName of figures) {
      const existing = await prisma.figure.findFirst({ where: { name: figureName, seriesId: saved.id } });
      if (!existing) {
        await prisma.figure.create({
          data: { name: figureName, rarity: "Regular", description: "", imageUrl: "", seriesId: saved.id }
        });
      }
    }
  }
  console.log("Seed selesai.");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
