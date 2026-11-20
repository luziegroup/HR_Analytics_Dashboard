export interface DriveFolder {
  id: string;
  name: string;
  modifiedTime?: string;
}

export interface DriveKpiFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const GOOGLE_SHEET_MIME = 'application/vnd.google-apps.spreadsheet';

export function extractDriveFolderId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  // Match URLs like https://drive.google.com/drive/folders/<ID>?usp=sharing
  // or https://drive.google.com/drive/u/0/folders/<ID>
  const urlMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch?.[1]) {
    return urlMatch[1];
  }

  // Match query parameter id=<ID>
  const queryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (queryMatch?.[1]) {
    return queryMatch[1];
  }

  return trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
}

async function driveFetch(url: string, accessToken: string): Promise<Response> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.status === 401) {
    throw new Error('Sesi Google Drive berakhir. Silakan masuk ulang dengan akun Google.');
  }

  if (!res.ok) {
    let message = `Permintaan Google Drive gagal (${res.status})`;
    try {
      const errJson = (await res.json()) as { error?: { message?: string } };
      if (errJson.error?.message) {
        message = errJson.error.message;
      }
    } catch {
      // Ignore JSON parse errors on error payloads
    }
    throw new Error(message);
  }

  return res;
}

export async function listDriveFolders(
  accessToken: string,
  searchTerm = '',
): Promise<DriveFolder[]> {
  const escaped = searchTerm.trim().replace(/'/g, "\\'");
  const nameFilter = escaped ? ` and name contains '${escaped}'` : '';
  const q = `mimeType = '${GOOGLE_FOLDER_MIME}' and trashed = false${nameFilter}`;
  const params = new URLSearchParams({
    q,
    fields: 'files(id,name,modifiedTime)',
    orderBy: 'modifiedTime desc',
    pageSize: '25',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
  });

  const res = await driveFetch(`${DRIVE_API_BASE}/files?${params.toString()}`, accessToken);
  const data = (await res.json()) as { files?: DriveFolder[] };
  return data.files ?? [];
}

export async function getDriveFolderMetadata(
  accessToken: string,
  folderId: string,
): Promise<DriveFolder> {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,modifiedTime',
    supportsAllDrives: 'true',
  });
  const res = await driveFetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(folderId)}?${params.toString()}`,
    accessToken,
  );
  const data = (await res.json()) as DriveFolder & { mimeType?: string };
  if (data.mimeType && data.mimeType !== GOOGLE_FOLDER_MIME) {
    throw new Error(`"${data.name}" bukan merupakan folder Google Drive.`);
  }
  return { id: data.id, name: data.name, modifiedTime: data.modifiedTime };
}

export async function listFolderKpiFiles(
  accessToken: string,
  folderId: string,
): Promise<DriveKpiFile[]> {
  const safeId = folderId.replace(/'/g, "\\'");
  const q = `'${safeId}' in parents and trashed = false and (mimeType = 'text/csv' or mimeType = '${GOOGLE_SHEET_MIME}' or mimeType = 'text/plain' or name contains '.csv')`;
  const params = new URLSearchParams({
    q,
    fields: 'files(id,name,mimeType,modifiedTime,size,webViewLink)',
    orderBy: 'modifiedTime desc',
    pageSize: '50',
    includeItemsFromAllDrives: 'true',
    supportsAllDrives: 'true',
  });

  const res = await driveFetch(`${DRIVE_API_BASE}/files?${params.toString()}`, accessToken);
  const data = (await res.json()) as { files?: DriveKpiFile[] };
  return data.files ?? [];
}

export async function fetchDriveFileCsvText(
  accessToken: string,
  file: DriveKpiFile,
): Promise<string> {
  if (file.mimeType === GOOGLE_SHEET_MIME) {
    const params = new URLSearchParams({ mimeType: 'text/csv' });
    const res = await driveFetch(
      `${DRIVE_API_BASE}/files/${encodeURIComponent(file.id)}/export?${params.toString()}`,
      accessToken,
    );
    return res.text();
  }

  const params = new URLSearchParams({
    alt: 'media',
    supportsAllDrives: 'true',
  });
  const res = await driveFetch(
    `${DRIVE_API_BASE}/files/${encodeURIComponent(file.id)}?${params.toString()}`,
    accessToken,
  );
  return res.text();
}

export function isGoogleSheetFile(file: DriveKpiFile): boolean {
  return file.mimeType === GOOGLE_SHEET_MIME;
}
