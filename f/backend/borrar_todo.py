import psycopg2

DB_CONFIG = {
    'host': 'evargaz-db-1',
    'database': 'windmill',
    'user': 'postgres',
    'password': 'changeme'
}

def main():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM operaciones_ok')
        conn.commit()
        cursor.close()
        return {'status': 'success', 'message': 'Todas las operaciones han sido eliminadas'}
    finally:
        conn.close()
