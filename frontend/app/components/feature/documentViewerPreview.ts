/** Client-side preview routing when server `previewPageCount` is 0. */

export type ClientPreviewMode =
  | 'pdf-canvas'
  | 'image'
  | 'video'
  | 'audio'
  | 'text'
  | 'unsupported-binary'
  | 'no-file-url';

const IMAGE_EXT = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'bmp',
  'svg',
  'ico',
  'avif',
  'tif',
  'tiff',
]);

const VIDEO_EXT = new Set(['mp4', 'webm', 'ogg', 'ogv', 'mov', 'm4v']);

const AUDIO_EXT = new Set(['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'wma']);

const TEXT_EXT = new Set([
  'txt',
  'csv',
  'tsv',
  'json',
  'md',
  'log',
  'xml',
  'html',
  'htm',
  'css',
  'scss',
  'less',
  'js',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'jsx',
  'vue',
  'yaml',
  'yml',
  'env',
  'sh',
  'bat',
  'ps1',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'sql',
  'graphql',
  'properties',
  'toml',
  'ini',
  'cfg',
  'gitignore',
]);

const OFFICE_EXT = new Set([
  'doc',
  'docx',
  'dot',
  'dotx',
  'xls',
  'xlsx',
  'xlsm',
  'xlsb',
  'ppt',
  'pptx',
  'potx',
  'odt',
  'ods',
  'odp',
  'rtf',
]);

export function fileExtension(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  if (i < 0 || i === fileName.length - 1) return '';
  return fileName.slice(i + 1).toLowerCase();
}

export function inferClientPreviewMode(fileName: string, fileType: string): ClientPreviewMode {
  const ext = fileExtension(fileName);
  const ft = (fileType || '').toLowerCase();

  if (ext === 'pdf' || ft.includes('pdf')) return 'pdf-canvas';
  if (IMAGE_EXT.has(ext) || ft.startsWith('image/')) return 'image';
  if (VIDEO_EXT.has(ext) || ft.startsWith('video/')) return 'video';
  if (AUDIO_EXT.has(ext) || ft.startsWith('audio/')) return 'audio';

  if (
    OFFICE_EXT.has(ext) ||
    ft.includes('wordprocessingml') ||
    ft.includes('msword') ||
    ft.includes('spreadsheetml') ||
    ft.includes('excel') ||
    ft.includes('presentationml') ||
    ft.includes('powerpoint') ||
    ft.includes('opendocument')
  ) {
    return 'unsupported-binary';
  }

  if (
    TEXT_EXT.has(ext) ||
    ft.includes('text/plain') ||
    ft.includes('text/csv') ||
    ft.includes('application/json') ||
    ft.includes('text/html') ||
    ft.includes('text/xml') ||
    ft.includes('application/xml') ||
    ft.includes('text/css') ||
    ft.includes('text/javascript') ||
    ft.includes('application/javascript')
  ) {
    return 'text';
  }

  return 'unsupported-binary';
}

export const MAX_TEXT_PREVIEW_BYTES = 1_500_000;
