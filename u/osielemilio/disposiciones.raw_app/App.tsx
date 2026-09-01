import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { backend } from './backend';
import './index.css';
import { ROLES, PRODUCTOS, COLORS } from './constants';
import { KpiCard } from './components/KpiCard';
import { TimelineEtapa } from './components/TimelineEtapa';
import { SortableTH } from './components/SortableTH';
import { OperationRow } from './components/OperationRow';
import { DocPreview } from './components/DocPreview';
import { NewOperationForm } from './components/NewOperationForm';
import { ReportsView } from './components/ReportsView';

const App = () => {
  // ============ ESTADO ============
  const [usuarioReal, setUsuarioReal] = useState<{ email: string; username: string; rol: string } | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [operations, setOperations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<'mis_tareas' | 'todas'>('mis_tareas');
  const [vistaReportes, setVistaReportes] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [comentarios, setComentarios] = useState('');
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [pendienteTexto, setPendienteTexto] = useState('');
  const [fechaCompromiso, setFechaCompromiso] = useState('');
  const [areasSeguimiento, setAreasSeguimiento] = useState<string[]>([]);
  const [docsPendientes, setDocsPendientes] = useState<{ file: File; nombre: string; status: 'pendiente' | 'subiendo' | 'completado' | 'error'; urlServidor?: string }[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [showPreview, setShowPreview] = useState<boolean>(false);

  // REFS para scroll dual
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;
    if (!top || !bottom) return;
    const handleTopScroll = () => { bottom.scrollLeft = top.scrollLeft; };
    const handleBottomScroll = () => { top.scrollLeft = bottom.scrollLeft; };
    top.addEventListener('scroll', handleTopScroll);
    bottom.addEventListener('scroll', handleBottomScroll);
    return () => {
      top.removeEventListener('scroll', handleTopScroll);
      bottom.removeEventListener('scroll', handleBottomScroll);
    };
  }, [operations, vista, vistaReportes]);

  // ============ EFECTOS ============
  useEffect(() => {
    const savedUser = localStorage.getItem('windmill_user');
    if (savedUser) {
      try { setUsuarioReal(JSON.parse(savedUser)); }
      catch { localStorage.removeItem('windmill_user'); }
    }
  }, []);

  const cargarOperaciones = useCallback(async () => {
    if (!usuarioReal) return;
    setLoading(true); setError(null);
    try {
      const result = await backend.listar({ modo: vista, usuario_email: usuarioReal.email, usuario_username: usuarioReal.username, usuario_rol: usuarioReal.rol });
      if (Array.isArray(result)) setOperations(result);
      else if (result?.error) setError(result.error);
      else setError('Formato inesperado');
    } catch (err: any) { setError(err.message || 'Error al cargar'); }
    finally { setLoading(false); }
  }, [vista, usuarioReal]);

  useEffect(() => { if (usuarioReal) cargarOperaciones(); }, [vista, usuarioReal?.rol, cargarOperaciones]);

  // ============ HANDLERS ============
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true); setLoginError('');
    try {
      const rolFound = ROLES.find(r => r.email === loginEmail.toLowerCase().trim());
      if (!rolFound) { setLoginError('Correo no autorizado'); setLoginLoading(false); return; }
      const user = { email: rolFound.email, username: rolFound.username, rol: rolFound.value };
      localStorage.setItem('windmill_user', JSON.stringify(user));
      setUsuarioReal(user);
    } catch (err: any) { setLoginError(err.message || 'Error al iniciar sesion'); }
    finally { setLoginLoading(false); }
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('windmill_user');
    setUsuarioReal(null); setOperations([]); setSelectedOperation(null);
  }, []);

  const flashSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  }, []);

  const fileToBase64 = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = (error) => reject(error);
    });
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert('❌ El archivo es muy grande. Máximo 50 MB.');
      e.target.value = ''; return;
    }
    setDocsPendientes(prev => [...prev, { file, nombre: file.name, status: 'pendiente' }]);
    e.target.value = '';
  }, []);

  const eliminarDocPendiente = useCallback((index: number) => {
    setDocsPendientes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const subirArchivoAServidor = useCallback(async (file: File): Promise<string> => {
    const base64Data = await fileToBase64(file);
    const result = await backend.subir_archivo({ file_base64: base64Data, nombre_archivo: file.name, dominio_base: window.location.origin });
    if (!result.success) throw new Error(result.error || 'Error al subir archivo');
    return result.url;
  }, [fileToBase64]);

  const crearOperacion = useCallback(async (data: { nombre: string; monto: number; producto: string; fechaOperacion: string }) => {
    if (!usuarioReal) return;
    setActionLoading(true); setError(null);
    try {
      const result = await backend.crear({
        nombre_solicitante: data.nombre,
        monto: data.monto,
        producto: data.producto,
        fecha_operacion: data.fechaOperacion,
        datos_iniciales: {},
        usuario_email: usuarioReal.email,
        usuario_username: usuarioReal.username,
        usuario_rol: usuarioReal.rol,
      });
      if (result?.status === 'success') {
        await cargarOperaciones();
        flashSuccess('✅ Operación creada correctamente');
      } else setError(result?.error || 'Error al crear');
    } catch (err: any) { setError(err.message || 'Error al crear'); }
    finally { setActionLoading(false); }
  }, [usuarioReal, cargarOperaciones, flashSuccess]);

  const ejecutarAccion = useCallback(async (accion: string, extraParams: any = {}) => {
    if (!selectedOperation || actionLoading || !usuarioReal) return;
    setActionLoading(true); setError(null);

    if (accion === 'adjuntar_doc') setDocsPendientes([]);
    if (accion === 'registrar_comentario') setNuevoComentario('');
    if (accion === 'registrar_pendiente') { setPendienteTexto(''); setComentarios(''); setAreasSeguimiento([]); setFechaCompromiso(''); }

    try {
      let result: any;
      const basePayload = {
        operation_id: selectedOperation.id, accion,
        usuario_email: usuarioReal.email, usuario_username: usuarioReal.username,
        usuario: usuarioReal.rol, usuario_rol: usuarioReal.rol,
        comentarios, documento_url: '', documento_nombre: '',
        pendiente_texto: pendienteTexto,
        fecha_compromiso: usuarioReal.rol === 'mesa_control' ? fechaCompromiso : '',
        areas_seguimiento: areasSeguimiento,
        ...extraParams,
      };

      if (accion === 'adjuntar_doc' && docsPendientes.length > 0) {
        setDocsPendientes(prev => prev.map(d => ({ ...d, status: 'subiendo' })));
        const docsConUrl: { url: string; nombre: string }[] = [];
        for (let i = 0; i < docsPendientes.length; i++) {
          const doc = docsPendientes[i];
          try {
            const urlServidor = await subirArchivoAServidor(doc.file);
            docsConUrl.push({ url: urlServidor, nombre: doc.nombre });
            setDocsPendientes(prev => { const next = [...prev]; next[i] = { ...doc, status: 'completado', urlServidor }; return next; });
          } catch (err: any) {
            setDocsPendientes(prev => { const next = [...prev]; next[i] = { ...doc, status: 'error' }; return next; });
            throw new Error(`Fallo la subida de ${doc.nombre}: ${err.message}`);
          }
        }
        for (const docData of docsConUrl) {
          result = await backend.accion_etapa({ ...basePayload, documento_url: docData.url, documento_nombre: docData.nombre });
        }
      } else {
        result = await backend.accion_etapa(basePayload);
      }

      const isMinorAction = accion === 'registrar_comentario' || accion === 'registrar_pendiente' || accion === 'adjuntar_doc' || accion === 'liberar_pendiente' || accion === 'notificar_atencion';

      if (result?.status === 'ok' || (isMinorAction && !result?.error)) {
        const detalle = await backend.obtener_detalle({
          operation_id: selectedOperation.id,
          usuario_email: usuarioReal.email, usuario_username: usuarioReal.username, usuario_rol: usuarioReal.rol,
        });
        setSelectedOperation(detalle);
        if (accion === 'registrar_comentario') setNuevoComentario('');
        if (accion === 'registrar_pendiente') { setPendienteTexto(''); setComentarios(''); setAreasSeguimiento([]); setFechaCompromiso(''); }
        if (accion === 'adjuntar_doc') setDocsPendientes([]);
        flashSuccess(result?.message || 'Guardado correctamente');
        cargarOperaciones();
        setActionLoading(false);
        return;
      }

      if (result?.status === 'avanzada' || result?.status === 'finalizada' || result?.status === 'rechazada' || result?.status === 'condicionada') {
        alert(result.message);
        setSelectedOperation(null); setComentarios(''); setDocsPendientes([]);
        setPendienteTexto(''); setNuevoComentario(''); setFechaCompromiso(''); setAreasSeguimiento([]); setShowPreview(false);
        await cargarOperaciones();
      } else if (result?.error) {
        alert('❌ ' + result.error);
      }
    } catch (err: any) { alert('❌ Error: ' + err.message); }
    finally { setActionLoading(false); }
  }, [selectedOperation, actionLoading, usuarioReal, comentarios, docsPendientes, pendienteTexto, fechaCompromiso, areasSeguimiento, subirArchivoAServidor, cargarOperaciones, flashSuccess]);

  // ============ DERIVADOS ============
  const getDocs = useCallback((op: any) => { if (!op) return []; return Array.isArray(op.documentos) ? op.documentos : []; }, []);

  const kpi = useMemo(() => ({
    total: operations.length,
    activas: operations.filter((o: any) => o.estado === 'activa').length,
    finalizadas: operations.filter((o: any) => o.estado === 'finalizada').length,
    rechazadas: operations.filter((o: any) => o.estado === 'rechazada').length,
    condicionadas: operations.filter((o: any) => o.estado === 'condicionada').length,
  }), [operations]);

  const operacionesOrdenadas = useMemo(() => {
    return [...operations].sort((a, b) => new Date(b.fecha_creacion || '').getTime() - new Date(a.fecha_creacion || '').getTime());
  }, [operations]);

  const operacionesAMostrar = useMemo(() => {
    if (vista === 'mis_tareas' && usuarioReal) {
      return operacionesOrdenadas.filter(op => {
        const esResponsable = op.rol_responsable === usuarioReal.rol && (op.estado === 'activa' || op.estado === 'condicionada');
        const tienePendiente = op.pendientes?.some((p: any) => {
          const areaAsignada = p.area_seguimiento || p.area || p.rol_asignado || p.usuario_asignado;
          if (Array.isArray(areaAsignada)) {
            return areaAsignada.includes(usuarioReal.rol) && !p.resuelto;
          }
          return areaAsignada === usuarioReal.rol && !p.resuelto;
        });
        return esResponsable || tienePendiente;
      });
    }
    return operacionesOrdenadas;
  }, [operacionesOrdenadas, vista, usuarioReal]);

  // ✅ PERMISOS DEL PANEL DE ACCIÓN
  const esResponsable = selectedOperation?.rol_responsable === usuarioReal?.rol;
  const esMesaControl = usuarioReal?.rol === 'mesa_control';
  const tienePendientesAsignados = useMemo(() => {
    if (!selectedOperation?.pendientes || !usuarioReal) return false;
    return selectedOperation.pendientes.some((p: any) => {
      if (p.resuelto) return false;
      const areas = p.area_seguimiento || p.area || p.rol_asignado || p.usuario_asignado;
      if (Array.isArray(areas)) return areas.includes(usuarioReal.rol);
      return areas === usuarioReal.rol;
    });
  }, [selectedOperation, usuarioReal]);

  // Mesa de control puede actuar en cualquier operación activa (supervisión)
  const puedeVerPanel = selectedOperation?.estado === 'activa' && (esResponsable || esMesaControl || tienePendientesAsignados);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortedOperations = (ops: any[]) => {
    if (!sortConfig) return ops;
    return [...ops].sort((a, b) => {
      let valA = a[sortConfig.key];
      let valB = b[sortConfig.key];
      if (sortConfig.key === 'fecha_creacion' || sortConfig.key === 'fecha_operacion') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (sortConfig.key === 'monto') {
        valA = Number(valA) || 0;
        valB = Number(valB) || 0;
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const getAreaAsignadaLabel = (pendiente: any): string => {
    const areaAsignada = pendiente.area_seguimiento || pendiente.area || pendiente.rol_asignado || pendiente.usuario_asignado;
    if (!areaAsignada) return 'Sin asignar';
    if (Array.isArray(areaAsignada)) {
      if (areaAsignada.length === 0) return 'Sin asignar';
      return areaAsignada.map((a: string) => {
        const rolInfo = ROLES.find(r => r.value === a);
        return rolInfo?.label || a;
      }).join(', ');
    }
    const rolInfo = ROLES.find(r => r.value === areaAsignada);
    return rolInfo?.label || areaAsignada;
  };

  // ============ ESTILOS ============
  const inputStyle: React.CSSProperties = { padding: '12px 14px', border: `2px solid ${COLORS.border}`, borderRadius: 10, fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
  const btnPrimary: React.CSSProperties = { padding: '10px 20px', background: COLORS.primary, color: COLORS.white, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 14px rgba(14,165,233,0.35)', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' };
  const btnSuccess: React.CSSProperties = { ...btnPrimary, background: COLORS.success, boxShadow: '0 4px 16px rgba(16,185,129,0.3)' };
  const btnDanger: React.CSSProperties = { ...btnPrimary, background: COLORS.danger, boxShadow: '0 4px 16px rgba(220,38,38,0.3)' };
  const btnSecondary: React.CSSProperties = { padding: '10px 18px', background: '#64748b', color: COLORS.white, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' };
  const btnWarning: React.CSSProperties = { ...btnPrimary, background: COLORS.warning, boxShadow: '0 4px 16px rgba(245,158,11,0.3)' };
  const badgeStyle = (estado: string): React.CSSProperties => {
    const map: Record<string, string> = { finalizada: COLORS.success, rechazada: COLORS.danger, condicionada: COLORS.warning };
    return { background: map[estado] || COLORS.primary, color: COLORS.white, padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, display: 'inline-block' };
  };

  const rolLabel = usuarioReal ? (ROLES.find(r => r.value === usuarioReal.rol)?.label || usuarioReal.rol) : 'Desconocido';

  // ============ LOGIN VIEW ============
  if (!usuarioReal) {
    return (
      <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: `linear-gradient(135deg, ${COLORS.dark}, #1e3a5f)`, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: COLORS.white, borderRadius: 20, padding: '48px 40px', maxWidth: 420, width: '100%', boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: 28, fontWeight: 700, color: COLORS.dark }}>📋 Flujo de Disposiciones</h1>
            <p style={{ margin: 0, fontSize: 16, color: COLORS.textLight }}>Inicia sesión con tu cuenta corporativa</p>
          </div>
          {loginError && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>❌</span>
              <span style={{ fontSize: 14, color: '#991b1b', fontWeight: 500 }}>{loginError}</span>
            </div>
          )}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Correo electrónico</label>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required style={inputStyle} placeholder="usuario@ucda.com.mx" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: COLORS.text, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Contraseña</label>
              <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loginLoading} style={{ width: '100%', padding: '14px 20px', background: loginLoading ? COLORS.textLight : COLORS.primary, color: COLORS.white, border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: loginLoading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(14,165,233,0.35)', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {loginLoading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ============ MAIN VIEW ============
  return (
    <div style={{ fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", background: COLORS.bg, minHeight: '100vh', color: COLORS.text, padding: '24px' }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ background: `linear-gradient(135deg, ${COLORS.dark}, #1e3a5f)`, borderRadius: 16, padding: '32px 40px', marginBottom: 28, boxShadow: '0 10px 40px rgba(15,23,42,0.25)', color: COLORS.white }}>
          <h1 style={{ margin: '0 0 8px 0', fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}> Flujo de Disposiciones</h1>
          <p style={{ margin: 0, fontSize: 18, opacity: 0.85 }}>Sistema de gestión de operaciones — 9 Etapas</p>
        </div>

        {/* SESIÓN ACTIVA */}
        <div style={{ background: '#f0fdf4', padding: '16px 20px', borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 15, border: '1px solid #bbf7d0', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 22 }}>👤</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#166534' }}>Sesión activa:</span>
            <span style={{ fontSize: 14, color: COLORS.textLight, marginLeft: 8 }}>{rolLabel} ({usuarioReal.email})</span>
          </div>
          <button onClick={handleLogout} style={{ padding: '8px 16px', background: COLORS.danger, color: COLORS.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar Sesión</button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>❌</span>
            <span style={{ fontSize: 16, color: '#991b1b', fontWeight: 500 }}>{error}</span>
          </div>
        )}

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
          <KpiCard label="Total" count={kpi.total} color="#64748b" />
          <KpiCard label="Activas" count={kpi.activas} color={COLORS.primary} />
          <KpiCard label="Finalizadas" count={kpi.finalizadas} color={COLORS.success} />
          <KpiCard label="Rechazadas" count={kpi.rechazadas} color={COLORS.danger} />
          <KpiCard label="Condicionadas" count={kpi.condicionadas} color={COLORS.warning} />
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
          <button onClick={() => { setVistaReportes(false); setVista('mis_tareas'); }} style={{ ...btnPrimary, background: !vistaReportes && vista === 'mis_tareas' ? COLORS.primary : COLORS.white, color: !vistaReportes && vista === 'mis_tareas' ? COLORS.white : COLORS.textLight, boxShadow: !vistaReportes && vista === 'mis_tareas' ? '0 4px 14px rgba(14,165,233,0.35)' : 'none', border: !vistaReportes && vista === 'mis_tareas' ? 'none' : `2px solid ${COLORS.border}` }}>📥 Mis Tareas</button>
          <button onClick={() => { setVistaReportes(false); setVista('todas'); }} style={{ ...btnPrimary, background: !vistaReportes && vista === 'todas' ? COLORS.primary : COLORS.white, color: !vistaReportes && vista === 'todas' ? COLORS.white : COLORS.textLight, boxShadow: !vistaReportes && vista === 'todas' ? '0 4px 14px rgba(14,165,233,0.35)' : 'none', border: !vistaReportes && vista === 'todas' ? 'none' : `2px solid ${COLORS.border}` }}>📊 Todas las Operaciones</button>
          <button onClick={() => setVistaReportes(true)} style={{ ...btnPrimary, background: vistaReportes ? COLORS.warning : COLORS.white, color: vistaReportes ? COLORS.white : COLORS.textLight, boxShadow: vistaReportes ? '0 4px 14px rgba(245,158,11,0.35)' : 'none', border: vistaReportes ? 'none' : `2px solid ${COLORS.border}` }}>📈 Reportes de Tiempos</button>
        </div>

        {/* NUEVA OPERACIÓN (solo cobranza) */}
        {!vistaReportes && usuarioReal.rol === 'cobranza' && (
          <NewOperationForm onCreate={crearOperacion} loading={actionLoading} />
        )}

        {/* TABLA DE OPERACIONES CON SCROLL DUAL */}
        {!vistaReportes && (
          <div style={{ background: COLORS.white, borderRadius: 16, padding: 28, boxShadow: '0 4px 20px rgba(0,0,0,0.06)', border: `1px solid ${COLORS.border}`, marginBottom: 28 }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: 22, fontWeight: 700, color: COLORS.dark }}>{vista === 'mis_tareas' ? `📥 Tareas para ${rolLabel}` : '📊 Todas las Operaciones'}</h3>
            {loading ? (
              <p style={{ fontSize: 16, color: COLORS.textLight, textAlign: 'center', padding: 40 }}>⏳ Cargando operaciones...</p>
            ) : (
              <>
                {/* BARRA DE SCROLL SUPERIOR */}
                <div ref={topScrollRef} style={{ overflowX: 'auto', overflowY: 'hidden', marginBottom: 4, cursor: 'grab' }}>
                  <div style={{ height: 1, minWidth: tableRef.current ? tableRef.current.scrollWidth : 1200 }} />
                </div>
                {/* CONTENEDOR DE TABLA CON SCROLL INFERIOR */}
                <div ref={bottomScrollRef} style={{ overflowX: 'auto' }}>
                  <table ref={tableRef} style={{ width: '100%', minWidth: 1200, borderCollapse: 'separate', borderSpacing: 0, fontSize: 15 }}>
                    <thead>
                      <tr>
                        <SortableTH label="ID" sortKey="id" currentSort={sortConfig} onSort={requestSort} />
                        <SortableTH label="Solicitante" sortKey="nombre_solicitante" currentSort={sortConfig} onSort={requestSort} />
                        <SortableTH label="Monto" sortKey="monto" currentSort={sortConfig} onSort={requestSort} />
                        <SortableTH label="Producto" sortKey="producto" currentSort={sortConfig} onSort={requestSort} />
                        <SortableTH label="Fecha Op." sortKey="fecha_operacion" currentSort={sortConfig} onSort={requestSort} />
                        <SortableTH label="Estado" sortKey="estado" currentSort={sortConfig} onSort={requestSort} />
                        <th style={{ textAlign: 'left', padding: '16px 14px', fontWeight: 700, color: COLORS.textLight, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${COLORS.border}` }}>Progreso</th>
                        <th style={{ textAlign: 'left', padding: '16px 14px', fontWeight: 700, color: COLORS.textLight, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${COLORS.border}` }}>Tiempo</th>
                        <SortableTH label="Fecha Reg." sortKey="fecha_creacion" currentSort={sortConfig} onSort={requestSort} />
                        <th style={{ textAlign: 'left', padding: '16px 14px', fontWeight: 700, color: COLORS.textLight, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${COLORS.border}` }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getSortedOperations(operacionesAMostrar).length === 0 ? (
                        <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, fontSize: 16, color: COLORS.textLight }}>No hay operaciones</td></tr>
                      ) : getSortedOperations(operacionesAMostrar).map((op, idx) => (
                        <OperationRow key={op.id} op={op} idx={idx} onView={() => { setSelectedOperation(op); setPreviewIndex(0); setShowPreview(false); }} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {/* REPORTES */}
        {vistaReportes && <ReportsView operations={operations} />}

        {/* MODAL DE DETALLE */}
        {selectedOperation && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }} onClick={() => setSelectedOperation(null)}>
            <div style={{ background: COLORS.white, borderRadius: 20, maxWidth: 950, width: '100%', maxHeight: '95vh', overflowY: 'auto', boxShadow: '0 25px 80px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
              <div style={{ background: `linear-gradient(135deg, ${COLORS.dark}, #1e3a5f)`, padding: '28px 32px', borderRadius: '20px 20px 0 0', color: COLORS.white, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>📁 Expediente — {selectedOperation.etapa_nombre || `Etapa ${selectedOperation.etapa_actual}`}</h2>
                <span style={badgeStyle(selectedOperation.estado)}>{selectedOperation.estado?.toUpperCase()}</span>
              </div>

              <div style={{ padding: 32 }}>
                {/* Timeline */}
                <div style={{ marginBottom: 28, padding: 20, background: COLORS.bg, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflowX: 'auto' }}>
                  <TimelineEtapa etapaActual={selectedOperation.etapa_actual || 1} estado={selectedOperation.estado} />
                </div>

                {/* Info Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
                  {[
                    { label: '🆔 ID', value: selectedOperation.id },
                    { label: '👤 Solicitante', value: selectedOperation.nombre_solicitante },
                    { label: '💰 Monto', value: <span style={{ color: COLORS.success, fontWeight: 800, fontSize: 18 }}>{selectedOperation.monto ? `$${Number(selectedOperation.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}</span> },
                    { label: '📦 Producto', value: <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: 13 }}>{PRODUCTOS.find(p => p.value === selectedOperation.producto)?.label || selectedOperation.producto || '—'}</span> },
                    { label: '📅 Fecha de operación', value: <span style={{ fontWeight: 700, color: COLORS.dark }}>{selectedOperation.fecha_operacion || '—'}</span> },
                    { label: '📍 Etapa', value: `${selectedOperation.etapa_actual} — ${selectedOperation.etapa_nombre}` },
                    { label: '🎯 Rol responsable', value: <span style={{ color: COLORS.primary, fontWeight: 700 }}>{selectedOperation.rol_responsable}</span> },
                    { label: '📅 Fecha registro', value: selectedOperation.fecha_creacion?.slice(0, 16) },
                  ].map(item => (
                    <div key={item.label} style={{ background: COLORS.bg, padding: '16px 20px', borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
                      <p style={{ margin: '0 0 4px 0', fontSize: 12, color: COLORS.textLight, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: COLORS.dark }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Documentos */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ background: COLORS.bg, padding: '16px 20px', borderRadius: '12px 12px 0 0', border: `1px solid ${COLORS.border}`, borderBottom: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.dark }}>📁 Documentos del Expediente</h4>
                    <span style={{ background: COLORS.textLight, color: COLORS.white, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{getDocs(selectedOperation).length} documento(s)</span>
                  </div>
                  <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: '0 0 12px 12px', padding: 20 }}>
                    {(() => {
                      const docs = getDocs(selectedOperation);
                      if (docs.length === 0) return <div style={{ textAlign: 'center', padding: 40, color: COLORS.gray }}><div style={{ fontSize: 40, marginBottom: 10 }}>📂</div><p style={{ margin: 0, fontSize: 15 }}>No hay documentos cargados</p></div>;
                      return (
                        <div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                            {docs.map((d: any, i: number) => (
                              <div key={i} onClick={() => { setPreviewIndex(i); setShowPreview(true); }} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: previewIndex === i && showPreview ? '#e0f2fe' : COLORS.bg, borderRadius: 10, cursor: 'pointer', border: previewIndex === i && showPreview ? `2px solid ${COLORS.primary}` : `1px solid ${COLORS.border}`, transition: 'all 0.15s' }}>
                                <div style={{ fontSize: 28 }}>📄</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                                    <strong style={{ fontSize: 15, color: COLORS.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre || 'Sin nombre'}</strong>
                                    <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: COLORS.primary, color: COLORS.white, fontWeight: 700, whiteSpace: 'nowrap' }}>{d.etapa_nombre || `Etapa ${d.etapa}`}</span>
                                  </div>
                                  <div style={{ fontSize: 13, color: COLORS.textLight }}>por <strong>{d.usuario}</strong> el {d.fecha?.slice(0, 10)}</div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); setPreviewIndex(i); setShowPreview(true); }} style={{ padding: '8px 16px', background: COLORS.success, color: COLORS.white, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>👁️ Ver</button>
                                {d.url && !d.url.startsWith('data:') && (
                                  <a href={d.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ padding: '8px 16px', background: '#64748b', color: COLORS.white, textDecoration: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>⬇️ Descargar</a>
                                )}
                              </div>
                            ))}
                          </div>
                          {showPreview && docs[previewIndex] && (
                            <div style={{ border: `2px solid ${COLORS.border}`, borderRadius: 16, overflow: 'hidden', background: COLORS.dark, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>
                              <div style={{ background: '#1e293b', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: COLORS.white, fontSize: 14, fontWeight: 600 }}>👁️ {docs[previewIndex].nombre || 'Documento'} ({previewIndex + 1}/{docs.length})</span>
                                <div style={{ display: 'flex', gap: 10 }}>
                                  <button onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))} disabled={previewIndex === 0} style={{ padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: previewIndex === 0 ? 'not-allowed' : 'pointer', opacity: previewIndex === 0 ? 0.5 : 1, fontFamily: 'inherit', fontWeight: 600 }}>⬅️ Ant.</button>
                                  <button onClick={() => setPreviewIndex(Math.min(docs.length - 1, previewIndex + 1))} disabled={previewIndex === docs.length - 1} style={{ padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: previewIndex === docs.length - 1 ? 'not-allowed' : 'pointer', opacity: previewIndex === docs.length - 1 ? 0.5 : 1, fontFamily: 'inherit', fontWeight: 600 }}>Sig. ➡️</button>
                                  <button onClick={() => setShowPreview(false)} style={{ padding: '6px 12px', fontSize: 12, border: 'none', borderRadius: 6, cursor: 'pointer', background: COLORS.danger, color: COLORS.white, fontFamily: 'inherit', fontWeight: 600 }}>✕ Cerrar</button>
                                </div>
                              </div>
                              <DocPreview url={docs[previewIndex].url} nombre={docs[previewIndex].nombre || 'Documento'} />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Comentarios */}
                <div style={{ marginBottom: 28 }}>
                  <h4 style={{ margin: '0 0 14px 0', fontSize: 18, fontWeight: 700, color: COLORS.dark }}>💬 Comentarios</h4>
                  {selectedOperation.aprobaciones?.filter((a: any) => a.decision === 'comentario').length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedOperation.aprobaciones.filter((a: any) => a.decision === 'comentario').map((c: any, i: number) => (
                        <div key={i} style={{ background: '#f0f9ff', borderRadius: 12, padding: 16, border: '1px solid #bae6fd', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ background: COLORS.primary, color: COLORS.white, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{c.etapa_nombre || `Etapa ${c.etapa}`}</span>
                            <span style={{ fontSize: 13, color: COLORS.textLight }}>👤 <strong>{c.usuario}</strong> · {c.fecha?.slice(0, 16)}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 15, color: COLORS.dark, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.comentarios}</p>
                        </div>
                      ))}
                    </div>
                  ) : <p style={{ color: COLORS.textLight, fontSize: 15 }}>Sin comentarios</p>}
                </div>

                {/* Pendientes */}
                {selectedOperation.pendientes && selectedOperation.pendientes.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ margin: '0 0 14px 0', fontSize: 18, fontWeight: 700, color: COLORS.dark }}>⚠️ Pendientes y Condicionantes</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {selectedOperation.pendientes.map((p: any, i: number) => {
                        const deadline = p.fecha_compromiso ? new Date(p.fecha_compromiso) : null;
                        const ahora = new Date();
                        const vencido = deadline ? deadline.getTime() < ahora.getTime() : false;
                        const horasRest = deadline ? Math.floor((deadline.getTime() - ahora.getTime()) / (1000 * 60 * 60)) : null;
                        const areaLabel = getAreaAsignadaLabel(p);

                        const areaAsig = p.area_seguimiento || p.area || p.rol_asignado || p.usuario_asignado;
                        const esAsignadoDirecto = (Array.isArray(areaAsig) && areaAsig.includes(usuarioReal.rol)) || areaAsig === usuarioReal.rol;
                        const notificado = p.atencion_notificada;

                        return (
                          <div key={i} style={{ background: p.resuelto ? '#f1f5f9' : notificado ? '#dcfce7' : '#fef3c7', borderRadius: 12, padding: 16, border: `1px solid ${p.resuelto ? COLORS.border : notificado ? '#86efac' : '#fde68a'}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                              <span style={{ background: p.resuelto ? '#cbd5e1' : notificado ? COLORS.success : COLORS.warning, color: COLORS.white, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700 }}>{areaLabel}</span>
                              <span style={{ fontSize: 15, textDecoration: p.resuelto ? 'line-through' : 'none', color: p.resuelto ? COLORS.textLight : '#92400e', fontWeight: 600, flex: 1 }}>{p.texto}</span>
                              {notificado && !p.resuelto && (
                                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: '#dcfce7', color: '#166534', whiteSpace: 'nowrap' }}>📢 Notificado</span>
                              )}
                              {deadline && (
                                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: vencido ? '#fee2e2' : '#dcfce7', color: vencido ? '#991b1b' : '#166534', whiteSpace: 'nowrap' }}>{vencido ? '⏰ VENCIDO' : `⏳ ${horasRest}h restantes`}</span>
                              )}
                              {/* ✅ SOLO MESA DE CONTROL PUEDE LIBERAR */}
                              {!p.resuelto && usuarioReal.rol === 'mesa_control' && (
                                <button onClick={() => ejecutarAccion('liberar_pendiente', { pendiente_id: p.id || i })} style={{ ...btnSuccess, fontSize: 12, padding: '6px 12px' }}>🔓 Liberar</button>
                              )}
                              {/* ✅ ROL ASIGNADO PUEDE NOTIFICAR ATENCIÓN */}
                              {!p.resuelto && esAsignadoDirecto && usuarioReal.rol !== 'mesa_control' && (
                                <button onClick={() => {
                                  if (confirm(`¿Confirmas que has atendido el pendiente: "${p.texto}"? Se notificará a Mesa de Control.`)) {
                                    ejecutarAccion('notificar_atencion', { 
                                      pendiente_id: p.id || i,
                                      comentario_texto: `📢 ${rolLabel} reporta que ha atendido el pendiente: "${p.texto}". En espera de revisión por Mesa de Control.`
                                    });
                                  }
                                }} style={{ ...btnPrimary, fontSize: 12, padding: '6px 12px' }}>📢 Notificar atención</button>
                              )}
                            </div>
                            {p.comentarios && (
                              <div style={{ background: COLORS.white, borderRadius: 8, padding: '10px 14px', border: '1px solid #fde68a', fontSize: 14, color: '#78350f', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>💬 {p.comentarios}</div>
                            )}
                            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COLORS.textLight, flexWrap: 'wrap' }}>
                              <span>📝 Creado por: <strong>{p.usuario}</strong></span>
                              <span>🕐 {p.fecha?.slice(0, 16) || '—'}</span>
                              {p.etapa_nombre && <span>📍 Etapa: <strong>{p.etapa_nombre}</strong></span>}
                              {deadline && <span>📅 Compromiso: <strong>{deadline.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>}
                              {p.notificado_por && <span>📢 Notificado por: <strong>{p.notificado_por}</strong> el {p.fecha_notificacion?.slice(0, 16)}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ✅ PANEL DE ACCIÓN: responsable, mesa_control, o rol con pendientes asignados */}
                {puedeVerPanel && (
                  <div style={{ borderTop: `3px solid ${COLORS.primary}`, padding: '28px 32px', background: '#f0f9ff', margin: '0 -32px -32px -32px', borderRadius: '0 0 20px 20px' }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 700, color: COLORS.dark }}>
                      ⚡ {esResponsable 
                        ? <>Tomar decisión como <span style={{ color: COLORS.primary }}>{rolLabel}</span></>
                        : esMesaControl 
                          ? <>Supervisar operación como <span style={{ color: COLORS.primary }}>{rolLabel}</span></>
                          : <>Atender pendientes asignados como <span style={{ color: COLORS.primary }}>{rolLabel}</span></>
                      }
                    </h4>
                    <p style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 20 }}>
                      {esResponsable 
                        ? 'Revisa los documentos y comentarios antes de autorizar o rechazar.' 
                        : esMesaControl
                          ? 'Puedes comentar, adjuntar, registrar nuevos pendientes y liberar los existentes.'
                          : 'Puedes comentar, adjuntar documentos y notificar a Mesa de Control cuando hayas atendido el pendiente.'
                      }
                    </p>

                    {successMsg && (
                      <div style={{ background: '#dcfce7', border: '2px solid #86efac', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeIn 0.3s ease' }}>
                        <span style={{ fontSize: 22 }}>✅</span>
                        <span style={{ fontSize: 15, color: '#166534', fontWeight: 700 }}>{successMsg}</span>
                      </div>
                    )}

                    {/* Comentario */}
                    <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
                      <h5 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: COLORS.textLight }}>💬 Dejar Comentario</h5>
                      <textarea placeholder="Escribe un comentario visible para todos..." value={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical', minHeight: 60, whiteSpace: 'pre-wrap', marginBottom: 12 }} />
                      <div style={{ textAlign: 'right' }}>
                        <button onClick={() => { if (!nuevoComentario.trim()) { alert('❌ Escribe un comentario'); return; } ejecutarAccion('registrar_comentario', { comentario_texto: nuevoComentario }); }} disabled={actionLoading} style={btnSecondary}>💬 Comentar</button>
                      </div>
                    </div>

                    {/* Adjuntar Docs */}
                    <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
                      <h5 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: COLORS.textLight }}>📎 Adjuntar Documentos</h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {docsPendientes.map((doc, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f8fafc', padding: '10px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}` }}>
                            <span style={{ fontSize: 20 }}>📄</span>
                            <span style={{ flex: 1, fontSize: 14, color: COLORS.dark, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</span>
                            {doc.status === 'pendiente' && <span style={{ fontSize: 12, color: COLORS.textLight }}>Listo para subir</span>}
                            {doc.status === 'subiendo' && <span style={{ fontSize: 12, color: COLORS.primary }}>⏳ Subiendo...</span>}
                            {doc.status === 'completado' && <span style={{ fontSize: 12, color: COLORS.success, fontWeight: 700 }}>✅ Guardado</span>}
                            {doc.status === 'error' && <span style={{ fontSize: 12, color: COLORS.danger, fontWeight: 700 }}>❌ Error</span>}
                            {(doc.status === 'pendiente' || doc.status === 'error') && (
                              <button onClick={() => eliminarDocPendiente(i)} style={{ padding: '4px 10px', background: COLORS.danger, color: COLORS.white, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                            )}
                          </div>
                        ))}
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                          <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={handleFileSelect} style={{ fontSize: 15 }} />
                          <button onClick={() => { if (docsPendientes.filter(d => d.status === 'pendiente').length === 0) { alert('⚠️ Selecciona al menos un archivo'); return; } ejecutarAccion('adjuntar_doc'); }} disabled={actionLoading || docsPendientes.some(d => d.status === 'subiendo') || docsPendientes.filter(d => d.status === 'pendiente').length === 0} style={btnSecondary}>
                            📎 Adjuntar {docsPendientes.filter(d => d.status === 'pendiente').length > 0 ? `(${docsPendientes.filter(d => d.status === 'pendiente').length})` : ''}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Registrar Pendiente (solo mesa_control) */}
                    {esMesaControl && (
                      <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, marginBottom: 16, border: `1px solid ${COLORS.border}` }}>
                        <h5 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700, color: COLORS.textLight }}>⚠️ Registrar Pendiente / Observación</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <input type="text" placeholder="Descripción del pendiente" value={pendienteTexto} onChange={e => setPendienteTexto(e.target.value)} style={inputStyle} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: COLORS.textLight }}>
                              📋 Asignar a áreas para seguimiento (puedes seleccionar varias)
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                              {ROLES.map(r => (
                                <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={areasSeguimiento.includes(r.value)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setAreasSeguimiento(prev => [...prev, r.value]);
                                      } else {
                                        setAreasSeguimiento(prev => prev.filter(a => a !== r.value));
                                      }
                                    }}
                                  />
                                  {r.label}
                                </label>
                              ))}
                            </div>
                            <input 
                              type="datetime-local" 
                              value={fechaCompromiso} 
                              onChange={e => setFechaCompromiso(e.target.value)} 
                              style={{ ...inputStyle, maxWidth: 300 }} 
                            />
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <button onClick={() => { if (!pendienteTexto.trim()) { alert('❌ Escribe una descripción del pendiente'); return; } ejecutarAccion('registrar_pendiente'); }} disabled={actionLoading} style={btnSecondary}>📝 Registrar Pendiente</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Botones de decisión MAYOR: solo para el rol responsable de la etapa */}
                    {esResponsable && (
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 20 }}>
                        <button onClick={() => ejecutarAccion('aprobar')} disabled={actionLoading} style={btnSuccess}>{actionLoading ? 'Procesando...' : (selectedOperation.etapa_actual < 9 ? '✅ Autorizar y Avanzar' : '✅ Finalizar')}</button>
                        <button onClick={() => ejecutarAccion('rechazar')} disabled={actionLoading} style={btnDanger}>{actionLoading ? 'Procesando...' : '❌ Rechazar'}</button>
                      </div>
                    )}
                  </div>
                )}

                {/* Mensaje de bloqueo: solo si NO es responsable, NO es mesa_control y NO tiene pendientes asignados */}
                {selectedOperation.estado === 'activa' && !esResponsable && !esMesaControl && !tienePendientesAsignados && (
                  <div style={{ marginTop: 20, padding: 20, background: '#fffbeb', borderRadius: 12, textAlign: 'center', border: '1px solid #fde68a' }}>
                    <p style={{ margin: 0, color: '#92400e', fontSize: 15, fontWeight: 500 }}>🔒 Asignada a <strong>{selectedOperation.rol_responsable}</strong>. No tienes permisos para actuar en esta operación.</p>
                  </div>
                )}

                <div style={{ marginTop: 30, textAlign: 'right' }}>
                  <button onClick={() => setSelectedOperation(null)} style={btnSecondary}>Cerrar Expediente</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;