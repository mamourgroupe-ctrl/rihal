import { PrismaClient, PilgrimStatus } from '@prisma/client';

const prisma = new PrismaClient();

const DAY = 86_400_000;

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * DAY);
}

async function main(): Promise<void> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      slug: 'demo',
      name: 'وكالة رحال التجريبية',
      plan: 'PRO',
      status: 'ACTIVE',
    },
  });

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@rihal.demo' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@rihal.demo',
      // bcrypt hash of "Rihal@2026" (replace before any real deployment)
      passwordHash: '$2b$12$R6p0iYb8oQm1zSx7m0M2QeJ9Wq7G3c8kP1n5vT4rL2uY6hD3fA8sS',
      name: 'مدير الوكالة',
      role: 'ADMIN',
      phone: '+966500000001',
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'operator@rihal.demo' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'operator@rihal.demo',
      passwordHash: '$2b$12$R6p0iYb8oQm1zSx7m0M2QeJ9Wq7G3c8kP1n5vT4rL2uY6hD3fA8sS',
      name: 'منسّق العمليات',
      role: 'OPERATOR',
    },
  });

  const people: Array<{
    fullNameAr: string;
    fullNameEn: string;
    passportNumber: string;
    nationality: string;
    status: PilgrimStatus;
    gender: 'MALE' | 'FEMALE';
    phone: string;
    passportExpiryDays: number;
  }> = [
    { fullNameAr: 'عبد الله محمد العتيبي', fullNameEn: 'Abdullah Mohammed Al-Otaibi', passportNumber: 'A1234567', nationality: 'SAU', status: 'READY_FOR_BOOKING', gender: 'MALE', phone: '+966501234567', passportExpiryDays: 1200 },
    { fullNameAr: 'فاطمة أحمد الزهراني', fullNameEn: 'Fatima Ahmed Al-Zahrani', passportNumber: 'A2345678', nationality: 'SAU', status: 'DOCUMENTS_UPLOADED', gender: 'FEMALE', phone: '+966501234568', passportExpiryDays: 1600 },
    { fullNameAr: 'يوسف كريم بن صالح', fullNameEn: 'Youssef Karim Ben Salah', passportNumber: 'T9876543', nationality: 'TUN', status: 'REGISTERED', gender: 'MALE', phone: '+21620123456', passportExpiryDays: 600 },
    { fullNameAr: 'مريم حسن العلوي', fullNameEn: 'Mariam Hassan Al-Alawi', passportNumber: 'M4567890', nationality: 'MAR', status: 'DRAFT', gender: 'FEMALE', phone: '+212612345678', passportExpiryDays: 240 },
    { fullNameAr: 'إبراهيم داود سيسي', fullNameEn: 'Ibrahim Daoud Sissoko', passportNumber: 'M1234567', nationality: 'MLI', status: 'BOOKED', gender: 'MALE', phone: '+22370123456', passportExpiryDays: 900 },
    { fullNameAr: 'خديجة عمر با', fullNameEn: 'Khadija Omar Ba', passportNumber: 'S3456789', nationality: 'SEN', status: 'PERMIT_ISSUED', gender: 'FEMALE', phone: '+221771234567', passportExpiryDays: 365 },
    { fullNameAr: 'عمر فاروق رحماني', fullNameEn: 'Omar Farouk Rahmani', passportNumber: 'A3456789', nationality: 'SAU', status: 'COMPLETED', gender: 'MALE', phone: '+966501234569', passportExpiryDays: 2600 },
    { fullNameAr: 'زينب علي حسين', fullNameEn: 'Zainab Ali Hussein', passportNumber: 'I5678901', nationality: 'IRQ', status: 'CANCELLED', gender: 'FEMALE', phone: '+9647712345678', passportExpiryDays: 540 },
    { fullNameAr: 'أحمد سمير المصري', fullNameEn: 'Ahmed Samir Al-Masri', passportNumber: 'E6789012', nationality: 'EGY', status: 'READY_FOR_BOOKING', gender: 'MALE', phone: '+201012345678', passportExpiryDays: 1050 },
    { fullNameAr: 'سلمى عبد الرحمن', fullNameEn: 'Salma Abdelrahman', passportNumber: 'S7890123', nationality: 'SDN', status: 'DOCUMENTS_UPLOADED', gender: 'FEMALE', phone: '+249912345678', passportExpiryDays: 420 },
    { fullNameAr: 'محمد أمين توفيق', fullNameEn: 'Mohamed Amine Tewfik', passportNumber: 'A8901234', nationality: 'DZA', status: 'REGISTERED', gender: 'MALE', phone: '+213551234567', passportExpiryDays: 660 },
    { fullNameAr: 'نور الهدى قاسم', fullNameEn: 'Nour Al-Huda Qasem', passportNumber: 'J9012345', nationality: 'JOR', status: 'DRAFT', gender: 'FEMALE', phone: '+962791234567', passportExpiryDays: 150 },
  ];

  const pilgrims = [];
  for (const person of people) {
    pilgrims.push(
      await prisma.pilgrim.upsert({
        where: {
          tenantId_passportNumber: {
            tenantId: tenant.id,
            passportNumber: person.passportNumber,
          },
        },
        update: { status: person.status },
        create: {
          tenantId: tenant.id,
          fullNameAr: person.fullNameAr,
          fullNameEn: person.fullNameEn,
          passportNumber: person.passportNumber,
          passportExpiry: daysFromNow(person.passportExpiryDays),
          nationality: person.nationality,
          dateOfBirth: daysFromNow(-365 * 34),
          gender: person.gender,
          phone: person.phone,
          email: `${person.passportNumber.toLowerCase()}@example.com`,
          status: person.status,
        },
      }),
    );
  }

  const groupSpecs: Array<{
    name: string;
    description: string;
    status: 'DRAFT' | 'READY' | 'SUBMITTED' | 'CONFIRMED';
    maxSize: number;
    memberIndexes: number[];
  }> = [
    { name: 'مجموعة الرحمة — ربيع الأول', description: 'مجموعة عمرة عائلية، 4 أفراد', status: 'READY', maxSize: 4, memberIndexes: [0, 1, 2, 3] },
    { name: 'مجموعة النور — رجب', description: 'عمرة فردية للمتقاعدين', status: 'SUBMITTED', maxSize: 6, memberIndexes: [4, 5, 8] },
    { name: 'مجموعة البركة — شعبان', description: 'مجموعة شبابية', status: 'DRAFT', maxSize: 4, memberIndexes: [10] },
    { name: 'مجموعة الإيمان — رمضان', description: 'المجموعة الأولى لموسم رمضان', status: 'CONFIRMED', maxSize: 6, memberIndexes: [9, 11] },
  ];

  for (const [index, spec] of groupSpecs.entries()) {
    const existing = await prisma.group.findFirst({
      where: { tenantId: tenant.id, name: spec.name },
    });
    const group =
      existing ??
      (await prisma.group.create({
        data: {
          tenantId: tenant.id,
          name: spec.name,
          description: spec.description,
          status: spec.status,
          maxSize: spec.maxSize,
          scheduledDate: daysFromNow(30 + index * 15),
        },
      }));

    for (const [position, pilgrimIndex] of spec.memberIndexes.entries()) {
      const pilgrim = pilgrims[pilgrimIndex];
      if (!pilgrim) continue;
      await prisma.groupMember.upsert({
        where: {
          groupId_pilgrimId: {
            groupId: group.id,
            pilgrimId: pilgrim.id,
          },
        },
        update: { isLeader: position === 0 },
        create: {
          groupId: group.id,
          pilgrimId: pilgrim.id,
          isLeader: position === 0,
        },
      });
    }
  }

  console.log(
    `✅ Seed complete — tenant "${tenant.slug}" (${tenant.id}), admin ${admin.email}, ${pilgrims.length} pilgrims, ${groupSpecs.length} groups`,
  );
}

main()
  .catch((error) => {
    console.error('❌ Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
