import React, { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  Link2,
  LogOut,
  RefreshCw,
  Search,
  Unlink,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionCard } from '@/components/ui/SectionCard';
import {
  clearAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from '@/services/googleAuth';
import {
  extractDriveFolderId,
  fetchDriveFileCsvText,
  getDriveFolderMetadata,
  isGoogleSheetFile,
  listDriveFolders,
  listFolderKpiFiles,
  type DriveFolder,
  type DriveKpiFile,
} from '@/services/googleDriveService';
import type { KpiMetric } from '@/types/kpi';
import { parseKpisFromCsv } from '@/utils/kpiCsv';

const LINKED_FOLDER_STORAGE_KEY = 'luzie_linked_drive_folder';

interface LinkedFolderInfo {
  id: string;
  name: string;
}

interface GoogleDriveConnectorProps {
  onDatasetLoaded: (kpis: KpiMetric[], sourceLabel: string) => void;
}

export const GoogleDriveConnector: React.FC<GoogleDriveConnectorProps> = ({
  onDatasetLoaded,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [linkedFolder, setLinkedFolder] = useState<LinkedFolderInfo | null>(() => {
    try {
      const raw = localStorage.getItem(LINKED_FOLDER_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LinkedFolderInfo) : null;
    } catch {
      return null;
    }
  });

  const [folderInput, setFolderInput] = useState('');
  const [folderSearch, setFolderSearch] = useState('');
  const [availableFolders, setAvailableFolders] = useState<DriveFolder[]>([]);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);

  const [folderFiles, setFolderFiles] = useState<DriveKpiFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fetchingFileId, setFetchingFileId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleAuthError = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Permintaan ke Google Drive gagal.';
    const lower = msg.toLowerCase();
    if (
      lower.includes('sesi google drive berakhir') ||
      lower.includes('session expired')
    ) {
      clearAccessToken();
      setNeedsAuth(true);
    }
    setError(msg);
  }, []);

  const refreshFolderFiles = useCallback(
    async (folderId: string) => {
      const token = getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        return;
      }
      setLoadingFiles(true);
      setError(null);
      try {
        const files = await listFolderKpiFiles(token, folderId);
        setFolderFiles(files);
      } catch (err) {
        handleAuthError(err);
      } finally {
        setLoadingFiles(false);
      }
    },
    [handleAuthError],
  );

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      },
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!needsAuth && linkedFolder && getAccessToken()) {
      void refreshFolderFiles(linkedFolder.id);
    }
  }, [needsAuth, linkedFolder, refreshFolderFiles]);

  const handleSignIn = async () => {
    setError(null);
    setStatusMessage(null);
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      setUser(res.user);
      setNeedsAuth(false);
      if (linkedFolder) {
        await refreshFolderFiles(linkedFolder.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Proses masuk Google gagal.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setFolderFiles([]);
    setAvailableFolders([]);
    setShowFolderPicker(false);
    setStatusMessage(null);
    setError(null);
  };

  const saveLinkedFolder = (folder: LinkedFolderInfo) => {
    setLinkedFolder(folder);
    try {
      localStorage.setItem(LINKED_FOLDER_STORAGE_KEY, JSON.stringify(folder));
    } catch {
      // Ignore storage quota issues
    }
  };

  const handleLinkByInput = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    const folderId = extractDriveFolderId(folderInput);
    if (!folderId) {
      setError('Masukkan URL atau ID folder Google Drive yang valid.');
      return;
    }

    setLoadingFiles(true);
    try {
      const meta = await getDriveFolderMetadata(token, folderId);
      saveLinkedFolder({ id: meta.id, name: meta.name });
      setFolderInput('');
      setShowFolderPicker(false);
      setStatusMessage(`Folder Google Drive "${meta.name}" berhasil ditautkan.`);
      await refreshFolderFiles(meta.id);
    } catch (err) {
      handleAuthError(err);
      setLoadingFiles(false);
    }
  };

  const handleBrowseFolders = async (query = folderSearch) => {
    setError(null);
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setShowFolderPicker(true);
    setLoadingFolders(true);
    try {
      const folders = await listDriveFolders(token, query);
      setAvailableFolders(folders);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleSelectFolder = async (folder: DriveFolder) => {
    saveLinkedFolder({ id: folder.id, name: folder.name });
    setShowFolderPicker(false);
    setStatusMessage(`Folder Google Drive "${folder.name}" berhasil ditautkan.`);
    await refreshFolderFiles(folder.id);
  };

  const handleUnlinkFolder = () => {
    setLinkedFolder(null);
    setFolderFiles([]);
    setStatusMessage(null);
    try {
      localStorage.removeItem(LINKED_FOLDER_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const handleFetchSingleFile = async (file: DriveKpiFile) => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setFetchingFileId(file.id);
    setError(null);
    setStatusMessage(null);
    try {
      const csvText = await fetchDriveFileCsvText(token, file);
      const { kpis, warnings } = parseKpisFromCsv(csvText);
      onDatasetLoaded(kpis, `Drive: ${file.name}`);
      const warnSuffix =
        warnings.length > 0 ? ` (${warnings.length} catatan baris dilewati)` : '';
      setStatusMessage(
        `Berhasil memuat ${kpis.length} target KPI dari "${file.name}"${warnSuffix}.`,
      );
    } catch (err) {
      handleAuthError(err);
    } finally {
      setFetchingFileId(null);
    }
  };

  const handleSyncAllFolderFiles = async () => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    if (folderFiles.length === 0 || !linkedFolder) return;

    setSyncingAll(true);
    setError(null);
    setStatusMessage(null);
    try {
      const merged: KpiMetric[] = [];
      let loadedFiles = 0;

      for (const file of folderFiles) {
        const csvText = await fetchDriveFileCsvText(token, file);
        const { kpis } = parseKpisFromCsv(csvText);
        kpis.forEach((item, idx) => {
          merged.push({
            ...item,
            id: `DRV-${loadedFiles + 1}-${idx + 1}`,
          });
        });
        loadedFiles += 1;
      }

      if (merged.length === 0) {
        throw new Error('Tidak ditemukan baris KPI yang valid di berkas mana pun dalam folder ini.');
      }

      onDatasetLoaded(merged, `Folder Drive: ${linkedFolder.name}`);
      setStatusMessage(
        `Berhasil menyinkronkan ${merged.length} target KPI dari ${loadedFiles} berkas di "${linkedFolder.name}".`,
      );
    } catch (err) {
      handleAuthError(err);
    } finally {
      setSyncingAll(false);
    }
  };

  return (
    <SectionCard
      title="Sinkronisasi Folder KPI Google Drive"
      subtitle="Tautkan folder Google Drive yang berisi spreadsheet KPI leader (.csv atau Google Sheets) dan muat pembaruannya secara langsung."
      action={
        !needsAuth && user ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-600 hidden sm:inline">
              Masuk sebagai <strong className="text-slate-900">{user.email}</strong>
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar
            </button>
          </div>
        ) : undefined
      }
    >
      {needsAuth ? (
        <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">
              Hubungkan akun Google Anda untuk mengakses folder Drive
            </p>
            <p className="text-xs text-slate-500">
              Akses baca-saja digunakan khusus untuk menampilkan folder pilihan dan mengambil berkas KPI (.csv atau Google Sheets).
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="gsi-material-button shrink-0"
          >
            <div className="gsi-material-button-state" />
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {isSigningIn ? 'Sedang masuk...' : 'Masuk dengan Google'}
              </span>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Folder Linking Bar */}
          {!linkedFolder ? (
            <div className="space-y-4">
              <form
                onSubmit={handleLinkByInput}
                className="flex flex-col sm:flex-row gap-2.5"
              >
                <div className="relative flex-1">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={folderInput}
                    onChange={(e) => setFolderInput(e.target.value)}
                    placeholder="Tempel URL Folder atau ID Folder Google Drive..."
                    aria-label="URL atau ID Folder Google Drive"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Tautkan Folder
                </button>
                <button
                  type="button"
                  onClick={() => void handleBrowseFolders('')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  Telusuri Folder Drive
                </button>
              </form>

              {showFolderPicker && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="search"
                        value={folderSearch}
                        onChange={(e) => setFolderSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleBrowseFolders(folderSearch);
                          }
                        }}
                        placeholder="Cari nama folder lalu tekan Enter..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleBrowseFolders(folderSearch)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cari
                    </button>
                  </div>

                  {loadingFolders ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      Memuat daftar folder Google Drive Anda...
                    </div>
                  ) : availableFolders.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      Tidak ditemukan folder yang cocok di Google Drive.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-200 bg-white border border-slate-200 rounded-lg">
                      {availableFolders.map((folder) => (
                        <button
                          key={folder.id}
                          type="button"
                          onClick={() => void handleSelectFolder(folder)}
                          className="w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <FolderOpen className="w-4 h-4 text-blue-600 shrink-0" />
                            <span className="text-xs font-medium text-slate-900 truncate">
                              {folder.name}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400 shrink-0">
                            Pilih
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Linked Folder Header */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <FolderOpen className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">
                      {linkedFolder.name}
                    </div>
                    <div className="text-xs font-mono text-slate-500 truncate">
                      ID Folder: {linkedFolder.id}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void refreshFolderFiles(linkedFolder.id)}
                    disabled={loadingFiles}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${loadingFiles ? 'animate-spin' : ''}`}
                    />
                    Muat Ulang
                  </button>

                  {folderFiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void handleSyncAllFolderFiles()}
                      disabled={syncingAll}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${syncingAll ? 'animate-spin' : ''}`}
                      />
                      {syncingAll ? 'Menyinkronkan...' : 'Sinkronkan Semua Berkas'}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleUnlinkFolder}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-700 bg-white border border-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Putus Tautan
                  </button>
                </div>
              </div>

              {/* Files in Folder */}
              {loadingFiles ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  Mengambil daftar berkas sumber data KPI dari Google Drive...
                </div>
              ) : folderFiles.length === 0 ? (
                <EmptyState
                  title="Tidak ada berkas CSV atau Google Sheets di folder ini"
                  description="Tambahkan kartu skor KPI berformat .csv atau Google Sheets ke folder ini, lalu klik Muat Ulang."
                />
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                        <th className="py-2.5 px-4">Nama Berkas</th>
                        <th className="py-2.5 px-4">Format</th>
                        <th className="py-2.5 px-4">Terakhir Diubah</th>
                        <th className="py-2.5 px-4 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {folderFiles.map((file) => {
                        const isSheet = isGoogleSheetFile(file);
                        const isFetching = fetchingFileId === file.id;
                        return (
                          <tr key={file.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2 font-medium text-slate-900">
                                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="truncate">{file.name}</span>
                                {file.webViewLink && (
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Buka ${file.name} di Google Drive`}
                                    className="text-slate-400 hover:text-blue-600"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 font-mono">
                              {isSheet ? 'Google Sheet' : 'CSV'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 font-mono tabular-nums">
                              {file.modifiedTime
                                ? new Date(file.modifiedTime).toLocaleDateString('id-ID')
                                : '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => void handleFetchSingleFile(file)}
                                disabled={isFetching || syncingAll}
                                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                              >
                                {isFetching ? 'Memuat...' : 'Muat ke Dasbor'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {statusMessage && (
            <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
};
