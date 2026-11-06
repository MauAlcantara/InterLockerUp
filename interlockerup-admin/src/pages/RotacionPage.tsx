import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { fastFetch } from '../api/apiConfig'
import {
  CalendarClock,
  Clock,
  Box,
  Inbox,
  CheckCircle2,
  Bell,
  Loader2,
  Lock,
  Trash2,
} from 'lucide-react'

import { Header } from '../components/admin/header'
import { StatsCard } from '../components/admin/stats-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Badge } from '../components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog'

// fastFetch devuelve la Response cruda: parseamos JSON y extraemos el mensaje de error
async function jsonFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const res = await fastFetch(endpoint, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`)
  return data
}

// ------------------------------------------------------------
// Tipos
// ------------------------------------------------------------

interface DashboardRotacion {
  periodoVigente: { cuatrimestre: number; anio: number }
  diasRestantes: number
  diasTotalPeriodo: number
  proximoPeriodo: { cuatrimestre: number; anio: number }
  lockers: { activos: number; disponibles: number; total: number }
  solicitudes: { pendientes: number; resueltas: number }
  notificacion: { enviada: boolean; enviadaEl: string | null }
  ultimaLimpieza: {
    ejecutadoEl: string | null
    asignacionesFinalizadas: number
    tokensEliminados: number
    sesionesEliminados: number
    iotComandosEliminados: number
    notificacionesEliminados: number
    logsEliminados: number
    solicitudesObsoletasEliminados: number
    securityLogsEliminados: number
    incidentesEliminados: number
    dispositivosEliminados: number
  }
  ultimoPeriodoCerrado: { cuatrimestre: number; anio: number; cerradoEl: string | null } | null
}

interface RotationRun {
  id: number
  ejecutado_el: string
  periodo_vigente_cuatrimestre: number
  periodo_vigente_anio: number
  periodo_cerrado: string | null
  asignaciones_finalizadas: number
  solicitudes_rechazadas: number
  tokens_eliminados: number
  sesiones_eliminados: number
  iot_comandos_eliminados: number
  notificaciones_eliminados: number
  logs_eliminados: number
  solicitudes_obsoletas_eliminados: number
  security_logs_eliminados: number
  incidentes_eliminados: number
  dispositivos_eliminados: number
}

function fmtFecha(v: string | null): string {
  if (!v) return '—'
  return new Date(v).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
}

// ------------------------------------------------------------
// Página
// ------------------------------------------------------------

export default function RotacionPage() {
  const [data, setData] = useState<DashboardRotacion | null>(null)
  const [runs, setRuns] = useState<RotationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [notifying, setNotifying] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)

  const cargarDatos = useCallback(async () => {
    try {
      const [dash, hist] = await Promise.all([
        jsonFetch('/admin/rotation/dashboard'),
        jsonFetch('/admin/rotation/runs'),
      ])
      setData(dash)
      setRuns(hist)
    } catch (error) {
      toast.error('Error al cargar la información de rotación')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void cargarDatos()
  }, [cargarDatos])

  const enviarNotificacion = async () => {
    setNotifying(true)
    try {
      const res = await jsonFetch('/admin/rotation/notify', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      toast.success(res.mensaje)
      await cargarDatos()
    } catch (error: any) {
      toast.error(error?.message || 'Error al enviar la notificación')
    } finally {
      setNotifying(false)
    }
  }

  const cerrarPeriodo = async () => {
    setClosing(true)
    try {
      const res = await jsonFetch('/admin/rotation/close-period', {
        method: 'POST',
        body: JSON.stringify({ confirmar: true }),
      })
      toast.success(res.mensaje || 'Periodo cerrado correctamente')
      setCloseDialogOpen(false)
      await cargarDatos()
    } catch (error: any) {
      toast.error(error?.message || 'Error al cerrar el periodo')
    } finally {
      setClosing(false)
    }
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const progreso = Math.min(100, Math.max(0, Math.round((1 - data.diasRestantes / data.diasTotalPeriodo) * 100)))
  const etiqueta = (p: { cuatrimestre: number; anio: number }) => `C${p.cuatrimestre} ${p.anio}`

  return (
    <div className="min-h-screen bg-background">
      <Header
        title="Rotación de lockers"
        description="Ciclo cuatrimestral: estado del periodo vigente, limpieza automática y notificación a estudiantes"
      />

      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-end gap-2">
          <Button
            onClick={enviarNotificacion}
            disabled={notifying || data.notificacion.enviada}
            title={data.notificacion.enviada ? 'Notificación ya enviada para este periodo' : 'Enviar aviso de rotación a los estudiantes'}
          >
            {notifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {data.notificacion.enviada ? 'Notificación enviada' : 'Enviar notificación'}
          </Button>
          <Button variant="destructive" onClick={() => setCloseDialogOpen(true)}>
            <Lock className="w-4 h-4" />
            Cerrar periodo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Periodo vigente"
            value={etiqueta(data.periodoVigente)}
            description={`Próximo: ${etiqueta(data.proximoPeriodo)}`}
            icon={CalendarClock}
          />
          <StatsCard
            title="Días restantes"
            value={String(data.diasRestantes)}
            description={`de ${data.diasTotalPeriodo} días del periodo`}
            icon={Clock}
            variant={data.diasRestantes <= 30 ? 'warning' : 'default'}
          />
          <StatsCard
            title="Lockers"
            value={`${data.lockers.activos} / ${data.lockers.total}`}
            description={`${data.lockers.disponibles} disponibles`}
            icon={Box}
          />
          <StatsCard
            title="Solicitudes"
            value={String(data.solicitudes.pendientes)}
            description={`${data.solicitudes.resueltas} resueltas`}
            icon={Inbox}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Estado del periodo</CardTitle>
            <CardDescription>
              Progreso del cuatrimestre vigente, última limpieza automática y estado de la notificación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>
                  {etiqueta(data.periodoVigente)} → {etiqueta(data.proximoPeriodo)}
                </span>
                <span className="text-muted-foreground">{progreso}% del periodo transcurrido</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progreso}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                {data.notificacion.enviada ? (
                  <Badge className="bg-green-600 hover:bg-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Notificación enviada
                  </Badge>
                ) : (
                  <Badge variant="secondary">Notificación pendiente</Badge>
                )}
                <span className="text-muted-foreground">
                  {data.notificacion.enviadaEl ? `el ${fmtFecha(data.notificacion.enviadaEl)}` : 'aún no se ha enviado'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Última limpieza:</span>
                <span>{fmtFecha(data.ultimaLimpieza.ejecutadoEl)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Último periodo cerrado:</span>
                <span>
                  {data.ultimoPeriodoCerrado
                    ? `${etiqueta(data.ultimoPeriodoCerrado)} (${fmtFecha(data.ultimoPeriodoCerrado.cerradoEl)})`
                    : 'ninguno'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial de rotaciones</CardTitle>
            <CardDescription>
              Ejecuciones diarias del mantenimiento automático (asignaciones finalizadas, tokens y registros obsoletos purgados)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Ejecutado</TableHead>
                  <TableHead>Periodo</TableHead>
                  <TableHead>Asig. finalizadas</TableHead>
                  <TableHead>Rechazadas</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Sesiones</TableHead>
                  <TableHead>IoT</TableHead>
                  <TableHead>Notif.</TableHead>
                  <TableHead>Logs</TableHead>
                  <TableHead>Obsoletos</TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead>Incid.</TableHead>
                  <TableHead>Dispos.</TableHead>
                  <TableHead>Periodo cerrado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                      Aún no hay ejecuciones registradas. La primera aparecerá tras la limpieza diaria de las 02:00.
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-sm">#{r.id}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{fmtFecha(r.ejecutado_el)}</TableCell>
                      <TableCell className="text-sm">C{r.periodo_vigente_cuatrimestre} {r.periodo_vigente_anio}</TableCell>
                      <TableCell>{r.asignaciones_finalizadas}</TableCell>
                      <TableCell>{r.solicitudes_rechazadas}</TableCell>
                      <TableCell>{r.tokens_eliminados}</TableCell>
                      <TableCell>{r.sesiones_eliminados}</TableCell>
                      <TableCell>{r.iot_comandos_eliminados}</TableCell>
                      <TableCell>{r.notificaciones_eliminados}</TableCell>
                      <TableCell>{r.logs_eliminados}</TableCell>
                      <TableCell>{r.solicitudes_obsoletas_eliminados}</TableCell>
                      <TableCell>{r.security_logs_eliminados}</TableCell>
                      <TableCell>{r.incidentes_eliminados}</TableCell>
                      <TableCell>{r.dispositivos_eliminados}</TableCell>
                      <TableCell className="text-sm">
                        {r.periodo_cerrado ? (
                          <Badge variant="outline">
                            <Trash2 className="w-3 h-3 mr-1" />
                            {r.periodo_cerrado}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar el periodo {etiqueta(data.periodoVigente)}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se finalizarán todas las asignaciones vigentes, se revocarán los tokens activos y
              se bloquearán los lockers. Esta acción normalmente la ejecuta el cron automáticamente
              al inicio de cada cuatrimestre; solo úsala si necesitas forzarla manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={cerrarPeriodo} disabled={closing}>
              {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, cerrar periodo'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
