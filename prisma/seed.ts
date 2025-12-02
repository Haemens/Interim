import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaNeon({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  // Clean up existing data (in reverse order of dependencies)
  await prisma.clientFeedback.deleteMany();
  await prisma.jobRequest.deleteMany();
  await prisma.client.deleteMany();
  await prisma.shortlistItem.deleteMany();
  await prisma.shortlist.deleteMany();
  await prisma.eventLog.deleteMany();
  await prisma.publication.deleteMany();
  await prisma.jobPostContent.deleteMany();
  await prisma.application.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.candidateProfile.deleteMany();
  await prisma.jobAsset.deleteMany();
  await prisma.job.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.agency.deleteMany();

  console.log("🧹 Cleaned existing data");

  // Create agencies
  const alphaStaff = await prisma.agency.create({
    data: {
      name: "Alpha Staff",
      slug: "alpha-staff",
      email: "contact@alpha-staff.com",
      logoUrl: null,
      primaryColor: "#4F46E5",
    },
  });

  const betaInterim = await prisma.agency.create({
    data: {
      name: "Beta Intérim",
      slug: "beta-interim",
      email: "contact@beta-interim.com",
      logoUrl: null,
      primaryColor: "#059669",
    },
  });

  // Demo Agency - for public demo mode
  const demoAgency = await prisma.agency.create({
    data: {
      name: "Demo Agency",
      slug: "demo-agency",
      email: "demo@questhire.com",
      logoUrl: null,
      primaryColor: "#6366F1",
    },
  });

  console.log("🏢 Created agencies:", alphaStaff.slug, betaInterim.slug, demoAgency.slug);

  // Create users with hashed passwords
  // Default password for all seed users: "Password123"
  const hashedPassword = await bcrypt.hash("Password123", 12);

  const ownerUser = await prisma.user.create({
    data: {
      email: "owner@alpha-staff.com",
      name: "Alice Owner",
      hashedPassword,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@alpha-staff.com",
      name: "Bob Admin",
      hashedPassword,
    },
  });

  const recruiterUser = await prisma.user.create({
    data: {
      email: "recruiter@alpha-staff.com",
      name: "Carol Recruiter",
      hashedPassword,
    },
  });

  const betaOwner = await prisma.user.create({
    data: {
      email: "owner@beta-interim.com",
      name: "David Beta",
      hashedPassword,
    },
  });

  // Demo user for public demo mode
  const demoUser = await prisma.user.create({
    data: {
      email: "demo@questhire.com",
      name: "Demo User",
      hashedPassword,
      hasSeenOnboardingTour: true, // Demo user has already seen the tour
    },
  });

  console.log("👤 Created users");

  // Create memberships
  await prisma.membership.createMany({
    data: [
      { userId: ownerUser.id, agencyId: alphaStaff.id, role: "OWNER" },
      { userId: adminUser.id, agencyId: alphaStaff.id, role: "ADMIN" },
      { userId: recruiterUser.id, agencyId: alphaStaff.id, role: "RECRUITER" },
      { userId: betaOwner.id, agencyId: betaInterim.id, role: "OWNER" },
      { userId: demoUser.id, agencyId: demoAgency.id, role: "OWNER" },
    ],
  });

  console.log("🔗 Created memberships");

  // Create subscriptions
  await prisma.subscription.createMany({
    data: [
      { agencyId: alphaStaff.id, plan: "PRO", status: "ACTIVE" },
      { agencyId: betaInterim.id, plan: "STARTER", status: "ACTIVE" },
      { agencyId: demoAgency.id, plan: "PRO", status: "ACTIVE" },
    ],
  });

  console.log("💳 Created subscriptions");

  // Create jobs for Alpha Staff
  const warehouseJob = await prisma.job.create({
    data: {
      agencyId: alphaStaff.id,
      title: "Opérateur Logistique",
      location: "Lyon, France",
      contractType: "CDI",
      salaryMin: 1800,
      salaryMax: 2200,
      currency: "EUR",
      sector: "Logistique",
      description:
        "Nous recherchons un opérateur logistique pour rejoindre notre équipe. Vous serez responsable de la réception, du stockage et de l'expédition des marchandises.",
      profile:
        "Certification CACES 1/3/5 requise. Minimum 2 ans d'expérience en entrepôt.",
      benefits: "Mutuelle, tickets restaurant, prime de transport",
      tags: ["CACES", "journée", "CDI"],
      status: "ACTIVE",
      publishedAt: new Date(),
    },
  });

  const nightShiftJob = await prisma.job.create({
    data: {
      agencyId: alphaStaff.id,
      title: "Agent de Production (Nuit)",
      location: "Marseille, France",
      contractType: "CDD",
      salaryMin: 2000,
      salaryMax: 2400,
      currency: "EUR",
      sector: "Industrie",
      description:
        "Rejoignez notre équipe de production pour les quarts de nuit. Travail sur chaîne d'assemblage dans une usine moderne.",
      profile: "Aucune qualification spécifique requise. Formation assurée.",
      benefits: "Prime de nuit (+25%), parking gratuit",
      tags: ["nuit", "débutant accepté", "CDD"],
      status: "ACTIVE",
      publishedAt: new Date(),
    },
  });

  const draftJob = await prisma.job.create({
    data: {
      agencyId: alphaStaff.id,
      title: "Cariste",
      location: "Paris, France",
      contractType: "INTERIM",
      salaryMin: 1900,
      salaryMax: 2100,
      currency: "EUR",
      sector: "Logistique",
      description: "Cariste recherché pour une mission de 3 mois.",
      profile: "CACES 3 requis.",
      tags: ["CACES", "intérim"],
      status: "DRAFT",
    },
  });

  console.log("📋 Created jobs for Alpha Staff");

  // Create jobs for Beta Interim
  await prisma.job.create({
    data: {
      agencyId: betaInterim.id,
      title: "Assistant Administratif",
      location: "Nice, France",
      contractType: "CDI",
      salaryMin: 1700,
      salaryMax: 2000,
      currency: "EUR",
      sector: "Bureau",
      description: "Poste de support administratif dans une entreprise en pleine croissance.",
      profile: "Maîtrise du Pack Office. Bonnes compétences en communication.",
      tags: ["bureau", "CDI"],
      status: "ACTIVE",
      publishedAt: new Date(),
    },
  });

  console.log("📋 Created jobs for Beta Interim");

  // Create applications for Alpha Staff jobs
  await prisma.application.createMany({
    data: [
      {
        jobId: warehouseJob.id,
        agencyId: alphaStaff.id,
        fullName: "Jean Dupont",
        email: "jean.dupont@email.com",
        phone: "+33 6 12 34 56 78",
        source: "job_page",
        status: "NEW",
        tags: ["CACES certified", "available immediately"],
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: warehouseJob.id,
        agencyId: alphaStaff.id,
        fullName: "Marie Martin",
        email: "marie.martin@email.com",
        phone: "+33 6 98 76 54 32",
        source: "linkedin",
        status: "CONTACTED",
        note: "Called on Monday, will send CV by email",
        tags: ["experienced"],
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: nightShiftJob.id,
        agencyId: alphaStaff.id,
        fullName: "Pierre Bernard",
        email: "pierre.b@email.com",
        source: "job_page",
        status: "QUALIFIED",
        note: "Great candidate, available for night shifts",
        tags: ["night shift OK", "motivated"],
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: nightShiftJob.id,
        agencyId: alphaStaff.id,
        fullName: "Sophie Leroy",
        email: "sophie.leroy@email.com",
        phone: "+33 6 11 22 33 44",
        source: "tiktok",
        status: "NEW",
        consentToContact: true,
        consentGivenAt: new Date(),
      },
    ],
  });

  console.log("📝 Created applications");

  // Create candidate profiles
  const candidateProfiles = await prisma.candidateProfile.createMany({
    data: [
      {
        agencyId: alphaStaff.id,
        email: "jean.dupont@email.com",
        fullName: "Jean Dupont",
        phone: "+33 6 12 34 56 78",
        skills: ["CACES", "forklift", "warehouse"],
        sectors: ["Logistics"],
        location: "Lyon, France",
        status: "ACTIVE",
        consentToContact: true,
        consentGivenAt: new Date(),
        lastJobTitle: "Warehouse Operator",
      },
      {
        agencyId: alphaStaff.id,
        email: "marie.martin@email.com",
        fullName: "Marie Martin",
        phone: "+33 6 98 76 54 32",
        skills: ["CACES", "experienced", "team lead"],
        sectors: ["Logistics", "Manufacturing"],
        location: "Lyon, France",
        status: "ACTIVE",
        consentToContact: true,
        consentGivenAt: new Date(),
        lastJobTitle: "Warehouse Operator",
      },
      {
        agencyId: alphaStaff.id,
        email: "pierre.b@email.com",
        fullName: "Pierre Bernard",
        skills: ["night shift", "motivated"],
        sectors: ["Manufacturing"],
        location: "Marseille, France",
        status: "ACTIVE",
        consentToContact: true,
        consentGivenAt: new Date(),
        lastJobTitle: "Night Shift Production Worker",
      },
      {
        agencyId: alphaStaff.id,
        email: "sophie.leroy@email.com",
        fullName: "Sophie Leroy",
        phone: "+33 6 11 22 33 44",
        skills: [],
        sectors: ["Manufacturing"],
        location: "Marseille, France",
        status: "ACTIVE",
        consentToContact: true,
        consentGivenAt: new Date(),
        lastJobTitle: "Night Shift Production Worker",
      },
    ],
  });

  console.log("👤 Created candidate profiles:", candidateProfiles.count);

  // Link applications to candidate profiles
  const jeanProfile = await prisma.candidateProfile.findFirst({
    where: { email: "jean.dupont@email.com", agencyId: alphaStaff.id },
  });
  const marieProfile = await prisma.candidateProfile.findFirst({
    where: { email: "marie.martin@email.com", agencyId: alphaStaff.id },
  });
  const pierreProfile = await prisma.candidateProfile.findFirst({
    where: { email: "pierre.b@email.com", agencyId: alphaStaff.id },
  });
  const sophieProfile = await prisma.candidateProfile.findFirst({
    where: { email: "sophie.leroy@email.com", agencyId: alphaStaff.id },
  });

  // Update applications with candidate IDs
  if (jeanProfile) {
    await prisma.application.updateMany({
      where: { email: "jean.dupont@email.com", agencyId: alphaStaff.id },
      data: { candidateId: jeanProfile.id },
    });
  }
  if (marieProfile) {
    await prisma.application.updateMany({
      where: { email: "marie.martin@email.com", agencyId: alphaStaff.id },
      data: { candidateId: marieProfile.id },
    });
  }
  if (pierreProfile) {
    await prisma.application.updateMany({
      where: { email: "pierre.b@email.com", agencyId: alphaStaff.id },
      data: { candidateId: pierreProfile.id },
    });
  }
  if (sophieProfile) {
    await prisma.application.updateMany({
      where: { email: "sophie.leroy@email.com", agencyId: alphaStaff.id },
      data: { candidateId: sophieProfile.id },
    });
  }

  console.log("🔗 Linked applications to candidate profiles");

  // Create event logs
  await prisma.eventLog.createMany({
    data: [
      {
        agencyId: alphaStaff.id,
        userId: ownerUser.id,
        jobId: warehouseJob.id,
        type: "JOB_CREATED",
        payload: { title: warehouseJob.title },
      },
      {
        agencyId: alphaStaff.id,
        userId: ownerUser.id,
        jobId: warehouseJob.id,
        type: "JOB_PUBLISHED",
        payload: { title: warehouseJob.title },
      },
      {
        agencyId: alphaStaff.id,
        userId: adminUser.id,
        jobId: nightShiftJob.id,
        type: "JOB_CREATED",
        payload: { title: nightShiftJob.title },
      },
    ],
  });

  console.log("📊 Created event logs");

  // Create a shortlist for the warehouse job
  const applications = await prisma.application.findMany({
    where: { jobId: warehouseJob.id },
    take: 2,
  });

  if (applications.length > 0) {
    await prisma.shortlist.create({
      data: {
        agencyId: alphaStaff.id,
        jobId: warehouseJob.id,
        name: "Top Candidates - Warehouse",
        shareToken: "demo-shortlist-abc123",
        note: "Our best candidates for the warehouse position. All have CACES certification.",
        items: {
          create: applications.map((app, index) => ({
            applicationId: app.id,
            order: index,
          })),
        },
      },
    });

    console.log("📋 Created shortlist");
  }

  // =============================================================================
  // DEMO AGENCY DATA
  // =============================================================================

  console.log("\n🎭 Creating demo agency data...");

  // Demo jobs
  const demoJob1 = await prisma.job.create({
    data: {
      agencyId: demoAgency.id,
      title: "Conseiller Clientèle",
      location: "Télétravail",
      contractType: "CDI",
      salaryMin: 2200,
      salaryMax: 2800,
      currency: "EUR",
      sector: "Service Client",
      description:
        "Rejoignez l'équipe service client grandissante de notre client. Gérez les demandes par téléphone, email et chat. Belle opportunité d'évolution.",
      profile:
        "Excellentes compétences en communication. Expérience précédente en service client préférée. Anglais courant apprécié.",
      benefits: "Télétravail, mutuelle, formation assurée",
      tags: ["télétravail", "service client", "CDI"],
      status: "ACTIVE",
      publishedAt: new Date(),
    },
  });

  const demoJob2 = await prisma.job.create({
    data: {
      agencyId: demoAgency.id,
      title: "Chef d'Équipe Logistique",
      location: "Paris, France",
      contractType: "CDI",
      salaryMin: 2800,
      salaryMax: 3500,
      currency: "EUR",
      sector: "Logistique",
      description:
        "Encadrez une équipe de 10 opérateurs logistiques. Gérez les stocks, coordonnez les expéditions et assurez le respect des règles de sécurité.",
      profile:
        "CACES 1/3/5 requis. 3+ ans d'expérience en entrepôt. Compétences managériales.",
      benefits: "Prime sur objectifs, tickets restaurant, véhicule de fonction",
      tags: ["management", "logistique", "CACES"],
      status: "ACTIVE",
      publishedAt: new Date(),
    },
  });

  const demoJob3 = await prisma.job.create({
    data: {
      agencyId: demoAgency.id,
      title: "Assistant(e) de Direction",
      location: "Lyon, France",
      contractType: "CDD",
      salaryMin: 1800,
      salaryMax: 2200,
      currency: "EUR",
      sector: "Administratif",
      description:
        "Soutien administratif à l'équipe de direction. Gestion d'agenda, correspondance et organisation du bureau.",
      profile: "Maîtrise du Pack Office. Organisé(e) et rigoureux(se).",
      tags: ["administratif", "CDD", "secrétariat"],
      status: "ACTIVE",
      publishedAt: new Date(),
    },
  });

  // Demo applications
  await prisma.application.createMany({
    data: [
      {
        jobId: demoJob1.id,
        agencyId: demoAgency.id,
        fullName: "Emma Wilson",
        email: "emma.wilson@demo.com",
        phone: "+33 6 12 34 56 78",
        source: "linkedin",
        status: "QUALIFIED",
        note: "Excellentes compétences en communication, disponible immédiatement",
        tags: ["bilingue", "expérimentée"],
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: demoJob1.id,
        agencyId: demoAgency.id,
        fullName: "Lucas Martin",
        email: "lucas.martin@demo.com",
        source: "job_page",
        status: "CONTACTED",
        note: "Appel prévu jeudi",
        tags: ["expérience télétravail"],
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: demoJob1.id,
        agencyId: demoAgency.id,
        fullName: "Sophie Dubois",
        email: "sophie.dubois@demo.com",
        phone: "+33 6 98 76 54 32",
        source: "tiktok",
        status: "NEW",
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: demoJob2.id,
        agencyId: demoAgency.id,
        fullName: "Thomas Bernard",
        email: "thomas.bernard@demo.com",
        phone: "+33 6 11 22 33 44",
        source: "job_page",
        status: "QUALIFIED",
        note: "Entretien prévu lundi 10h",
        tags: ["certifié CACES", "expérience chef d'équipe"],
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: demoJob2.id,
        agencyId: demoAgency.id,
        fullName: "Marie Leroy",
        email: "marie.leroy@demo.com",
        source: "linkedin",
        status: "QUALIFIED",
        tags: ["5 ans d'expérience"],
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: demoJob3.id,
        agencyId: demoAgency.id,
        fullName: "Julie Petit",
        email: "julie.petit@demo.com",
        phone: "+33 6 55 66 77 88",
        source: "job_page",
        status: "NEW",
        consentToContact: true,
        consentGivenAt: new Date(),
      },
    ],
  });

  // Demo candidate profiles
  await prisma.candidateProfile.createMany({
    data: [
      {
        agencyId: demoAgency.id,
        email: "emma.wilson@demo.com",
        fullName: "Emma Wilson",
        phone: "+33 6 12 34 56 78",
        skills: ["service client", "bilingue", "CRM"],
        sectors: ["Service Client"],
        location: "Paris, France",
        status: "ACTIVE",
        consentToContact: true,
        consentGivenAt: new Date(),
        lastJobTitle: "Conseillère Clientèle",
      },
      {
        agencyId: demoAgency.id,
        email: "thomas.bernard@demo.com",
        fullName: "Thomas Bernard",
        phone: "+33 6 11 22 33 44",
        skills: ["CACES", "management d'équipe", "gestion de stock"],
        sectors: ["Logistique"],
        location: "Paris, France",
        status: "ACTIVE",
        consentToContact: true,
        consentGivenAt: new Date(),
        lastJobTitle: "Chef d'Équipe Logistique",
      },
      {
        agencyId: demoAgency.id,
        email: "marie.leroy@demo.com",
        fullName: "Marie Leroy",
        skills: ["CACES", "chariot élévateur", "sécurité"],
        sectors: ["Logistique", "Industrie"],
        location: "Lyon, France",
        status: "ACTIVE",
        consentToContact: true,
        consentGivenAt: new Date(),
        lastJobTitle: "Superviseur Entrepôt",
      },
    ],
  });

  // Demo event logs
  await prisma.eventLog.createMany({
    data: [
      {
        agencyId: demoAgency.id,
        userId: demoUser.id,
        jobId: demoJob1.id,
        type: "JOB_CREATED",
        payload: { title: demoJob1.title },
      },
      {
        agencyId: demoAgency.id,
        userId: demoUser.id,
        jobId: demoJob1.id,
        type: "JOB_PUBLISHED",
        payload: { title: demoJob1.title },
      },
      {
        agencyId: demoAgency.id,
        userId: demoUser.id,
        jobId: demoJob2.id,
        type: "JOB_CREATED",
        payload: { title: demoJob2.title },
      },
      {
        agencyId: demoAgency.id,
        userId: demoUser.id,
        jobId: demoJob2.id,
        type: "JOB_PUBLISHED",
        payload: { title: demoJob2.title },
      },
    ],
  });

  console.log("🎭 Demo agency data created");

  // =============================================================================
  // DEMO CHANNELS & SOURCE TRACKING
  // =============================================================================

  console.log("\n📱 Creating demo channels and source tracking data...");

  // Create channels for demo agency
  const demoTikTokChannel = await prisma.channel.create({
    data: {
      agencyId: demoAgency.id,
      type: "TIKTOK",
      name: "TikTok Paris",
      handle: "@demoagency_paris",
      region: "Paris",
      isActive: true,
    },
  });

  const demoInstagramChannel = await prisma.channel.create({
    data: {
      agencyId: demoAgency.id,
      type: "INSTAGRAM",
      name: "Instagram Main",
      handle: "@demoagency",
      region: "France",
      isActive: true,
    },
  });

  const demoLinkedInChannel = await prisma.channel.create({
    data: {
      agencyId: demoAgency.id,
      type: "LINKEDIN",
      name: "LinkedIn Company",
      handle: "demo-agency-company",
      region: "France",
      isActive: true,
    },
  });

  console.log("📱 Created demo channels");

  // Update some demo applications with source tracking data
  // Sophie came from TikTok
  await prisma.application.updateMany({
    where: { email: "sophie.dubois@demo.com", agencyId: demoAgency.id },
    data: {
      source: "channel",
      sourceDetail: "tiktok_paris",
      sourceChannelId: demoTikTokChannel.id,
    },
  });

  // Lucas came from Instagram
  await prisma.application.updateMany({
    where: { email: "lucas.martin@demo.com", agencyId: demoAgency.id },
    data: {
      source: "channel",
      sourceDetail: "instagram_main",
      sourceChannelId: demoInstagramChannel.id,
    },
  });

  // Emma came from LinkedIn
  await prisma.application.updateMany({
    where: { email: "emma.wilson@demo.com", agencyId: demoAgency.id },
    data: {
      source: "channel",
      sourceDetail: "linkedin_company",
      sourceChannelId: demoLinkedInChannel.id,
    },
  });

  // Marie came from LinkedIn too
  await prisma.application.updateMany({
    where: { email: "marie.leroy@demo.com", agencyId: demoAgency.id },
    data: {
      source: "channel",
      sourceDetail: "linkedin_company",
      sourceChannelId: demoLinkedInChannel.id,
    },
  });

  // Add more applications with varied sources for better analytics demo
  await prisma.application.createMany({
    data: [
      {
        jobId: demoJob1.id,
        agencyId: demoAgency.id,
        fullName: "Pierre Moreau",
        email: "pierre.moreau@demo.com",
        source: "channel",
        sourceDetail: "tiktok_paris",
        sourceChannelId: demoTikTokChannel.id,
        status: "NEW",
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: demoJob1.id,
        agencyId: demoAgency.id,
        fullName: "Claire Fontaine",
        email: "claire.fontaine@demo.com",
        source: "channel",
        sourceDetail: "tiktok_paris",
        sourceChannelId: demoTikTokChannel.id,
        status: "CONTACTED",
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: demoJob2.id,
        agencyId: demoAgency.id,
        fullName: "Antoine Rousseau",
        email: "antoine.rousseau@demo.com",
        source: "channel",
        sourceDetail: "instagram_main",
        sourceChannelId: demoInstagramChannel.id,
        status: "NEW",
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: demoJob2.id,
        agencyId: demoAgency.id,
        fullName: "Camille Girard",
        email: "camille.girard@demo.com",
        source: "direct",
        status: "QUALIFIED",
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: demoJob3.id,
        agencyId: demoAgency.id,
        fullName: "Nicolas Laurent",
        email: "nicolas.laurent@demo.com",
        source: "email",
        sourceDetail: "newsletter_campaign",
        status: "NEW",
        consentToContact: true,
        consentGivenAt: new Date(),
      },
      {
        jobId: demoJob3.id,
        agencyId: demoAgency.id,
        fullName: "Isabelle Blanc",
        email: "isabelle.blanc@demo.com",
        source: "qr_code",
        sourceDetail: "flyer_lyon_event",
        status: "CONTACTED",
        consentToContact: true,
        consentGivenAt: new Date(),
      },
    ],
  });

  console.log("📊 Created source tracking demo data");

  // Create channels for Alpha Staff too
  const alphaTikTok = await prisma.channel.create({
    data: {
      agencyId: alphaStaff.id,
      type: "TIKTOK",
      name: "TikTok Lyon",
      handle: "@alphastaff_lyon",
      region: "Lyon",
      isActive: true,
    },
  });

  const alphaLinkedIn = await prisma.channel.create({
    data: {
      agencyId: alphaStaff.id,
      type: "LINKEDIN",
      name: "LinkedIn Alpha Staff",
      handle: "alpha-staff-company",
      region: "France",
      isActive: true,
    },
  });

  // Update Alpha Staff applications with source tracking
  await prisma.application.updateMany({
    where: { email: "sophie.leroy@email.com", agencyId: alphaStaff.id },
    data: {
      source: "channel",
      sourceDetail: "tiktok_lyon",
      sourceChannelId: alphaTikTok.id,
    },
  });

  await prisma.application.updateMany({
    where: { email: "marie.martin@email.com", agencyId: alphaStaff.id },
    data: {
      source: "channel",
      sourceDetail: "linkedin_alpha_staff",
      sourceChannelId: alphaLinkedIn.id,
    },
  });

  console.log("📱 Created Alpha Staff channels and source tracking");

  // =============================================================================
  // CLIENT PORTAL DATA
  // =============================================================================

  // Create clients for Alpha Staff
  const logiTransClient = await prisma.client.create({
    data: {
      agencyId: alphaStaff.id,
      name: "LogiTrans SARL",
      contactName: "Jean-Pierre Durand",
      contactEmail: "jp.durand@logitrans.fr",
      contactPhone: "+33 6 12 34 56 78",
      sector: "Logistics",
      notes: "Key logistics client, high volume of orders",
      requestToken: "clnt_logitrans_alpha_001",
    },
  });

  const retailCorpClient = await prisma.client.create({
    data: {
      agencyId: alphaStaff.id,
      name: "RetailCorp France",
      contactName: "Marie Lefebvre",
      contactEmail: "m.lefebvre@retailcorp.fr",
      contactPhone: "+33 6 98 76 54 32",
      sector: "Retail",
      notes: "Retail sector, seasonal peaks",
      requestToken: "clnt_retailcorp_alpha_002",
    },
  });

  // Create clients for Demo Agency
  const demoClient1 = await prisma.client.create({
    data: {
      agencyId: demoAgency.id,
      name: "Demo Company Inc.",
      contactName: "Demo Client",
      contactEmail: "client@demo-company.com",
      contactPhone: "+33 1 23 45 67 89",
      sector: "Technology",
      notes: "Demo client for testing",
      requestToken: "clnt_demo_001",
    },
  });

  console.log("👥 Created clients");

  // Create job requests for Alpha Staff
  await prisma.jobRequest.createMany({
    data: [
      {
        agencyId: alphaStaff.id,
        clientId: logiTransClient.id,
        title: "Warehouse Team Lead",
        location: "Lyon",
        contractType: "CDI",
        salaryRange: "35-40k EUR/year",
        description: "We need an experienced warehouse team lead to manage our Lyon distribution center. The role involves supervising a team of 15 operators.",
        requirements: "5+ years warehouse experience, CACES certification, team management skills",
        status: "NEW",
      },
      {
        agencyId: alphaStaff.id,
        clientId: logiTransClient.id,
        title: "Forklift Operators (x5)",
        location: "Lyon",
        contractType: "Interim",
        salaryRange: "12-14 EUR/hour",
        description: "Urgent need for 5 forklift operators for our peak season starting next month.",
        requirements: "CACES 1, 3, 5 required. Night shift availability preferred.",
        status: "IN_REVIEW",
      },
      {
        agencyId: alphaStaff.id,
        clientId: retailCorpClient.id,
        title: "Store Manager",
        location: "Paris 15ème",
        contractType: "CDI",
        salaryRange: "45-50k EUR/year",
        description: "Looking for an experienced store manager for our flagship Paris location.",
        requirements: "Retail management experience, fluent French and English",
        status: "CONVERTED_TO_JOB",
        linkedJobId: warehouseJob.id,
      },
    ],
  });

  // Create job requests for Demo Agency
  await prisma.jobRequest.createMany({
    data: [
      {
        agencyId: demoAgency.id,
        clientId: demoClient1.id,
        title: "Demo Position Request",
        location: "Demo City",
        contractType: "CDI",
        description: "This is a demo job request to showcase the client portal feature.",
        status: "NEW",
      },
    ],
  });

  console.log("📋 Created job requests");

  // Create client feedback on shortlists
  // First, get the shortlist and its items
  const shortlistWithItems = await prisma.shortlist.findFirst({
    where: { agencyId: alphaStaff.id },
    include: { items: true },
  });

  if (shortlistWithItems && shortlistWithItems.items.length >= 2) {
    await prisma.clientFeedback.createMany({
      data: [
        {
          agencyId: alphaStaff.id,
          shortlistId: shortlistWithItems.id,
          applicationId: shortlistWithItems.items[0].applicationId,
          decision: "APPROVED",
          comment: "Great candidate, would like to schedule an interview",
        },
        {
          agencyId: alphaStaff.id,
          shortlistId: shortlistWithItems.id,
          applicationId: shortlistWithItems.items[1].applicationId,
          decision: "REJECTED",
          comment: "Not enough experience for this role",
        },
      ],
    });
    console.log("💬 Created client feedback");
  }

  console.log("\n✅ Seed completed successfully!");
  console.log("\n📧 Test accounts:");
  console.log("   - owner@alpha-staff.com (OWNER @ alpha-staff)");
  console.log("   - admin@alpha-staff.com (ADMIN @ alpha-staff)");
  console.log("   - recruiter@alpha-staff.com (RECRUITER @ alpha-staff)");
  console.log("   - owner@beta-interim.com (OWNER @ beta-interim)");
  console.log("   - demo@questhire.com (RECRUITER @ demo-agency)");
  console.log("\n🌐 Access via subdomains:");
  console.log("   - http://alpha-staff.localhost:3000");
  console.log("   - http://beta-interim.localhost:3000");
  console.log("   - http://demo-agency.localhost:3000 (Demo mode)");
  console.log("\n🔗 Client request links:");
  console.log("   - http://alpha-staff.localhost:3000/client/clnt_logitrans_alpha_001/request");
  console.log("   - http://alpha-staff.localhost:3000/client/clnt_retailcorp_alpha_002/request");
  console.log("   - http://demo-agency.localhost:3000/client/clnt_demo_001/request");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
