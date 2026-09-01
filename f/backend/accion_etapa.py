import wmill
import json
from datetime import datetime

ETAPAS = {
    1: {"nombre": "Registro de operación", "rol": "cobranza", "tiempo_horas": None},
    2: {"nombre": "Vo Bo Análisis", "rol": "analisis_credito", "tiempo_horas": 24},
    3: {"nombre": "Documentación", "rol": "cobranza", "tiempo_horas": 2},
    4: {"nombre": "Revisión gerencia", "rol": "gerente_credito", "tiempo_horas": 2},
    5: {"nombre": "Mesa de control", "rol": "mesa_control", "tiempo_horas": 2},
    6: {"nombre": "Dirección general", "rol": "direccion_general", "tiempo_horas": 2},
    7: {"nombre": "Notificación disposición", "rol": "mesa_control", "tiempo_horas": 2},
    8: {"nombre": "Dispersión recursos", "rol": "tesoreria", "tiempo_horas": 1},
    9: {"nombre": "Envío documentos", "rol": "cobranza", "tiempo_horas": None},
}

def get_etapa_info(etapa_num: int):
    return ETAPAS.get(etapa_num, {"nombre": "Desconocida", "rol": "desconocido", "tiempo_horas": None})

def parse_json(val):
    if isinstance(val, str):
        try:
            return json.loads(val) if val else []
        except:
            return []
    return val or []

