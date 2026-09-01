const WORKSPACE = 'disposiciones-usuarios-reales';
const DOMAIN = typeof window !== 'undefined' ? window.location.origin : '';

// ✅ PEGA AQUÍ TU TOKEN REAL DE WINDMILL
const TOKEN = 'IsK2zRLdseevB22L1o96k0iEnu1FjXgx';

// ✅ URL CORRECTA de la API de Windmill
const API_BASE = `${DOMAIN}/api/w/${WORKSPACE}/jobs/run_wait_result/p`;

async function callScript(scriptPath: string, params: any): Promise<any> {
  const url = `${API_BASE}/${scriptPath}`;

  console.log('📡 URL:', url);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`,
      },
      body: JSON.stringify(params),
    });

    console.log('📡 Status HTTP:', res.status);

    if (res.status === 401) {
      throw new Error('Error 401: Token inválido o sin permisos en este workspace.');
    }

    if (res.status === 404) {
      throw new Error(`Error 404: Script '${scriptPath}' no encontrado. Verifica que esté publicado.`);
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    const text = await res.text();
    if (!text) throw new Error('Respuesta vacía del servidor');

    return JSON.parse(text);
  } catch (error: any) {
    console.error('❌ Error en backend.ts:', error.message);
    throw error;
  }
}

// ✅ RUTAS CORRECTAS — Scripts movidos a carpeta compartida f/backend/
export const backend = {
  listar:         (params: any) => callScript('f/backend/listar', params),
  crear:          (params: any) => callScript('f/backend/crear', params),
  accion_etapa:   (params: any) => callScript('f/backend/accion_etapa', params),
  obtener_detalle:(params: any) => callScript('f/backend/obtener_detalle', params),
  subir_archivo:  (params: any) => callScript('f/backend/subir_archivo', params),
};