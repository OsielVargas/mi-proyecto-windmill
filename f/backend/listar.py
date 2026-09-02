import json
import psycopg2
import psycopg2.extras

DB_CONFIG = {
    'host': 'evargaz-db-1',
    'database': 'windmill',
    'user': 'postgres',
    'password': 'changeme'
}

def parse_json(val):
    if isinstance(val, str):
        try:
            return json.loads(val) if val else []
        except:
            return []
    return val or []

def main(
    modo: str = 'mis_tareas',
    usuario_email: str = '',
    usuario_username: str = '',
    usuario_rol: str = '',
):
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute('SELECT * FROM operaciones_ok ORDER BY fecha_creacion DESC')
        rows = cursor.fetchall()
        cursor.close()

        operations = []
        for row in rows:
            op = dict(row)
            op['aprobaciones'] = parse_json(op.get('aprobaciones'))
            op['documentos'] = parse_json(op.get('documentos'))
            op['pendientes'] = parse_json(op.get('pendientes'))
            operations.append(op)

        if modo == 'todas':
            return operations

        if modo == 'mis_tareas':
            filtradas = []
            for op in operations:
                estado = op.get('estado', '')
                es_responsable = (
                    op.get('rol_responsable') == usuario_rol
                    and estado in ('activa', 'condicionada')
                )

                tiene_pendiente_propio = False
                tiene_pendiente_cualquiera = False

                for p in op.get('pendientes', []):
                    if p.get('resuelto'):
                        continue

                    areas = []
                    area_legacy = p.get('area_seguimiento') or p.get('area') or p.get('rol_asignado') or p.get('usuario_asignado')
                    areas_nuevo = p.get('areas_seguimiento', [])

                    if isinstance(area_legacy, str) and area_legacy:
                        areas.append(area_legacy)
                    if isinstance(area_legacy, list):
                        areas.extend(area_legacy)
                    if isinstance(areas_nuevo, list):
                        areas.extend(areas_nuevo)

                    areas = list(set(areas))

                    if usuario_rol in areas:
                        tiene_pendiente_propio = True
                    if len(areas) > 0:
                        tiene_pendiente_cualquiera = True

                if usuario_rol == 'mesa_control':
                    if es_responsable or tiene_pendiente_cualquiera:
                        filtradas.append(op)
                else:
                    if es_responsable or tiene_pendiente_propio:
                        filtradas.append(op)

            return filtradas

        return operations
    finally:
        conn.close()
