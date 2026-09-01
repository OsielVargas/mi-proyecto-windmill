import React from 'react';
import { COLORS } from '../constants';

interface SortableTHProps {
  label: string;
  sortKey: string;
  currentSort: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
}

export const SortableTH = ({ label, sortKey, currentSort, onSort }: SortableTHProps) => {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.direction : null;
  
  return (
    <th 
      onClick={() => onSort(sortKey)}
      style={{ 
        textAlign: 'left', 
        padding: '16px 14px', 
        fontWeight: 700, 
        color: COLORS.textLight, 
        fontSize: 13, 
        textTransform: 'uppercase', 
        letterSpacing: 0.5, 
        borderBottom: `2px solid ${COLORS.border}`, 
        whiteSpace: 'nowrap',
        cursor: 'pointer', 
        userSelect: 'none', 
        transition: 'background 0.2s',
        background: isActive ? '#f1f5f9' : 'transparent'
      }}
      onMouseEnter={(e) => { if (!isActive) (e.currentTarget.style.background = '#f8fafc'); }}
      onMouseLeave={(e) => { if (!isActive) (e.currentTarget.style.background = 'transparent'); }}
    >
      {label} {isActive && <span style={{ marginLeft: 4 }}>{direction === 'asc' ? '▲' : '▼'}</span>}
    </th>
  );
};