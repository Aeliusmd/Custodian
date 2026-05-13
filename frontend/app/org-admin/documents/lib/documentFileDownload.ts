import type { DocumentRecord } from '@/mocks/documents';

export async function downloadOrgAdminDocumentFile(
  apiBaseUrl: string,
  doc: DocumentRecord,
  onNotify: (message: string, type?: 'success' | 'error') => void,
): Promise<void> {
  const url = `${apiBaseUrl}/protected/org-admin/documents/${encodeURIComponent(doc.id)}/file`;
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) {
      let msg = `Download failed (${response.status})`;
      try {
        const body = (await response.json()) as { message?: string };
        if (body?.message) msg = body.message;
      } catch {
        // keep msg
      }
      onNotify(msg, 'error');
      return;
    }
    const blob = await response.blob();
    const cd = response.headers.get('Content-Disposition');
    let filename = doc.name;
    const quoted = cd?.match(/filename="([^"]+)"/i);
    const star = cd?.match(/filename\*=UTF-8''([^;\s]+)/i);
    const raw = quoted?.[1] ?? star?.[1];
    if (raw) {
      try {
        filename = decodeURIComponent(raw);
      } catch {
        filename = raw;
      }
    }
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
    onNotify(`Downloaded "${filename}"`, 'success');
  } catch {
    onNotify('Download failed.', 'error');
  }
}
