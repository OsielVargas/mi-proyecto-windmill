import React, { useMemo } from 'react';
import { COLORS, PRODUCTOS } from '../constants';
import { TimelineEtapa } from './TimelineEtapa';

interface OperationRowProps {
  op: any;
  idx: number;
  onView: () => void;
}

export const OperationRow = React.memo(({ op, idx, onView }: OperationRowProps) => {
  const t = useMemo(() => {
    const horas = op.tiempo_max_horas;
    if (!horas || !op.fecha_creacion) return null;
    const creado = new Date(op.fecha_creacion);
    const limite = new Date(creado.getTime() + horas * 60 * 60 * 1000);
    const diff = limite.getTime() - new Date().getTime();
    return { horas: Math.floor(diff / (1000 * 60 * 60)), min: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)), vencido: diff < 0 };
  }, [op.tiempo_max_horas, op.fecha_creacion]);

  const badgeStyle = useMemo(() => {
    const map: Record<string, string> = { finalizada: COLORS.success, rechazada: COLORS.danger, condicionada: COLORS.warning };
    return { background: map[op.estado] || COLORS.primary, color: COLORS.white, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-block' };
  }, [op.estado]);

  return (
    <tr style={{ background: idx % 2 === 1 ? '#fafafa' : COLORS.white, transition: 'background 0.15s' }}>
      <td style={{ padding: '16px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 600, fontSize: 14 }}>{op.id?.slice(0, 8)}...</td>
      <td style={{ padding: '16px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 15 }}>{op.nombre_solicitante}</td>
      <td style={{ padding: '16px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 15, fontWeight: 700, color: COLORS.success, whiteSpace: 'nowrap' }}>{op.monto ? `$${Number(op.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}</td>
      <td style={{ padding: '16px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: 20, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{PRODUCTOS.find(p => p.value === op.producto)?.label || op.producto || '—'}</span>
      </td>
      <td style={{ padding: '16px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: COLORS.textLight, whiteSpace: 'nowrap' }}>{op.fecha_operacion ? <span style={{ fontWeight: 600, color: COLORS.dark }}>📅 {op.fecha_operacion}</span> : '—'}</td>
      <td style={{ padding: '16px 14px', borderBottom: '1px solid #f1f5f9' }}><span style={badgeStyle}>{op.estado?.toUpperCase()}</span></td>
      <td style={{ padding: '16px 14px', borderBottom: '1px solid #f1f5f9' }}><TimelineEtapa etapaActual={op.etapa_actual || 1} estado={op.estado} /></td>
      <td style={{ padding: '16px 14px', borderBottom: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>{t && <span style={{ color: t.vencido ? COLORS.danger : t.horas < 1 ? COLORS.warning : COLORS.success, fontWeight: 700, fontSize: 14 }}>{t.vencido ? '⏰ VENCIDO' : `⏳ ${t.horas}h ${t.min}m`}</span>}</td>
      <td style={{ padding: '16px 14px', borderBottom: '1px solid #f1f5f9', fontSize: 14, color: COLORS.textLight, whiteSpace: 'nowrap' }}>{op.fecha_creacion?.slice(0, 16) || ''}</td>
      <td style={{ padding: '16px 14px', borderBottom: '1px solid #f1f5f9' }}>
        <button onClick={onView} style={{ padding: '8px 16px', background: COLORS.primary, color: COLORS.white, border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, boxShadow: '0 2px 8px rgba(14,165,233,0.25)', fontFamily: 'inherit' }}>🔍 Ver</button>
      </td>
    </tr>
  );
});
OperationRow.displayName = 'OperationRow';