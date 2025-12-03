import { db } from "@/lib/db";

interface CandidateInput {
  agencyId: string;
  email: string;
  fullName: string;
  phone?: string | null;
  cvUrl?: string | null;
  location?: string | null;
  availabilityDate?: Date | null;
  mobilityRadius?: number | null;
  jobId?: string; // Context of application
}

export async function upsertCandidateFromApplication(input: CandidateInput) {
  const existing = await db.candidateProfile.findFirst({
    where: {
      agencyId: input.agencyId,
      email: { equals: input.email, mode: "insensitive" }
    }
  });

  let candidateId = "";

  if (existing) {
    // Update existing
    const updated = await db.candidateProfile.update({
      where: { id: existing.id },
      data: {
        // We allow updating name/phone/location as the candidate knows best
        fullName: input.fullName, 
        phone: input.phone || existing.phone,
        // If new CV provided, update main CV URL, but we'll also log to documents
        cvUrl: input.cvUrl || existing.cvUrl, 
        location: input.location || existing.location,
        availabilityDate: input.availabilityDate || existing.availabilityDate,
        mobilityRadius: input.mobilityRadius || existing.mobilityRadius,
        lastAppliedAt: new Date(),
      }
    });
    candidateId = updated.id;
  } else {
    // Create new
    const created = await db.candidateProfile.create({
      data: {
        agencyId: input.agencyId,
        email: input.email,
        fullName: input.fullName,
        phone: input.phone,
        cvUrl: input.cvUrl,
        location: input.location,
        availabilityDate: input.availabilityDate,
        mobilityRadius: input.mobilityRadius,
        firstAppliedAt: new Date(),
        lastAppliedAt: new Date(),
        status: "ACTIVE",
        consentToContact: true, 
        consentGivenAt: new Date(),
      }
    });
    candidateId = created.id;
  }

  // If CV is provided, add to documents history
  if (input.cvUrl) {
    // Check if this URL is already documented to avoid duplicates
    const existingDoc = await db.candidateDocument.findFirst({
      where: { candidateId, url: input.cvUrl }
    });

    if (!existingDoc) {
      await db.candidateDocument.create({
        data: {
          candidateId,
          type: "CV",
          name: `CV - Application ${new Date().toLocaleDateString()}`,
          url: input.cvUrl
        }
      });
    }
  }

  return { id: candidateId };
}
