import React, { useState, useMemo } from 'react';
import { COLORS, ROLES } from '../constants';
import { formatearHoras, colorTiempo } from '../utils';

interface ReportsViewProps {
  operations: any[];
}

export const ReportsView = ({ operations }: ReportsViewProps) => {
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');

  const calcularTiemposOperacion = (op: any) => {
    const aprobaciones = op.aprobaciones || [];
    // ✅ CORREGIDO: Incluir 'aprobado' y 'aprobar'
    const decisionesValidas = aprobaciones.filter((a: any) => {
      const decision = (a.decision || '').toLowerCase();
      return decision.includes('approve') || 
             decision.includes('reject') || 
             decision.includes('avanzar') || 
             decision.includes('finalizar') || 
             decision.includes('rechazar') || 
             decision.includes('aprobado') ||   // ← NUEVO
             decision.includes('aprobar') ||    // ← NUEVO
             decision.includes('condicionada') || // ← NUEVO
             decision === 'ok';
    });
    const tiempos: { etapa: string; rol: string; decision: string; fecha: string; duracion_horas: number | null }[] = [];
    const sorted = [...decisionesValidas].sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    const etapasUnicas: any[] = [];
    const etapasVistas = new Set<string>();
    sorted.forEach(a => {
      const etapaKey = `${a.etapa || ''}-${a.etapa_nombre || ''}`;
      if (!etapasVistas.has(etapaKey)) { etapasVistas.add(etapaKey); etapasUnicas.push(a); }
    });
    let fechaAnterior: Date | null = null;
    etapasUnicas.forEach((a: any) => {
      const fechaActual = new Date(a.fecha);
      let duracion: number | null = null;
      if (fechaAnterior) { const diffMs = fechaActual.getTime() - fechaAnterior.getTime(); duracion = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100; }
      tiempos.push({ etapa: a.etapa_nombre || `Etapa ${a.etapa}`, rol: a.usuario, decision: a.decision, fecha: a.fecha, duracion_horas: duracion });
      fechaAnterior = fechaActual;
    });
    return tiempos;
  };

  const calcularPromediosPorRol = (ops: any[]) => {
    const porRol: Record<string, { total: number; count: number; promedio: number; max: number; min: number }> = {};
    ops.forEach(op => {
      calcularTiemposOperacion(op).forEach(t => {
        if (t.duracion_horas !== null && t.duracion_horas >= 0) {
          if (!porRol[t.rol]) porRol[t.rol] = { total: 0, count: 0, promedio: 0, max: 0, min: Infinity };
          porRol[t.rol].total += t.duracion_horas; porRol[t.rol].count += 1;
          if (t.duracion_horas > porRol[t.rol].max) porRol[t.rol].max = t.duracion_horas;
          if (t.duracion_horas < porRol[t.rol].min) porRol[t.rol].min = t.duracion_horas;
        }
      });
    });
    Object.keys(porRol).forEach(rol => {
      porRol[rol].promedio = Math.round((porRol[rol].total / porRol[rol].count) * 100) / 100;
      if (porRol[rol].min === Infinity) porRol[rol].min = 0;
    });
    return porRol;
  };

  const calcularPromediosPorEtapa = (ops: any[]) => {
    const porEtapa: Record<string, { total: number; count: number; promedio: number; max: number; min: number }> = {};
    ops.forEach(op => {
      calcularTiemposOperacion(op).forEach(t => {
        if (t.duracion_horas !== null && t.duracion_horas >= 0) {
          if (!porEtapa[t.etapa]) porEtapa[t.etapa] = { total: 0, count: 0, promedio: 0, max: 0, min: Infinity };
          porEtapa[t.etapa].total += t.duracion_horas; porEtapa[t.etapa].count += 1;
          if (t.duracion_horas > porEtapa[t.etapa].max) porEtapa[t.etapa].max = t.duracion_horas;
          if (t.duracion_horas < porEtapa[t.etapa].min) porEtapa[t.etapa].min = t.duracion_horas;
        }
      });
    });
    Object.keys(porEtapa).forEach(etapa => {
      porEtapa[etapa].promedio = Math.round((porEtapa[etapa].total / porEtapa[etapa].count) * 100) / 100;
      if (porEtapa[etapa].min === Infinity) porEtapa[etapa].min = 0;
    });
    return porEtapa;
  };

  const opsFiltradas = useMemo(() => {
    return operations.filter(op => {
      if (filtroRol && op.rol_responsable !== filtroRol) return false;
      if (filtroFechaDesde && op.fecha_creacion < filtroFechaDesde) return false;
      if (filtroFechaHasta && op.fecha_creacion > filtroFechaHasta) return false;
      return true;
    });
  }, [operations, filtroRol, filtroFechaDesde, filtroFechaHasta]);

  const promediosRol = useMemo(() => calcularPromediosPorRol(opsFiltradas), [opsFiltradas]);
  const promediosEtapa = useMemo(() => calcularPromediosPorEtapa(opsFiltradas), [opsFiltradas]);

  const tiempoTotalPromedio = useMemo(() => {
    const total = Object.values(promediosEtapa).reduce((acc, e) => acc + e.promedio * e.count, 0);
    const count = Object.values(promediosEtapa).reduce((acc, e) => acc + e.count, 0) || 1;
    return total / count;
  }, [promediosEtapa]);

  const etapaMasLenta = useMemo(() => Object.entries(promediosEtapa).sort((a, b) => b[1].promedio - a[1].promedio)[0], [promediosEtapa]);
  const etapaMasRapida = useMemo(() => Object.entries(promediosEtapa).filter(e => e[1].count > 0).sort((a, b) => a[1].promedio - b[1].promedio)[0], [promediosEtapa]);

  const inputStyle: React.CSSProperties = { padding: '12px 14px', border: `2px solid ${COLORS.border}`, borderRadius: 10, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
  const btnSecondary: React.CSSProperties = { padding: '10px 18px', background: '#64748b', color: COLORS.white, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' };

  return (
    <div style={{ background: COLORS.white, borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: `1px solid ${COLORS.border}`, marginBottom: 28 }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: 22, fontWeight: 700, color: COLORS.dark, display: 'flex', alignItems: 'center', gap: 10 }}>
        📈 Reportes de Tiempos por Etapa
        <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{operations.length} operación(es) analizadas</span>
      </h3>

      <div style={{ background: COLORS.bg, padding: 16, borderRadius: 12, marginBottom: 24, border: `1px solid ${COLORS.border}`, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Filtrar por Rol</label>
          <select value={filtroRol} onChange={e => setFiltroRol(e.target.value)} style={{ ...inputStyle, background: COLORS.white }}>
            <option value="">— Todos los roles —</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Desde</label>
          <input type="date" value={filtroFechaDesde} onChange={e => setFiltroFechaDesde(e.target.value)} style={{ ...inputStyle }} />
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, display: 'block' }}>Hasta</label>
          <input type="date" value={filtroFechaHasta} onChange={e => setFiltroFechaHasta(e.target.value)} style={{ ...inputStyle }} />
        </div>
        <button onClick={() => { setFiltroRol(''); setFiltroFechaDesde(''); setFiltroFechaHasta(''); }} style={btnSecondary}>🔄 Limpiar filtros</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', padding: 20, borderRadius: 12, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600, textTransform: 'uppercase' }}>⏱️ Tiempo promedio total</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>{formatearHoras(tiempoTotalPromedio)}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>por transición entre etapas</div>
        </div>
        {etapaMasLenta && (
          <div style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', padding: 20, borderRadius: 12, color: 'white' }}>
            <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600, textTransform: 'uppercase' }}>🐢 Etapa más lenta</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{etapaMasLenta[0]}</div>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>{formatearHoras(etapaMasLenta[1].promedio)} promedio</div>
          </div>
        )}
        {etapaMasRapida && (
          <div style={{ background: 'linear-gradient(135deg, #10b981, #047857)', padding: 20, borderRadius: 12, color: 'white' }}>
            <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600, textTransform: 'uppercase' }}>⚡ Etapa más rápida</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginTop: 8 }}>{etapaMasRapida[0]}</div>
            <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>{formatearHoras(etapaMasRapida[1].promedio)} promedio</div>
          </div>
        )}
        <div style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', padding: 20, borderRadius: 12, color: 'white' }}>
          <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 600, textTransform: 'uppercase' }}>📊 Total transiciones</div>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>{Object.values(promediosEtapa).reduce((acc, e) => acc + e.count, 0)}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>decisiones registradas</div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: '0 0 14px 0', fontSize: 18, fontWeight: 700, color: COLORS.dark }}> Tiempos Promedio por Etapa</h4>
        {Object.keys(promediosEtapa).length === 0 ? (
          <p style={{ color: COLORS.textLight, textAlign: 'center', padding: 30 }}>No hay datos suficientes.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 14 }}>
              <thead><tr>{['Etapa', 'Transiciones', 'Promedio', 'Mínimo', 'Máximo', 'Distribución'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: COLORS.textLight, fontSize: 12, textTransform: 'uppercase', borderBottom: `2px solid ${COLORS.border}` }}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {Object.entries(promediosEtapa).sort((a, b) => b[1].promedio - a[1].promedio).map(([etapa, data], idx) => {
                  const maxPromedio = Math.max(...Object.values(promediosEtapa).map(e => e.promedio));
                  const porcentaje = maxPromedio > 0 ? (data.promedio / maxPromedio) * 100 : 0;
                  return (
                    <tr key={etapa} style={{ background: idx % 2 === 1 ? '#fafafa' : COLORS.white }}>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>{etapa}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}><span style={{ background: COLORS.primary, color: 'white', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{data.count}</span></td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: colorTiempo(data.promedio), fontWeight: 800, fontSize: 15 }}>{formatearHoras(data.promedio)}</span></td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: COLORS.success, fontWeight: 600 }}>{formatearHoras(data.min)}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: COLORS.danger, fontWeight: 600 }}>{formatearHoras(data.max)}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', minWidth: 200 }}>
                        <div style={{ background: '#e2e8f0', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                          <div style={{ width: `${porcentaje}%`, height: '100%', background: `linear-gradient(90deg, ${colorTiempo(data.promedio)}, ${colorTiempo(data.promedio)}dd)`, borderRadius: 6, transition: 'width 0.5s' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginBottom: 32 }}>
        <h4 style={{ margin: '0 0 14px 0', fontSize: 18, fontWeight: 700, color: COLORS.dark }}>👥 Tiempos Promedio por Rol / Área</h4>
        {Object.keys(promediosRol).length === 0 ? (
          <p style={{ color: COLORS.textLight, textAlign: 'center', padding: 30 }}>No hay datos suficientes.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: 14 }}>
              <thead><tr>{['Rol', 'Decisiones', 'Promedio', 'Mínimo', 'Máximo', 'Distribución'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 14px', fontWeight: 700, color: COLORS.textLight, fontSize: 12, textTransform: 'uppercase', borderBottom: `2px solid ${COLORS.border}` }}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {Object.entries(promediosRol).sort((a, b) => b[1].promedio - a[1].promedio).map(([rol, data], idx) => {
                  const maxPromedio = Math.max(...Object.values(promediosRol).map(e => e.promedio));
                  const porcentaje = maxPromedio > 0 ? (data.promedio / maxPromedio) * 100 : 0;
                  const rolInfo = ROLES.find(r => r.value === rol);
                  return (
                    <tr key={rol} style={{ background: idx % 2 === 1 ? '#fafafa' : COLORS.white }}>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 600 }}>{rolInfo?.label || rol}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}><span style={{ background: COLORS.primary, color: 'white', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{data.count}</span></td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9' }}><span style={{ color: colorTiempo(data.promedio), fontWeight: 800, fontSize: 15 }}>{formatearHoras(data.promedio)}</span></td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: COLORS.success, fontWeight: 600 }}>{formatearHoras(data.min)}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', color: COLORS.danger, fontWeight: 600 }}>{formatearHoras(data.max)}</td>
                      <td style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', minWidth: 200 }}>
                        <div style={{ background: '#e2e8f0', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                          <div style={{ width: `${porcentaje}%`, height: '100%', background: `linear-gradient(90deg, ${colorTiempo(data.promedio)}, ${colorTiempo(data.promedio)}dd)`, borderRadius: 6, transition: 'width 0.5s' }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h4 style={{ margin: '0 0 14px 0', fontSize: 18, fontWeight: 700, color: COLORS.dark }}>📋 Detalle por Operación</h4>
        {opsFiltradas.length === 0 ? (
          <p style={{ color: COLORS.textLight, textAlign: 'center', padding: 30 }}>No hay operaciones que coincidan con los filtros.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {opsFiltradas.slice(0, 20).map((op: any) => {
              const tiempos = calcularTiemposOperacion(op);
              const tiempoTotal = tiempos.reduce((acc, t) => acc + (t.duracion_horas || 0), 0);
              return (
                <div key={op.id} style={{ background: COLORS.bg, borderRadius: 12, padding: 16, border: `1px solid ${COLORS.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <strong style={{ fontSize: 15, color: COLORS.dark }}>{op.nombre_solicitante}</strong>
                      <span style={{ marginLeft: 10, fontSize: 12, color: COLORS.textLight }}>ID: {op.id?.slice(0, 8)}... · {op.estado?.toUpperCase()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ background: tiempoTotal > 48 ? '#fee2e2' : tiempoTotal > 24 ? '#fef3c7' : '#dcfce7', color: tiempoTotal > 48 ? '#991b1b' : tiempoTotal > 24 ? '#92400e' : '#166534', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>⏱️ Total: {formatearHoras(tiempoTotal)}</span>
                      <span style={{ fontSize: 12, color: COLORS.textLight }}>{tiempos.length} decisiones</span>
                    </div>
                  </div>
                  {tiempos.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {tiempos.map((t, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 10px', background: 'white', borderRadius: 6, fontSize: 13 }}>
                          <span style={{ background: COLORS.primary, color: 'white', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ flex: 1, fontWeight: 600 }}>{t.etapa}</span>
                          <span style={{ color: COLORS.textLight, fontSize: 12 }}>{t.rol}</span>
                          <span style={{ background: t.duracion_horas !== null ? (t.duracion_horas > 24 ? '#fee2e2' : t.duracion_horas > 4 ? '#fef3c7' : '#dcfce7') : '#f1f5f9', color: t.duracion_horas !== null ? (t.duracion_horas > 24 ? '#991b1b' : t.duracion_horas > 4 ? '#92400e' : '#166534') : COLORS.textLight, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {t.duracion_horas !== null ? formatearHoras(t.duracion_horas) : 'Inicio'}
                          </span>
                          <span style={{ color: COLORS.textLight, fontSize: 11, whiteSpace: 'nowrap' }}>{t.fecha?.slice(0, 16)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: COLORS.textLight, fontSize: 13, margin: 0, padding: '8px 10px' }}>Sin decisiones registradas aún</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};