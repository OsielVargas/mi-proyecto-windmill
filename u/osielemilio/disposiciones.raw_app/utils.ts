import { COLORS } from './constants';

export const detectarTipoDoc = (url: string): 'pdf' | 'imagen' | 'drive' | 'url' => {
  if (!url) return 'url';
  const lower = url.toLowerCase();
  const urlSinParams = lower.split('?')[0];
  if (lower.includes('drive.google.com/file/d/') && lower.includes('/preview')) return 'drive';
  if (lower.startsWith('data:application/pdf') || urlSinParams.endsWith('.pdf')) return 'pdf';
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)/.test(urlSinParams) || lower.startsWith('data:image')) return 'imagen';
  return 'url';
};

export const formatearHoras = (horas: number): string => {
  if (horas < 1) return `${Math.round(horas * 60)} min`;
  if (horas < 24) return `${horas.toFixed(1)} h`;
  const dias = Math.floor(horas / 24);
  const horasRest = Math.round((horas % 24) * 10) / 10;
  return `${dias}d ${horasRest}h`;
};

export const colorTiempo = (horas: number, limite?: number): string => {
  if (limite && horas > limite) return COLORS.danger;
  if (horas > 24) return COLORS.danger;
  if (horas > 4) return COLORS.warning;
  return COLORS.success;
};