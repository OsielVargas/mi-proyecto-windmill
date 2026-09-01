import wmill

def main():
    db = wmill.datatable('operaciones_ok')
    
    # Contar
    count_rows = db.query('SELECT COUNT(*) as total FROM operaciones_ok').fetch()
    total = count_rows[0]['total'] if count_rows else 0
    print(f"🗑️  Borrando {total} operación(es)...")
    
    # Borrar
    db.query('DELETE FROM operaciones_ok')
    
    # Verificar
    verify = db.query('SELECT COUNT(*) as total FROM operaciones_ok').fetch()
    restantes = verify[0]['total'] if verify else 0
    
    print(f"✅ Borrado completado. Operaciones restantes: {restantes}")
    return {"status": "ok", "borradas": total, "restantes": restantes}