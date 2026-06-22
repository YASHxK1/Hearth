export function formatConversationReference(id: string): string {
  const firstDash = id.indexOf("-");
  if (firstDash === -1) {
    return id;
  }

  return id.slice(0, firstDash + 1);
}
