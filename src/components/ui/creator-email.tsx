type CreatorEmailProps = {
  emails?: string[];
};

/** Only display accounts linked by the API; never infer an uploader from a name. */
export function CreatorEmail({ emails }: CreatorEmailProps) {
  const uniqueEmails = [...new Set(emails?.filter(Boolean) || [])];
  if (!uniqueEmails.length) {
    return <span className="text-muted-foreground">Non renseigné</span>;
  }
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      {uniqueEmails.map((email) => (
        <div key={email} className="break-all" title={email}>{email}</div>
      ))}
    </div>
  );
}
