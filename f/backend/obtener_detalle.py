import os
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
    operation_id: str,
    usuario_email: str = '',
    usuario_username: str = '',
    usuario_rol: str = ''
):
    email_real = os.environ.get('WM_EMAIL', usuario_email)
    username_real = os.environ.get('WM_USERNAME', usuario_username)

    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute('SELECT * FROM operaciones_ok WHERE id = %s', (operation_id,))
        op = cursor.fetchone()
        cursor.close()

        if not op:
            return {'error': 'No encontrada'}

        op = dict(op)
        etapa = op.get('etapa_actual', 1)
        info = get_etapa_info(etapa)
        op['etapa_nombre'] = info['nombre']
        op['rol_responsable'] = info['rol']
        op['tiempo_max_horas'] = info['tiempo_horas']

        for campo in ['aprobaciones', 'documentos', 'pendientes']:
            val = op.get(campo, '[]')
            if isinstance(val, str):
                try:
                    op[campo] = json.loads(val) if val else []
                except:
                    op[campo] = []
            elif val is None:
                op[campo] = []

        op['usuario_actual_email'] = email_real
        op['usuario_actual_username'] = username_real

        return op
    finally:
        conn.close()
