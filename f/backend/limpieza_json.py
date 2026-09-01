import wmill

def main():
    db = wmill.datatable('operaciones_ok')

    rows = db.query("SELECT id, aprobaciones, documentos, pendientes FROM operaciones_ok").fetch()

    limpiadas = 0
    reporte = []

    for row in rows:
        row_id = row['id']
        cambios = []

        for campo in ['aprobaciones', 'documentos', 'pendientes']:
            val = row[campo]
            if val is None or val == '':
                cambios.append(f"{campo} = '[]'")
            else:
                # Verificar si es JSON válido
                try:
                    import json
                    json.loads(val)
                except:
                    cambios.append(f"{campo} = '[]'")
                    reporte.append(f"ID {row_id}: {campo} tenía basura")

        if cambios:
            sql = f"UPDATE operaciones_ok SET {', '.join(cambios)} WHERE id = '{row_id}'"
            db.query(sql)
            limpiadas += 1

    return {
        "filas_procesadas": len(rows),
        "filas_limpiadas": limpiadas,
        "problemas": reporte
    }