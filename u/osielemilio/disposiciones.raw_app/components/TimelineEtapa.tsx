import React, { useCallback } from 'react';
import { ETAPAS, COLORS } from '../constants';

interface TimelineEtapaProps {
  etapaActual: number;
  estado: string;
}

export const TimelineEtapa = React.memo(({ etapaActual, estado }: TimelineEtapaProps) => {
  const getColor = useCallback((num: number) => {
    if (estado === 'finalizada') return COLORS.success;
    if (estado === 'rechazada') return num < etapaActual ? COLORS.success : num === etapaActual ? COLORS.danger : '#e2e8f0';
    if (estado === 'condicionada') return num < etapaActual ? COLORS.success : num === etapaActual ? COLORS.warning : '#e2e8f0';
    if (num < etapaActual) return COLORS.success;
    if (num === etapaActual) return COLORS.primary;
    return '#e2e8f0';
  }, [estado, etapaActual]);

  const getTextColor = useCallback((num: number) =>
    (num <= etapaActual && estado !== 'activa') || (num <= etapaActual) ? '#fff' : COLORS.textLight
  , [estado, etapaActual]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 400 }}>
      {Object.entries(ETAPAS).map(([numStr, info], idx) => {
        const num = parseInt(numStr);
        const color = getColor(num);
        const isLast = idx === 8;
        const isCurrent = num === etapaActual && estado === 'activa';
        return (
          <React.Fragment key={num}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div title={info.nombre} style={{
                width: 32, height: 32, borderRadius: '50%', background: color, color: getTextColor(num),
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold',
                border: isCurrent ? '3px solid #0369a1' : '2px solid transparent',
                boxShadow: isCurrent ? '0 0 0 4px rgba(14,165,233,0.25)' : 'none', transition: 'all 0.2s',
              }}>{num}</div>
              <span style={{ fontSize: 10, color: COLORS.textLight, whiteSpace: 'nowrap', fontWeight: 600 }}>{info.corto}</span>
            </div>
            {!isLast && <div style={{ flex: 1, height: 4, background: num < etapaActual ? COLORS.success : '#e2e8f0', borderRadius: 2, marginBottom: 16 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
});
TimelineEtapa.displayName = 'TimelineEtapa';