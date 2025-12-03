import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface ContactWarningProps {
  lastContactedAt: string | Date | null | undefined;
  lastContactedByName?: string | null;
  thresholdHours?: number;
}

export function ContactWarning({ lastContactedAt, lastContactedByName, thresholdHours = 48 }: ContactWarningProps) {
  if (!lastContactedAt) return null;

  const lastContact = new Date(lastContactedAt);
  const now = new Date();
  const diffInMs = now.getTime() - lastContact.getTime();
  const hoursDiff = Math.floor(diffInMs / (1000 * 60 * 60));

  if (hoursDiff >= thresholdHours) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Attention : Contact récent</AlertTitle>
      <AlertDescription>
        Ce candidat a été contacté il y a {hoursDiff} heures 
        {lastContactedByName ? ` par ${lastContactedByName}` : ""}.
        Vérifiez l'historique avant de le solliciter à nouveau.
      </AlertDescription>
    </Alert>
  );
}
