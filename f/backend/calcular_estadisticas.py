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
        cursor.execute('SELECT * FROM operaciones_ok')
        rows = cursor.fetchall()
        cursor.close()

        total = len(rows)
        activas = sum(1 for r in rows if r['estado'] == 'activa')
        condicionadas = sum(1 for r in rows if r['estado'] == 'condicionada')
        finalizadas = sum(1 for r in rows if r['estado'] == 'finalizada')
        rechazadas = sum(1 for r in rows if r['estado'] == 'rechazada')

        etapas_count = {}
        for r in rows:
            etapa = r.get('etapa_actual', 1)
            etapas_count[etapa] = etapas_count.get(etapa, 0) + 1

        montos = [float(r.get('monto', 0) or 0) for r in rows]
        monto_total = sum(montos)
        monto_promedio = monto_total / len(montos) if montos else 0
        monto_max = max(montos) if montos else 0
        monto_min = min(montos) if montos else 0

        return {
            'total': total,
            'activas': activas,
            'condicionadas': condicionadas,
            'finalizadas': finalizadas,
            'rechazadas': rechazadas,
            'monto_total': monto_total,
            'monto_promedio': round(monto_promedio, 2),
            'monto_max': monto_max,
            'monto_min': monto_min,
            'etapas': etapas_count
        }
    finally:
        conn.close()