def main(
    operation_id: str = "",
    accion: str = "",
    usuario_email: str = "",
    usuario_username: str = "",
    usuario: str = "",
    usuario_rol: str = "",
    comentarios: str = "",
    documento_url: str = "",
    documento_nombre: str = "",
    pendiente_texto: str = "",
    fecha_compromiso: str = "",
    area_seguimiento: str = "",
    areas_seguimiento: list = None,
    comentario_texto: str = "",
    pendiente_id: int = None,
):
    if areas_seguimiento is None:
        areas_seguimiento = []

    db = wmill.datatable('operaciones_ok')
    ahora = datetime.now().isoformat()

    # Buscar operación
    rows = db.query('SELECT * FROM operaciones_ok WHERE id = $1', operation_id).fetch()
    if not rows or len(rows) == 0:
        return {"error": "Operación no encontrada"}
    op = dict(rows[0])

    etapa_actual = op.get('etapa_actual', 1)
    info = get_etapa_info(etapa_actual)

    aprobaciones = parse_json(op.get('aprobaciones'))
    documentos = parse_json(op.get('documentos'))
    pendientes = parse_json(op.get('pendientes'))

    es_responsable = op.get('rol_responsable') == usuario_rol
    es_mesa_control = usuario_rol == 'mesa_control'

    # Verificar si tiene pendiente asignado
    tiene_pendiente_asignado = False
    for p in pendientes:
        if p.get('resuelto'):
            continue
        area_legacy = p.get('area_seguimiento') or p.get('area') or p.get('rol_asignado') or p.get('usuario_asignado')
        areas_nuevo = p.get('areas_seguimiento', [])
        if isinstance(area_legacy, str) and area_legacy == usuario_rol:
            tiene_pendiente_asignado = True
        if isinstance(areas_nuevo, list) and usuario_rol in areas_nuevo:
            tiene_pendiente_asignado = True
        if isinstance(area_legacy, list) and usuario_rol in area_legacy:
            tiene_pendiente_asignado = True

    puede_actuar_menor = es_responsable or es_mesa_control or tiene_pendiente_asignado

    # --- VALIDACIONES ---
    if accion in ('aprobar', 'avanzar', 'rechazar', 'registrar_pendiente'):
        if not (es_responsable or es_mesa_control):
            return {"error": "No tienes permisos para esta acción en esta etapa."}

    if accion in ('registrar_comentario', 'adjuntar_doc'):
        if not puede_actuar_menor:
            return {"error": "No tienes permisos para realizar esta acción."}

    # --- REGISTRAR COMENTARIO ---
    if accion == 'registrar_comentario':
        texto = comentario_texto or comentarios
        if not texto:
            return {"error": "El comentario no puede estar vacío"}
        aprobaciones.append({
            "etapa": etapa_actual, "etapa_nombre": info['nombre'],
            "usuario": usuario or usuario_username or usuario_email,
            "decision": "comentario", "comentarios": texto, "fecha": ahora
        })
        result = db.query(
            'UPDATE operaciones_ok SET aprobaciones = $1::jsonb WHERE id = $2 RETURNING *',
            json.dumps(aprobaciones), operation_id
        ).fetch()
        return {"status": "ok", "message": "Comentario registrado"}

    # --- ADJUNTAR DOCUMENTO ---
    if accion == 'adjuntar_doc' and documento_url:
        documentos.append({
            "etapa": etapa_actual, "etapa_nombre": info['nombre'],
            "usuario": usuario or usuario_username or usuario_email,
            "nombre": documento_nombre or "Documento", "url": documento_url, "fecha": ahora
        })
        result = db.query(
            'UPDATE operaciones_ok SET documentos = $1::jsonb WHERE id = $2 RETURNING *',
            json.dumps(documentos), operation_id
        ).fetch()
        return {"status": "ok", "message": "Documento adjuntado"}

    # --- REGISTRAR PENDIENTE (solo mesa_control asigna áreas y fecha) ---
    if accion == 'registrar_pendiente' and pendiente_texto:
        nuevo = {
            "id": len(pendientes),
            "etapa": etapa_actual,
            "etapa_nombre": info['nombre'],
            "usuario": usuario or usuario_username or usuario_email,
            "texto": pendiente_texto,
            "comentarios": comentarios,
            "resuelto": False,
            "fecha": ahora
        }
        # ✅ Guardar áreas como array (nuevo) y string legacy (compatibilidad)
        if es_mesa_control and areas_seguimiento:
            nuevo["areas_seguimiento"] = areas_seguimiento
            if len(areas_seguimiento) == 1:
                nuevo["area_seguimiento"] = areas_seguimiento[0]
            else:
                nuevo["area_seguimiento"] = ""
        elif es_mesa_control and area_seguimiento:
            nuevo["area_seguimiento"] = area_seguimiento
            nuevo["areas_seguimiento"] = [area_seguimiento]

        if es_mesa_control and fecha_compromiso:
            nuevo["fecha_compromiso"] = fecha_compromiso
            op['estado'] = 'condicionada'

        pendientes.append(nuevo)
        result = db.query(
            'UPDATE operaciones_ok SET pendientes = $1::jsonb, estado = $2 WHERE id = $3 RETURNING *',
            json.dumps(pendientes), op.get('estado', 'activa'), operation_id
        ).fetch()
        return {"status": "ok", "message": "Pendiente registrado"}

    # --- NOTIFICAR ATENCIÓN (rol asignado informa a mesa_control) ---
    if accion == 'notificar_atencion':
        for p in pendientes:
            if (p.get('id') == pendiente_id or pendientes.index(p) == pendiente_id) and not p.get('resuelto'):
                area_legacy = p.get('area_seguimiento') or p.get('area') or p.get('rol_asignado') or p.get('usuario_asignado')
                areas_nuevo = p.get('areas_seguimiento', [])

                es_asignado = False
                if isinstance(area_legacy, str) and area_legacy == usuario_rol:
                    es_asignado = True
                if isinstance(areas_nuevo, list) and usuario_rol in areas_nuevo:
                    es_asignado = True
                if isinstance(area_legacy, list) and usuario_rol in area_legacy:
                    es_asignado = True

                if not es_asignado:
                    return {"error": "No estás asignado a este pendiente."}

                # Registrar comentario automático de notificación
                aprobaciones.append({
                    "etapa": etapa_actual,
                    "etapa_nombre": info['nombre'],
                    "usuario": usuario or usuario_username or usuario_email,
                    "decision": "comentario",
                    "comentarios": comentario_texto or f"📢 {usuario_username or usuario_rol} reporta atención del pendiente: '{p.get('texto')}'",
                    "fecha": ahora
                })

                p['atencion_notificada'] = True
                p['fecha_notificacion'] = ahora
                p['notificado_por'] = usuario_username or usuario_rol

                result = db.query(
                    'UPDATE operaciones_ok SET aprobaciones = $1::jsonb, pendientes = $2::jsonb WHERE id = $3 RETURNING *',
                    json.dumps(aprobaciones), json.dumps(pendientes), operation_id
                ).fetch()
                return {"status": "ok", "message": "Atención notificada a Mesa de Control. En espera de liberación."}
        return {"error": "Pendiente no encontrado o ya resuelto"}

    # --- LIBERAR PENDIENTE (SOLO MESA DE CONTROL) ---
    if accion == 'liberar_pendiente':
        if not es_mesa_control:
            return {"error": "Solo Mesa de Control puede liberar pendientes"}
        for p in pendientes:
            if p.get('id') == pendiente_id or pendientes.index(p) == pendiente_id:
                p['resuelto'] = True
                p['fecha_resolucion'] = ahora
                p['resuelto_por'] = usuario_username or usuario_rol
                break
        tiene_activos = any(not p.get('resuelto', False) and (p.get('fecha_compromiso') or p.get('areas_seguimiento') or p.get('area_seguimiento')) for p in pendientes)
        nuevo_estado = 'activa' if (not tiene_activos and op.get('estado') == 'condicionada') else op.get('estado', 'activa')
        result = db.query(
            'UPDATE operaciones_ok SET estado = $1, pendientes = $2::jsonb WHERE id = $3 RETURNING *',
            nuevo_estado, json.dumps(pendientes), operation_id
        ).fetch()
        return {"status": "ok", "message": "Pendiente liberado por Mesa de Control"}

    # --- APROBAR / AVANZAR ---
    if accion in ('aprobar', 'avanzar'):
        aprobaciones.append({
            "etapa": etapa_actual, "etapa_nombre": info['nombre'],
            "usuario": usuario or usuario_username or usuario_email,
            "decision": "aprobado", "comentarios": comentarios or "Aprobado", "fecha": ahora
        })
        if etapa_actual >= 9:
            result = db.query(
                'UPDATE operaciones_ok SET estado = $1, etapa_actual = $2, aprobaciones = $3::jsonb WHERE id = $4 RETURNING *',
                'finalizada', 9, json.dumps(aprobaciones), operation_id
            ).fetch()
            return {"status": "finalizada", "message": "Operación finalizada correctamente"}
        else:
            nueva_etapa = etapa_actual + 1
            nueva_info = get_etapa_info(nueva_etapa)
            result = db.query(
                'UPDATE operaciones_ok SET etapa_actual = $1, rol_responsable = $2, aprobaciones = $3::jsonb WHERE id = $4 RETURNING *',
                nueva_etapa, nueva_info['rol'], json.dumps(aprobaciones), operation_id
            ).fetch()
            return {"status": "avanzada", "message": f"Avanzada a etapa {nueva_etapa}"}

    # --- RECHAZAR ---
    if accion == 'rechazar':
        aprobaciones.append({
            "etapa": etapa_actual, "etapa_nombre": info['nombre'],
            "usuario": usuario or usuario_username or usuario_email,
            "decision": "rechazado", "comentarios": comentarios, "fecha": ahora
        })
        result = db.query(
            'UPDATE operaciones_ok SET estado = $1, aprobaciones = $2::jsonb WHERE id = $3 RETURNING *',
            'rechazada', json.dumps(aprobaciones), operation_id
        ).fetch()
        return {"status": "rechazada", "message": "Operación rechazada"}

    return {"error": f"Acción no reconocida: {accion}"}