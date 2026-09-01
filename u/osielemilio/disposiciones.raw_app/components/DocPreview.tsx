import React, { useState, useEffect, useRef } from 'react';
import { detectarTipoDoc } from '../utils';
import { COLORS } from '../constants';

interface DocPreviewProps {
  url: string;
  nombre: string;
}

export const DocPreview = React.memo(({ url, nombre }: DocPreviewProps) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipo = detectarTipoDoc(url);

  useEffect(() => {
    if (!(window as any).pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      };
      script.onerror = () => { setError(true); setLoading(false); };
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (tipo !== 'pdf' || !(window as any).pdfjsLib) return;
    const loadPdf = async () => {
      try {
        setLoading(true); setError(false);
        const pdfjsLib = (window as any).pdfjsLib;
        const pdf = await pdfjsLib.getDocument({ url, withCredentials: false, isEvalSupported: false }).promise;
        setPdfDoc(pdf); setTotalPages(pdf.numPages); setCurrentPage(1); setLoading(false);
      } catch (err: any) {
        console.error('Error cargando PDF:', err.message);
        setError(true); setLoading(false);
      }
    };
    loadPdf();
  }, [url, tipo]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || tipo !== 'pdf') return;
    const renderPage = async (pageNum: number) => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        canvas.height = viewport.height; canvas.width = viewport.width;
        await page.render({ canvasContext: context, viewport }).promise;
        setLoaded(true);
      } catch (err: any) {
        console.error('Error renderizando:', err.message);
        setError(true);
      }
    };
    renderPage(currentPage);
  }, [pdfDoc, currentPage, tipo]);

  const loader = (
    <div style={{ padding: 50, textAlign: 'center', color: COLORS.gray, background: '#0f172a' }}>
      <div style={{ fontSize: 40, marginBottom: 16, animation: 'spin 1s linear infinite' }}>⏳</div>
      <p style={{ fontSize: 16, margin: 0 }}>Cargando documento...</p>
    </div>
  );

  if (tipo === 'pdf') {
    return (
      <div style={{ background: '#0f172a' }}>
        {loading && loader}
        {error ? (
          <div style={{ padding: 60, textAlign: 'center', color: COLORS.gray }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h3 style={{ color: '#f87171', marginBottom: 12 }}>No se pudo cargar el PDF</h3>
            <a href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '14px 28px', background: COLORS.primary, color: COLORS.white, borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>🔗 Abrir PDF en nueva pestaña</a>
          </div>
        ) : (
          <>
            <div style={{ display: loaded ? 'block' : 'none', background: '#fff', padding: '20px', overflow: 'auto', maxHeight: '600px', textAlign: 'center' }}>
              <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', borderRadius: 4 }} />
            </div>
            {loaded && totalPages > 0 && (
              <div style={{ padding: '12px 20px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #334155' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '6px 12px', background: currentPage === 1 ? '#475569' : COLORS.primary, color: COLORS.white, border: 'none', borderRadius: 6, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>⬅️ Anterior</button>
                  <span style={{ color: COLORS.white, fontSize: 14, fontWeight: 600 }}>Página {currentPage} de {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '6px 12px', background: currentPage === totalPages ? '#475569' : COLORS.primary, color: COLORS.white, border: 'none', borderRadius: 6, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>Siguiente ➡️</button>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <a href={url} target="_blank" rel="noreferrer" style={{ color: COLORS.primary, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>🔗 Abrir en pestaña</a>
                  <span style={{ color: '#475569' }}>|</span>
                  <a href={url} download={nombre} style={{ color: COLORS.success, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>⬇️ Descargar</a>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  if (tipo === 'drive') {
    return (
      <div style={{ background: '#0f172a' }}>
        {!loaded && loader}
        <iframe src={url} width="100%" height="450px" style={{ display: loaded ? 'block' : 'none', border: 'none', borderRadius: 8 }} onLoad={() => setLoaded(true)} title={nombre} />
      </div>
    );
  }

  if (tipo === 'imagen') {
    return (
      <div style={{ background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, padding: 20 }}>
        {!loaded && loader}
        <img src={url} alt={nombre} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain', borderRadius: 8, display: loaded ? 'block' : 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }} onLoad={() => setLoaded(true)} onError={() => setLoaded(true)} />
      </div>
    );
  }

  return (
    <div style={{ padding: 60, textAlign: 'center', color: COLORS.gray }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
      <p style={{ fontSize: 16, marginBottom: 16 }}>No se puede previsualizar este archivo</p>
      <a href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '12px 24px', background: COLORS.primary, color: COLORS.white, borderRadius: 10, textDecoration: 'none', fontWeight: 700 }}>🔗 Abrir en nueva pestaña</a>
    </div>
  );
});
DocPreview.displayName = 'DocPreview';