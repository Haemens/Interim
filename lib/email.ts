/**
 * Email infrastructure for QuestHire
 * 
 * Supports multiple providers:
 * - Development: logs to console
 * - Production: Resend, SendGrid, or custom provider
 * 
 * Configure via environment variables:
 * - EMAIL_PROVIDER: "console" | "resend" | "sendgrid"
 * - EMAIL_FROM_DEFAULT: Default sender address
 * - RESEND_API_KEY: API key for Resend
 * - SENDGRID_API_KEY: API key for SendGrid
 */

import { ENV } from "@/lib/env";
import { logInfo, logError, logWarn } from "@/lib/log";
import { captureException } from "@/lib/monitoring";

// =============================================================================
// TYPES
// =============================================================================

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

type EmailProvider = "console" | "resend" | "sendgrid";

// =============================================================================
// PROVIDER IMPLEMENTATIONS
// =============================================================================

/**
 * Log email to console (development mode)
 */
async function sendViaConsole(payload: EmailPayload): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("[EMAIL DEV] Would send email:");
  console.log("-".repeat(60));
  console.log(`From:    ${payload.from || ENV.EMAIL_FROM_DEFAULT}`);
  console.log(`To:      ${payload.to}`);
  console.log(`Subject: ${payload.subject}`);
  console.log("-".repeat(60));
  console.log("HTML:");
  console.log(payload.html);
  if (payload.text) {
    console.log("-".repeat(60));
    console.log("Text:");
    console.log(payload.text);
  }
  console.log("=".repeat(60) + "\n");
}

/**
 * Send email via Resend API
 * https://resend.com/docs/api-reference/emails/send-email
 */
async function sendViaResend(payload: EmailPayload): Promise<void> {
  const apiKey = ENV.RESEND_API_KEY;
  
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from || ENV.EMAIL_FROM_DEFAULT,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${error}`);
  }

  const result = await response.json();
  logInfo("Email sent via Resend", { 
    emailId: result.id, 
    to: payload.to,
    subject: payload.subject,
  });
}

/**
 * Send email via SendGrid API
 * https://docs.sendgrid.com/api-reference/mail-send/mail-send
 */
async function sendViaSendGrid(payload: EmailPayload): Promise<void> {
  const apiKey = ENV.SENDGRID_API_KEY;
  
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }

  const fromAddress = payload.from || ENV.EMAIL_FROM_DEFAULT || "noreply@questhire.com";
  // Parse "Name <email>" format
  const fromMatch = fromAddress.match(/^(.+?)\s*<(.+)>$/);
  const from = fromMatch 
    ? { name: fromMatch[1], email: fromMatch[2] }
    : { email: fromAddress };

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: payload.to }] }],
      from,
      subject: payload.subject,
      content: [
        ...(payload.text ? [{ type: "text/plain", value: payload.text }] : []),
        { type: "text/html", value: payload.html },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid API error: ${response.status} - ${error}`);
  }

  logInfo("Email sent via SendGrid", { 
    to: payload.to,
    subject: payload.subject,
  });
}

// =============================================================================
// EMAIL SENDER
// =============================================================================

/**
 * Determine which email provider to use
 */
function getEmailProvider(): EmailProvider {
  // In development, always use console unless explicitly configured
  if (ENV.IS_DEVELOPMENT) {
    const explicitProvider = ENV.EMAIL_PROVIDER;
    if (explicitProvider === "resend" && ENV.RESEND_API_KEY) {
      return "resend";
    }
    if (explicitProvider === "sendgrid" && ENV.SENDGRID_API_KEY) {
      return "sendgrid";
    }
    return "console";
  }

  // In production, use configured provider
  const provider = ENV.EMAIL_PROVIDER as EmailProvider;
  
  if (provider === "resend" && ENV.RESEND_API_KEY) {
    return "resend";
  }
  
  if (provider === "sendgrid" && ENV.SENDGRID_API_KEY) {
    return "sendgrid";
  }

  // Fallback to console with warning
  logWarn("No email provider configured for production - emails will be logged only");
  return "console";
}

/**
 * Send an email
 * 
 * Automatically selects the appropriate provider based on configuration.
 * In development: logs to console
 * In production: sends via Resend, SendGrid, or configured provider
 * 
 * Errors are logged but don't crash the caller - email sending is non-critical.
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  const provider = getEmailProvider();

  try {
    switch (provider) {
      case "resend":
        await sendViaResend(payload);
        break;
      case "sendgrid":
        await sendViaSendGrid(payload);
        break;
      case "console":
      default:
        await sendViaConsole(payload);
        break;
    }
  } catch (error) {
    // Log the error but don't throw - email failures shouldn't crash the app
    logError("Failed to send email", {
      provider,
      to: payload.to,
      subject: payload.subject,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    // Capture for monitoring
    captureException(error, {
      route: "email",
      errorCode: "EMAIL_SEND_FAILED",
    });
    
    // Don't rethrow - email is non-critical
  }
}

/**
 * Check if email sending is properly configured for production
 */
