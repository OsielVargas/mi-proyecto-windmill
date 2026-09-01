"""
Calcula estadísticas de tiempos por etapa y rol para reportes.
Recibe una lista de operaciones y devuelve promedios, máximos, mínimos y totales.
"""
from datetime import datetime
from typing import List, Dict, Any, Optional

def calcular_tiempos_operacion(op: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Calcula los tiempos entre decisiones para una operación."""
    aprobaciones = op.get('aprobaciones', [])

    # ✅ CORREGIDO: Incluir 'aprobado' y 'aprobar' que usa accion_etapa
    decisiones_validas = [
        a for a in aprobaciones 
        if a.get('decision', '').lower() in [
            'approve', 'reject', 'avanzar', 'finalizar', 'rechazar', 'ok',
            'aprobado', 'aprobar', 'condicionada'
        ]
    ]

    # Ordenar por fecha
    sorted_decisions = sorted(decisiones_validas, key=lambda x: x.get('fecha', ''))

    # Eliminar duplicados por etapa (mantener la primera decisión de cada etapa)
    etapas_vistas = set()
    etapas_unicas = []
    for a in sorted_decisions:
        etapa_key = f"{a.get('etapa', '')}-{a.get('etapa_nombre', '')}"
        if etapa_key not in etapas_vistas:
            etapas_vistas.add(etapa_key)
            etapas_unicas.append(a)

    # Calcular duración entre decisiones
    tiempos = []
    fecha_anterior = None

    for a in etapas_unicas:
        fecha_str = a.get('fecha', '')
        fecha_actual = None
        if fecha_str:
            try:
                fecha_actual = datetime.fromisoformat(fecha_str.replace('Z', '+00:00'))
            except:
                pass

        duracion = None
        if fecha_anterior and fecha_actual:
            diff_seconds = (fecha_actual - fecha_anterior).total_seconds()
            duracion = round((diff_seconds / 3600) * 100) / 100  # Convertir a horas

        tiempos.append({
            'etapa': a.get('etapa_nombre') or f"Etapa {a.get('etapa')}",
            'rol': a.get('usuario', ''),
            'decision': a.get('decision', ''),
            'fecha': a.get('fecha', ''),
            'duracion_horas': duracion
        })

        fecha_anterior = fecha_actual

    return tiempos


def calcular_promedios_por_etapa(operaciones: List[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
    """Calcula promedios, máximos y mínimos por etapa."""
    por_etapa = {}

    for op in operaciones:
        tiempos = calcular_tiempos_operacion(op)
        for t in tiempos:
            if t['duracion_horas'] is not None and t['duracion_horas'] >= 0:
                etapa = t['etapa']
                if etapa not in por_etapa:
                    por_etapa[etapa] = {
                        'total': 0,
                        'count': 0,
                        'promedio': 0,
                        'max': 0,
                        'min': float('inf')
                    }
                por_etapa[etapa]['total'] += t['duracion_horas']
                por_etapa[etapa]['count'] += 1
                if t['duracion_horas'] > por_etapa[etapa]['max']:
                    por_etapa[etapa]['max'] = t['duracion_horas']
                if t['duracion_horas'] < por_etapa[etapa]['min']:
                    por_etapa[etapa]['min'] = t['duracion_horas']

    # Calcular promedios finales
    for etapa in por_etapa:
        if por_etapa[etapa]['count'] > 0:
            por_etapa[etapa]['promedio'] = round(por_etapa[etapa]['total'] / por_etapa[etapa]['count'], 2)
        if por_etapa[etapa]['min'] == float('inf'):
            por_etapa[etapa]['min'] = 0

    return por_etapa


def calcular_promedios_por_rol(operaciones: List[Dict[str, Any]]) -> Dict[str, Dict[str, float]]:
    """Calcula promedios, máximos y mínimos por rol."""
    por_rol = {}

    for op in operaciones:
        tiempos = calcular_tiempos_operacion(op)
        for t in tiempos:
            if t['duracion_horas'] is not None and t['duracion_horas'] >= 0:
                rol = t['rol']
                if rol not in por_rol:
                    por_rol[rol] = {
                        'total': 0,
                        'count': 0,
                        'promedio': 0,
                        'max': 0,
                        'min': float('inf')
                    }
                por_rol[rol]['total'] += t['duracion_horas']
                por_rol[rol]['count'] += 1
                if t['duracion_horas'] > por_rol[rol]['max']:
                    por_rol[rol]['max'] = t['duracion_horas']
                if t['duracion_horas'] < por_rol[rol]['min']:
                    por_rol[rol]['min'] = t['duracion_horas']

    # Calcular promedios finales
    for rol in por_rol:
        if por_rol[rol]['count'] > 0:
            por_rol[rol]['promedio'] = round(por_rol[rol]['total'] / por_rol[rol]['count'], 2)
        if por_rol[rol]['min'] == float('inf'):
            por_rol[rol]['min'] = 0

    return por_rol


def main(
    operaciones: List[Dict[str, Any]],
    filtro_rol: Optional[str] = None,
    filtro_fecha_desde: Optional[str] = None,
    filtro_fecha_hasta: Optional[str] = None
) -> Dict[str, Any]:
    """
    Calcula estadísticas completas de reportes.
    """
    # Aplicar filtros
    ops_filtradas = operaciones

    if filtro_rol:
        ops_filtradas = [op for op in ops_filtradas if op.get('rol_responsable') == filtro_rol]

    if filtro_fecha_desde:
        ops_filtradas = [op for op in ops_filtradas if op.get('fecha_creacion', '') >= filtro_fecha_desde]

    if filtro_fecha_hasta:
        ops_filtradas = [op for op in ops_filtradas if op.get('fecha_creacion', '') <= filtro_fecha_hasta]

    # Calcular estadísticas
    promedios_etapa = calcular_promedios_por_etapa(ops_filtradas)
    promedios_rol = calcular_promedios_por_rol(ops_filtradas)

    # Calcular tiempo total promedio
    total_tiempo = sum(e['promedio'] * e['count'] for e in promedios_etapa.values())
    total_count = sum(e['count'] for e in promedios_etapa.values()) or 1
    tiempo_total_promedio = total_tiempo / total_count

    # Encontrar etapa más lenta y más rápida
    etapa_mas_lenta = max(promedios_etapa.items(), key=lambda x: x[1]['promedio']) if promedios_etapa else None
    etapa_mas_rapida = min(
        [(e, d) for e, d in promedios_etapa.items() if d['count'] > 0],
        key=lambda x: x[1]['promedio']
    ) if promedios_etapa else None

    # Calcular detalle por operación
    detalle_operaciones = []
    for op in ops_filtradas[:20]:  # Limitar a 20 operaciones
        tiempos = calcular_tiempos_operacion(op)
        tiempo_total_op = sum(t['duracion_horas'] or 0 for t in tiempos)
        detalle_operaciones.append({
            'id': op.get('id'),
            'nombre_solicitante': op.get('nombre_solicitante'),
            'estado': op.get('estado'),
            'tiempo_total': round(tiempo_total_op, 2),
            'decisiones_count': len(tiempos),
            'tiempos': tiempos
        })

    return {
        'total_operaciones': len(ops_filtradas),
        'tiempo_total_promedio': round(tiempo_total_promedio, 2),
        'etapa_mas_lenta': {
            'nombre': etapa_mas_lenta[0],
            'promedio': etapa_mas_lenta[1]['promedio']
        } if etapa_mas_lenta else None,
        'etapa_mas_rapida': {
            'nombre': etapa_mas_rapida[0],
            'promedio': etapa_mas_rapida[1]['promedio']
        } if etapa_mas_rapida else None,
        'total_transiciones': sum(e['count'] for e in promedios_etapa.values()),
        'promedios_por_etapa': promedios_etapa,
        'promedios_por_rol': promedios_rol,
        'detalle_operaciones': detalle_operaciones
    }
