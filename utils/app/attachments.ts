import { Attachment } from '@/types/chat';

export const MAX_IMAGES_PER_MESSAGE = 6;
export const MAX_FILES_PER_MESSAGE = 10;
export const MAX_TOTAL_BYTES = 300 * 1024 * 1024;
export const MAX_IMAGE_DIMENSION = 1568;
export const MAX_TEXT_LENGTH = 60000;
export const MAX_PDF_PAGES = 15;
export const MAX_PDF_LENGTH = 100000;

export const formatMB = (bytes: number): string => {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const TEXT_EXTENSIONS = [
  'txt',
  'md',
  'markdown',
  'csv',
  'tsv',
  'json',
  'xml',
  'yml',
  'yaml',
  'toml',
  'log',
  'ini',
  'cfg',
  'env',
  'html',
  'htm',
  'css',
  'scss',
  'less',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'ts',
  'tsx',
  'py',
  'rb',
  'php',
  'java',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'go',
  'rs',
  'swift',
  'kt',
  'sh',
  'bash',
  'zsh',
  'ps1',
  'bat',
  'sql',
  'r',
  'lua',
  'pl',
  'dart',
  'scala',
  'coffee',
];

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isPdfFile = (file: File): boolean => {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
};

export const getFileExtension = (file: File): string => {
  const name = file.name.toLowerCase();
  const index = name.lastIndexOf('.');
  return index >= 0 ? name.slice(index + 1) : '';
};

export const isTextFile = (file: File): boolean => {
  return TEXT_EXTENSIONS.includes(getFileExtension(file));
};

export const isSupportedFile = (file: File): boolean => {
  return isImageFile(file) || isPdfFile(file) || isTextFile(file);
};

export const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const resizeImageToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        try {
          const scale = Math.min(
            1,
            MAX_IMAGE_DIMENSION / Math.max(image.width, image.height),
          );
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
          resolve(reader.result as string);
        }
      };
      image.onerror = () => resolve(reader.result as string);
      image.src = reader.result as string;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const readTextFile = async (file: File): Promise<string> => {
  const text = await file.text();
  return text.length > MAX_TEXT_LENGTH
    ? text.slice(0, MAX_TEXT_LENGTH)
    : text;
};

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

export const getPdfJs = (): Promise<typeof import('pdfjs-dist')> => {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.js',
          import.meta.url,
        ).toString();
      } catch {
        // worker URL unavailable; pdf.js falls back to the main thread
      }
      return pdfjs;
    });
  }
  return pdfjsPromise;
};

export const extractPdfText = async (file: File): Promise<string> => {
  const pdfjs = await getPdfJs();
  const doc = await pdfjs.getDocument({
    data: await file.arrayBuffer(),
  }).promise;

  let text = '';
  const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES);

  for (let i = 1; i <= pageCount; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    text += `--- Page ${i} ---\n${pageText}\n`;

    if (text.length > MAX_PDF_LENGTH) {
      break;
    }
  }

  await doc.destroy();

  return text.length > MAX_PDF_LENGTH
    ? text.slice(0, MAX_PDF_LENGTH)
    : text;
};

export const fileToAttachment = async (
  file: File,
  supportsVision: boolean,
): Promise<Attachment> => {
  const fileName = file.name || 'file';

  if (supportsVision && isImageFile(file)) {
    const dataUrl = await resizeImageToDataUrl(file);
    return {
      type: 'image',
      fileName,
      mimeType: file.type || 'image/*',
      dataUrl,
      extracted: true,
    };
  }

  if (isPdfFile(file)) {
    const rawText = await extractPdfText(file);
    return {
      type: 'file',
      fileName,
      mimeType: file.type || 'application/pdf',
      rawText,
      extracted: true,
    };
  }

  if (isTextFile(file)) {
    const rawText = await readTextFile(file);
    return {
      type: 'file',
      fileName,
      mimeType: file.type || 'text/plain',
      rawText,
      extracted: true,
    };
  }

  return {
    type: 'file',
    fileName,
    mimeType: file.type || 'application/octet-stream',
    extracted: false,
  };
};