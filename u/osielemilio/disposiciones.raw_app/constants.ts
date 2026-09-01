// constants.ts

export const ETAPAS: Record<number, { nombre: string; rol: string; tiempo_horas: number | null; corto: string }> = {
  1: { nombre: 'Registro de operación', rol: 'cobranza', tiempo_horas: null, corto: 'REG' },
  2: { nombre: 'Vo Bo Análisis', rol: 'analisis_credito', tiempo_horas: 24, corto: 'Vo.Bo' },
  3: { nombre: 'Documentación', rol: 'cobranza', tiempo_horas: 2, corto: 'Docs' },
  4: { nombre: 'Revisión gerencia', rol: 'gerente_credito', tiempo_horas: 2, corto: 'Gerencia' },
  5: { nombre: 'Mesa de control', rol: 'mesa_control', tiempo_horas: 2, corto: 'Mesa Ctrl' },
  6: { nombre: 'Dirección general', rol: 'direccion_general', tiempo_horas: 2, corto: 'Dir.Gral' },
  7: { nombre: 'Notificación disposición', rol: 'mesa_control', tiempo_horas: 2, corto: 'Notif.' },
  8: { nombre: 'Dispersión recursos', rol: 'tesoreria', tiempo_horas: 1, corto: 'Dispersión' },
  9: { nombre: 'Envío documentos', rol: 'cobranza', tiempo_horas: null, corto: 'Envío' },
};

export const ROLES = [
  { value: 'cobranza', label: 'Cobranza', email: 'cobranza@ucda.com.mx', username: 'cobranza' },
  { value: 'analisis_credito', label: 'Análisis de Crédito', email: 'analistadecredito@ucda.com.mx', username: 'analistadecredito' },
  { value: 'gerente_credito', label: 'Gerente de Crédito', email: 'claudiac@ucda.com.mx', username: 'claudiac' },
  { value: 'mesa_control', label: 'Mesa de Control', email: 'ninar@ucda.com.mx', username: 'ninar' },
  { value: 'direccion_general', label: 'Dirección General', email: 'mariog@ucda.com.mx', username: 'mariog' },
  { value: 'tesoreria', label: 'Tesorería', email: 'veronicam@ucda.com.mx', username: 'veronicam' },
];

export const PRODUCTOS = [
  { value: 'cuenta_corriente', label: 'Cuenta Corriente' },
  { value: 'plan_piso', label: 'Plan Piso' },
  { value: 'garantia_hipotecaria', label: 'Garantía Hipotecaria' },
  { value: 'garantia_liquida', label: 'Garantía Líquida' },
  { value: 'garantia_inmobiliaria', label: 'Garantía Inmobiliaria' },
  { value: 'prendaria_flotillas', label: 'Prendaria Flotillas' },
];

export const COLORS = {
  primary: '#0ea5e9',
  primaryDark: '#0284c7',
  success: '#10b981',
  danger: '#dc2626',
  warning: '#f59e0b',
  dark: '#0f172a',
  text: '#334155',
  textLight: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
  gray: '#94a3b8',
};