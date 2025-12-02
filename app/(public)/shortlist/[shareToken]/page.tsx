import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { FeedbackButtons } from "./feedback-buttons";

interface ShortlistPageProps {
  params: Promise<{ shareToken: string }>;
}

async function getShortlist(shareToken: string) {
  const shortlist = await db.shortlist.findUnique({
    where: { shareToken },
    include: {
      agency: {
        select: {
          name: true,
          logoUrl: true,
          primaryColor: true,
        },
      },
      job: {
        select: {
          title: true,
          location: true,
          contractType: true,
        },
      },
      items: {
        include: {
          application: {
            select: {
              id: true,
              fullName: true,
              status: true,
              tags: true,
            },
          },
        },
        orderBy: { order: "asc" },
      },
    },
  });

  return shortlist;
}

function getStatusColor(status: string): string {
  switch (status) {
    case "NEW":
      return "bg-blue-100 text-blue-700";
    case "CONTACTED":
      return "bg-amber-100 text-amber-700";
    case "QUALIFIED":
      return "bg-green-100 text-green-700";
    case "PLACED":
      return "bg-emerald-100 text-emerald-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function PublicShortlistPage({
  params,
}: ShortlistPageProps) {
  const { shareToken } = await params;
  const shortlist = await getShortlist(shareToken);

  if (!shortlist) {
    notFound();
  }

  const primaryColor = shortlist.agency.primaryColor || "#4F46E5";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="py-8 px-4"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="max-w-3xl mx-auto text-center text-white">
          <p className="text-sm opacity-80 mb-2">Candidate Shortlist from</p>
          <h1 className="text-2xl font-bold">{shortlist.agency.name}</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Shortlist Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            {shortlist.name}
          </h2>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600 mb-4">
            <span>
              <strong>Position:</strong> {shortlist.job.title}
            </span>
            {shortlist.job.location && (
              <span>
                <strong>Location:</strong> {shortlist.job.location}
              </span>
            )}
            {shortlist.job.contractType && (
              <span>
                <strong>Contract:</strong> {shortlist.job.contractType}
              </span>
            )}
          </div>
          {shortlist.note && (
            <p className="text-slate-600 text-sm border-t border-slate-100 pt-4">
              {shortlist.note}
            </p>
          )}
        </div>

        {/* Candidates */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">
              Candidates ({shortlist.items.length})
            </h3>
          </div>

          {shortlist.items.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              No candidates in this shortlist yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {shortlist.items.map((item, index) => (
                <li key={item.application.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      {/* Order number */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {index + 1}
                      </div>

                      {/* Candidate info */}
                      <div>
                        <h4 className="font-medium text-slate-900">
                          {item.application.fullName}
                        </h4>
                        {item.application.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.application.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getStatusColor(item.application.status)}`}
                    >
                      {item.application.status}
                    </span>
                  </div>

                  {/* Client Feedback Buttons */}
                  <FeedbackButtons
                    shareToken={shareToken}
                    applicationId={item.application.id}
                    candidateName={item.application.fullName}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>
            Powered by{" "}
            <a
              href="/"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              QuestHire
            </a>
          </p>
          <p className="mt-1">
            Created on{" "}
            {new Date(shortlist.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </main>
    </div>
  );
}
