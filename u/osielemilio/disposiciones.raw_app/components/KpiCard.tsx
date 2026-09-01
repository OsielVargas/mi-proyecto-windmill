import React from 'react';
import { COLORS } from '../constants';

interface KpiCardProps {
  label: string;
  count: number;
  color: string;
}

export const KpiCard = React.memo(({ label, count, color }: KpiCardProps) => (
  <div style={{
    background: COLORS.white, 
    borderLeft: `5px solid ${color}`, 
    padding: '18px 22px',
    borderRadius: 12, 
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)', 
    minWidth: 140, 
    flex: 1, 
    border: `1px solid ${COLORS.border}`,
  }}>
    <div style={{ fontSize: 28, fontWeight: 800, color }}>{count}</div>
    <div style={{ fontSize: 13, color: COLORS.textLight, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>{label}</div>
  </div>
));