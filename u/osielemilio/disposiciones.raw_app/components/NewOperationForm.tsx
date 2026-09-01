import React, { useState } from 'react';
import { COLORS, PRODUCTOS } from '../constants';

interface NewOperationFormProps {
  onCreate: (data: { nombre: string; monto: number; producto: string; fechaOperacion: string }) => Promise<void>;
  loading: boolean;
}

export const NewOperationForm = ({ onCreate, loading }: NewOperationFormProps) => {
  const [newNombre, setNewNombre] = useState('');
  const [newMonto, setNewMonto] = useState('');
  const [newProducto, setNewProducto] = useState('cuenta_corriente');
  const [newFechaOperacion, setNewFechaOperacion] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!newNombre.trim() || !newFechaOperacion || !newMonto.trim()) {
      setError('Nombre, monto y fecha de operación requeridos');
      return;
    }
    const montoNum = parseFloat(newMonto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setError('Monto debe ser un número mayor a 0');
      return;
    }
    if (new Date(newFechaOperacion) < new Date().setHours(0, 0, 0, 0)) {
      setError('La fecha debe ser hoy o futura');
      return;
    }
    await onCreate({ nombre: newNombre, monto: montoNum, producto: newProducto, fechaOperacion: newFechaOperacion });
    setNewNombre(''); setNewMonto(''); setNewProducto('cuenta_corriente'); setNewFechaOperacion('');
  };

  const inputStyle: React.CSSProperties = { padding: '12px 14px', border: `2px solid ${COLORS.border}`, borderRadius: 10, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
  const btnSuccess: React.CSSProperties = { padding: '10px 20px', background: COLORS.success, color: COLORS.white, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 16px rgba(16,185,129,0.3)', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' };

  return (
    <div style={{ background: COLORS.white, borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: `1px solid ${COLORS.border}`, marginBottom: 28 }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: 20, fontWeight: 700, color: COLORS.dark, display: 'flex', alignItems: 'center', gap: 10 }}>
        Nueva Operación <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>Etapa 1</span>
      </h3>
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 16, color: '#991b1b', fontSize: 14, fontWeight: 500 }}>❌ {error}</div>
      )}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <input type="text" placeholder="Nombre del solicitante" value={newNombre} onChange={e => setNewNombre(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 180 }} />
        <input type="number" placeholder="Monto ($)" value={newMonto} onChange={e => setNewMonto(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 140 }} />
        <select value={newProducto} onChange={e => setNewProducto(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 200, background: COLORS.white }}>
          {PRODUCTOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>📅 Fecha de operación</label>
          <input type="date" value={newFechaOperacion} onChange={e => setNewFechaOperacion(e.target.value)} style={{ ...inputStyle }} />
        </div>
        <button onClick={handleSubmit} disabled={loading} style={btnSuccess}>{loading ? 'Creando...' : ' Crear'}</button>
      </div>
    </div>
  );
};