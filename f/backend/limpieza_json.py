import json
import psycopg2
import psycopg2.extras

DB_CONFIG = {
    'host': 'evargaz-db-1',
    'database': 'windmill',
    'user': 'postgres',
    'password': 'changeme'
}

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute('SELECT id, aprobaciones, documentos, pendientes FROM operaciones_ok')
        rows = cursor.fetchall()
        cursor.close()

        limpiadas = 0
        reporte = []

        for row in rows:
            row_id = row['id']
            cambios = []

            for campo in ['aprobaciones', 'documentos', 'pendientes']:
                val = row[campo]
                if val is None or val == '':
                    cambios.append((campo, '[]'))
                else:
                    try:
                        json.loads(val)
                    except:
                        cambios.append((campo, '[]'))
                        reporte.append(f"ID {row_id}: {campo} tenía basura")

            for campo, nuevo_val in cambios:
                cur2 = conn.cursor()
                cur2.execute(
                    f'UPDATE operaciones_ok SET {campo} = %s WHERE id = %s',
                    (nuevo_val, row_id)
                )
                cur2.close()

            if cambios:
                limpiadas += 1

            conn.commit()

        return {
            "filas_procesadas": len(rows),
            "filas_limpiadas": limpiadas,
            "problemas": reporte
        }
    finally:
        conn.close()
