import os
import uuid
import json
import psycopg2
import psycopg2.extras

DB_CONFIG = {
    'host': 'evargaz-db-1',
    'database': 'windmill',
    'user': 'postgres',
    'password': 'changeme'
}

ETAPAS = {
    1: {'nombre': 'Registro de operación', 'rol': 'cobranza', 'tiempo_horas': None},
    2: {'nombre': 'Vo Bo Análisis', 'rol': 'analisis_credito', 'tiempo_horas': 24},
    3: {'nombre': 'Documentación', 'rol': 'cobranza', 'tiempo_horas': 2},
    4: {'nombre': 'Revisión gerencia', 'rol': 'gerente_credito', 'tiempo_horas': 2},
    5: {'nombre': 'Mesa de control', 'rol': 'mesa_control', 'tiempo_horas': 2},
    6: {'nombre': 'Dirección general', 'rol': 'direccion_general', 'tiempo_horas': 2},
    7: {'nombre': 'Notificación disposición', 'rol': 'mesa_control', 'tiempo_horas': 2},
    8: {'nombre': 'Dispersión recursos', 'rol': 'tesoreria', 'tiempo_horas': 1},
    9: {'nombre': 'Envío documentos', 'rol': 'cobranza', 'tiempo_horas': None},
}

def get_etapa_info(etapa_num: int):
    return ETAPAS.get(etapa_num, {'nombre': 'Desconocida', 'rol': 'desconocido', 'tiempo_horas': None})

def main(
    nombre_solicitante: str,
    fecha_operacion: str,
    monto: float = 0,
    producto: str = '',
    datos_iniciales: dict = None,
    usuario_email: str = '',
    usuario_username: str = '',
    usuario_rol: str = ''
):
    email_real = os.environ.get("WM_EMAIL", usuario_email)
    username_real = os.environ.get("WM_USERNAME", usuario_username)

    if not fecha_operacion:
        return {"error": "La fecha de operación es requerida"}
    if not nombre_solicitante or not nombre_solicitante.strip():
        return {"error": "El nombre del solicitante es requerido"}

    if datos_iniciales is None:
        datos_iniciales = {}

    datos_iniciales["creado_por_email"] = email_real
    datos_iniciales["creado_por_username"] = username_real
    datos_iniciales["creado_por_rol"] = usuario_rol

    nuevo_id = uuid.uuid4().hex
    etapa_inicial = 1
    info_etapa = get_etapa_info(etapa_inicial)
    rol_responsable = info_etapa['rol']

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(
            '''INSERT INTO operaciones_ok (
                id, nombre_solicitante, monto, producto, fecha_operacion,
                estado, etapa_actual, rol_responsable,
                aprobaciones, documentos, pendientes, datos_extra, fecha_creacion
            ) VALUES (%s, %s, %s, %s, CAST(%s AS DATE), %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, NOW())
            RETURNING id, nombre_solicitante, monto, producto, fecha_operacion, estado, etapa_actual, rol_responsable, fecha_creacion''',
            (nuevo_id, nombre_solicitante.strip(), float(monto), producto, fecha_operacion,
            'activa', etapa_inicial, rol_responsable,
            '[]', '[]', '[]', json.dumps(datos_iniciales))
        )
        result = cursor.fetchone()
        conn.commit()
        cursor.close()
        return {"status": "success", "message": "Operación registrada", "data": dict(result)}
    except Exception as e:
        conn.rollback()
        return {"error": f"Error al crear operación: {str(e)}"}
    finally:
        conn.close()