export function isEmailConfigured(): boolean {
  if (ENV.IS_DEVELOPMENT) return true; // Console logging always works
  
  const provider = ENV.EMAIL_PROVIDER;
  if (provider === "resend" && ENV.RESEND_API_KEY) return true;
  if (provider === "sendgrid" && ENV.SENDGRID_API_KEY) return true;
  
  return false;
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

type TemplateType =
  | "new_application_agency"
  | "new_application_candidate"
  | "team_invitation"
  | "application_status_update"
  | "matching_job_candidate";

interface TemplateData {
  new_application_agency: {
    candidateName: string;
    jobTitle: string;
    agencyName: string;
    applicationUrl: string;
  };
  new_application_candidate: {
    candidateName: string;
    jobTitle: string;
    agencyName: string;
  };
  team_invitation: {
    inviterName: string;
    agencyName: string;
    role: string;
    loginUrl: string;
  };
  application_status_update: {
    candidateName: string;
    jobTitle: string;
    agencyName: string;
    newStatus: string;
  };
  matching_job_candidate: {
    candidateName: string;
    jobTitle: string;
    agencyName: string;
    jobUrl: string;
    location?: string;
  };
}

/**
 * Render an email template
 */
export function renderTemplate<T extends TemplateType>(
  type: T,
  data: TemplateData[T]
): EmailTemplate {
  switch (type) {
    case "new_application_agency": {
      const d = data as TemplateData["new_application_agency"];
      return {
        subject: `New application for ${d.jobTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">New Application Received</h2>
            <p>Hi,</p>
            <p><strong>${d.candidateName}</strong> has applied for the position of <strong>${d.jobTitle}</strong> at ${d.agencyName}.</p>
            <p>
              <a href="${d.applicationUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View Application
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">— The QuestHire Team</p>
          </div>
        `,
        text: `New Application Received\n\n${d.candidateName} has applied for ${d.jobTitle} at ${d.agencyName}.\n\nView application: ${d.applicationUrl}`,
      };
    }

    case "new_application_candidate": {
      const d = data as TemplateData["new_application_candidate"];
      return {
        subject: `Application received for ${d.jobTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Application Received</h2>
            <p>Hi ${d.candidateName},</p>
            <p>Thank you for applying for the position of <strong>${d.jobTitle}</strong> at <strong>${d.agencyName}</strong>.</p>
            <p>We have received your application and will review it shortly. If your profile matches our requirements, we will contact you for the next steps.</p>
            <p>Best regards,<br/>The ${d.agencyName} Team</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #666; font-size: 12px;">This email was sent via QuestHire. If you did not apply for this position, please ignore this email.</p>
          </div>
        `,
        text: `Hi ${d.candidateName},\n\nThank you for applying for ${d.jobTitle} at ${d.agencyName}.\n\nWe have received your application and will review it shortly.\n\nBest regards,\nThe ${d.agencyName} Team`,
      };
    }

    case "team_invitation": {
      const d = data as TemplateData["team_invitation"];
      return {
        subject: `You've been invited to join ${d.agencyName} on QuestHire`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">You're Invited!</h2>
            <p>Hi,</p>
            <p><strong>${d.inviterName}</strong> has invited you to join <strong>${d.agencyName}</strong> on QuestHire as a <strong>${d.role}</strong>.</p>
            <p>
              <a href="${d.loginUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Accept Invitation
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">— The QuestHire Team</p>
          </div>
        `,
        text: `You're Invited!\n\n${d.inviterName} has invited you to join ${d.agencyName} on QuestHire as a ${d.role}.\n\nAccept invitation: ${d.loginUrl}`,
      };
    }

    case "application_status_update": {
      const d = data as TemplateData["application_status_update"];
      return {
        subject: `Update on your application for ${d.jobTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">Application Update</h2>
            <p>Hi ${d.candidateName},</p>
            <p>There's an update on your application for <strong>${d.jobTitle}</strong> at <strong>${d.agencyName}</strong>.</p>
            <p>Your application status is now: <strong>${d.newStatus}</strong></p>
            <p>Best regards,<br/>The ${d.agencyName} Team</p>
          </div>
        `,
        text: `Hi ${d.candidateName},\n\nThere's an update on your application for ${d.jobTitle} at ${d.agencyName}.\n\nYour application status is now: ${d.newStatus}\n\nBest regards,\nThe ${d.agencyName} Team`,
      };
    }

    case "matching_job_candidate": {
      const d = data as TemplateData["matching_job_candidate"];
      const locationText = d.location ? ` in ${d.location}` : "";
      return {
        subject: `New job opportunity: ${d.jobTitle}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #4F46E5;">A Job That Might Interest You!</h2>
            <p>Hi ${d.candidateName},</p>
            <p>We have a new job opening that matches your profile:</p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="margin: 0 0 8px 0; color: #1e293b;">${d.jobTitle}</h3>
              <p style="margin: 0; color: #64748b;">${d.agencyName}${locationText}</p>
            </div>
            <p>
              <a href="${d.jobUrl}" style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                View Job & Apply
              </a>
            </p>
            <p style="color: #666; font-size: 14px;">Best regards,<br/>The ${d.agencyName} Team</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #999; font-size: 12px;">You're receiving this because you previously applied to ${d.agencyName} and agreed to be contacted about job opportunities.</p>
          </div>
        `,
        text: `Hi ${d.candidateName},\n\nWe have a new job opening that matches your profile:\n\n${d.jobTitle} at ${d.agencyName}${locationText}\n\nView and apply: ${d.jobUrl}\n\nBest regards,\nThe ${d.agencyName} Team`,
      };
    }

    default:
      throw new Error(`Unknown email template type: ${type}`);
  }
}

/**
 * Send a templated email
 */
export async function sendTemplatedEmail<T extends TemplateType>(
  to: string,
  type: T,
  data: TemplateData[T]
): Promise<void> {
  const template = renderTemplate(type, data);
  await sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}
