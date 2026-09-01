import wmill
import json

def main():
    db = wmill.datatable('operaciones_ok')

    rows = db.query('SELECT id, aprobaciones, documentos, pendientes FROM operaciones_ok').fetch()

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
            db.query(
                f"UPDATE operaciones_ok SET {campo} = $1 WHERE id = $2",
                nuevo_val, row_id
            )

        if cambios:
            limpiadas += 1

    return {
        "filas_procesadas": len(rows),
        "filas_limpiadas": limpiadas,
        "problemas": reporte
    }
