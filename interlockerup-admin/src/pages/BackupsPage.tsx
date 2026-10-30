import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  DatabaseBackup,
  Clock,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  RotateCcw,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react'

import { Header } from '../components/admin/header'
import { StatsCard } from '../components/admin/stats-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Switch } from '../components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
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
import { fastFetch } from '../api/apiConfig'

// ------------------------------------------------------------
// Tipos
// ------------------------------------------------------------

interface Backup {
  id: number
  filename: string
  tipo: string
  origen: string
  size_bytes: number | null
  checksum_sha256: string | null
  estado: string
  notas: string | null
  almacen: string
  creado_el: string
}

interface Schedule {
  id: number
  frecuencia: string
  hora: string
  dia_semana: number | null
  dias_retencion: number
  activo: boolean
  cron_expr: string
  ultimo_ejecutado: string | null
  creado_el: string
}

interface ScheduleForm {
  frecuencia: string
  hora: string
  dia_semana: number | null
  dias_retencion: number
  activo: boolean
}

const DIAS_SEMANA = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
]

function formatearBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// fastFetch devuelve la Response cruda: parseamos JSON y extraemos el mensaje de error
async function jsonFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const res = await fastFetch(endpoint, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.mensaje || `Error ${res.status}`)
  return data
}

// Descarga autenticada (fastFetch solo maneja JSON)
async function descargarRespaldo(id: number, filename: string) {
  const token = localStorage.getItem('admin_token')
  const res = await fetch(`/api/backups/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('No se pudo descargar el respaldo')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ------------------------------------------------------------
// Página
// ------------------------------------------------------------

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [verifyingId, setVerifyingId] = useState<number | null>(null)
  const [restoringId, setRestoringId] = useState<number | null>(null)

  // Dialog de programa (crear o editar)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [form, setForm] = useState<ScheduleForm>({
    frecuencia: 'diaria',
    hora: '03:00',
    dia_semana: null,
    dias_retencion: 90,
    activo: true,
  })
  const [saving, setSaving] = useState(false)

  const [deleteScheduleId, setDeleteScheduleId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const cargarDatos = useCallback(async () => {
    try {
      const [resBackups, resSchedules] = await Promise.all([
        jsonFetch('/backups'),
        jsonFetch('/backups/schedules'),
      ])
      setBackups(resBackups)
      setSchedules(resSchedules)
    } catch (error) {
      toast.error('Error al cargar los respaldos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarDatos()
  }, [cargarDatos])

  // ------------------------------------------------------------
  // Acciones sobre respaldos
  // ------------------------------------------------------------

  const crearRespaldo = async () => {
    setCreating(true)
    try {
      const res = await jsonFetch('/backups', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      toast.success(res.mensaje || 'Respaldo creado correctamente')
      await cargarDatos()
    } catch (error: any) {
      toast.error(error?.message || 'Error al crear el respaldo')
    } finally {
      setCreating(false)
    }
  }

  const verificarRespaldo = async (id: number) => {
    setVerifyingId(id)
    try {
      const res = await jsonFetch(`/backups/${id}/verificar`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      if (res.valido) {
        toast.success('Integridad verificada: el respaldo está íntegro')
      } else {
        toast.error(res.motivo || 'El respaldo no superó la verificación de integridad')
      }
      await cargarDatos()
    } catch (error: any) {
      toast.error(error?.message || 'Error al verificar el respaldo')
    } finally {
      setVerifyingId(null)
    }
  }

  const restaurarRespaldo = async () => {
    if (restoringId === null) return
    setRestoringId(-1) // estado "ejecutando"
    try {
      const res = await jsonFetch(`/backups/${restoringId}/restaurar`, {
        method: 'POST',
        body: JSON.stringify({ confirmar: true }),
      })
      toast.success(res.mensaje || 'Base de datos restaurada correctamente')
      await cargarDatos()
    } catch (error: any) {
      toast.error(error?.message || 'Error al restaurar el respaldo')
    } finally {
      setRestoringId(null)
    }
  }

  // ------------------------------------------------------------
  // Acciones sobre programas
  // ------------------------------------------------------------

  const abrirDialogNuevo = () => {
    setEditingSchedule(null)
    setForm({ frecuencia: 'diaria', hora: '03:00', dia_semana: null, dias_retencion: 90, activo: true })
    setDialogOpen(true)
  }

  const abrirDialogEditar = (s: Schedule) => {
    setEditingSchedule(s)
    setForm({
      frecuencia: s.frecuencia,
      hora: s.hora,
      dia_semana: s.dia_semana,
      dias_retencion: s.dias_retencion,
      activo: s.activo,
    })
    setDialogOpen(true)
  }

  const guardarPrograma = async () => {
    setSaving(true)
    try {
      if (editingSchedule) {
        await jsonFetch(`/backups/schedules/${editingSchedule.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        })
        toast.success('Programa actualizado correctamente')
      } else {
        await jsonFetch('/backups/schedules', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        toast.success('Programa creado correctamente')
      }
      setDialogOpen(false)
      await cargarDatos()
    } catch (error: any) {
      toast.error(error?.message || 'Error al guardar el programa')
    } finally {
      setSaving(false)
    }
  }

  const alternarActivo = async (s: Schedule) => {
    try {
      await jsonFetch(`/backups/schedules/${s.id}`, {
        method: 'PUT',
        body: JSON.stringify({ activo: !s.activo }),
      })
      toast.success(s.activo ? 'Programa desactivado' : 'Programa activado')
      await cargarDatos()
    } catch (error: any) {
      toast.error(error?.message || 'Error al cambiar el estado del programa')
    }
  }

  const eliminarPrograma = async () => {
    if (deleteScheduleId === null) return
    setDeleting(true)
    try {
      await jsonFetch(`/backups/schedules/${deleteScheduleId}`, { method: 'DELETE' })
      toast.success('Programa eliminado correctamente')
      setDeleteScheduleId(null)
      await cargarDatos()
    } catch (error: any) {
      toast.error(error?.message || 'Error al eliminar el programa')
    } finally {
      setDeleting(false)
    }
  }

  // ------------------------------------------------------------
  // Estadísticas
  // ------------------------------------------------------------

  const ultimoBackup = backups[0]
  const totalBytes = backups.reduce((acc, b) => acc + (b.size_bytes || 0), 0)
  const activos = schedules.filter((s) => s.activo).length

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <div className="min-h-screen bg-background">
      <Header title="Respaldos del sistema" description="Copias de seguridad, programación y restauración de la base de datos" />

      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-end">
          <Button onClick={crearRespaldo} disabled={creating}>
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseBackup className="w-4 h-4" />}
            Crear respaldo ahora
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total respaldos" value={String(backups.length)} icon={DatabaseBackup} />
          <StatsCard
            title="Último respaldo"
            value={ultimoBackup ? ultimoBackup.creado_el : 'Ninguno'}
            icon={Clock}
          />
          <StatsCard
            title="Espacio ocupado"
            value={formatearBytes(totalBytes)}
            icon={HardDrive}
          />
          <StatsCard
            title="Programas activos"
            value={`${activos} / ${schedules.length}`}
            icon={RefreshCw}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gestión de respaldos</CardTitle>
            <CardDescription>
              Historial de copias de seguridad y programación de respaldos automáticos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="historial">
              <TabsList>
                <TabsTrigger value="historial">Historial</TabsTrigger>
                <TabsTrigger value="programacion">Programación</TabsTrigger>
              </TabsList>

              {/* ---------------- HISTORIAL ---------------- */}
              <TabsContent value="historial">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Origen</TableHead>
                      <TableHead>Almacén</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : backups.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No hay respaldos registrados. Crea el primero con «Crear respaldo ahora».
                        </TableCell>
                      </TableRow>
                    ) : (
                      backups.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-sm">#{b.id}</TableCell>
                          <TableCell className="text-sm">{b.creado_el}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {b.origen.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={b.almacen === 's3' ? 'secondary' : 'outline'}>
                              {b.almacen === 's3' ? 'Remoto' : 'Local'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatearBytes(b.size_bytes)}</TableCell>
                          <TableCell>
                            {b.estado === 'ok' ? (
                              <Badge className="bg-green-600 hover:bg-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                OK
                              </Badge>
                            ) : b.estado === 'en_proceso' ? (
                              <Badge variant="secondary">En proceso</Badge>
                            ) : (
                              <Badge variant="destructive">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Fallo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => descargarRespaldo(b.id, b.filename).catch(() => toast.error('Error al descargar'))}
                                title="Descargar"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => verificarRespaldo(b.id)}
                                disabled={verifyingId === b.id}
                                title="Verificar integridad"
                              >
                                {verifyingId === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setRestoringId(b.id)}
                                title="Restaurar esta copia"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* ---------------- PROGRAMACIÓN ---------------- */}
              <TabsContent value="programacion">
                <div className="flex justify-end mb-4">
                  <Button onClick={abrirDialogNuevo}>
                    <Plus className="w-4 h-4" />
                    Nuevo programa
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Frecuencia</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead>Día</TableHead>
                      <TableHead>Retención</TableHead>
                      <TableHead>Último ejecutado</TableHead>
                      <TableHead>Activo</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : schedules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No hay programas de respaldo. Crea uno con «Nuevo programa».
                        </TableCell>
                      </TableRow>
                    ) : (
                      schedules.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="capitalize">{s.frecuencia}</TableCell>
                          <TableCell className="font-mono text-sm">{s.hora}</TableCell>
                          <TableCell className="text-sm">
                            {s.frecuencia === 'semanal'
                              ? DIAS_SEMANA.find((d) => d.value === s.dia_semana)?.label || '—'
                              : '—'}
                          </TableCell>
                          <TableCell className="text-sm">{s.dias_retencion} días</TableCell>
                          <TableCell className="text-sm">{s.ultimo_ejecutado || 'Nunca'}</TableCell>
                          <TableCell>
                            <Switch checked={s.activo} onCheckedChange={() => alternarActivo(s)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => abrirDialogEditar(s)} title="Editar">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteScheduleId(s.id)}
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* ---------------- DIALOG: crear/editar programa ---------------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Editar programa' : 'Nuevo programa de respaldo'}</DialogTitle>
            <DialogDescription>
              Define cuándo se tomarán los respaldos automáticos y cuántos conservar.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Frecuencia</Label>
              <Select
                value={form.frecuencia}
                onValueChange={(v) => setForm({ ...form, frecuencia: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diaria">Diaria</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Hora (servidor)</Label>
              <Input
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
              />
            </div>

            {form.frecuencia === 'semanal' && (
              <div className="grid gap-2">
                <Label>Día de la semana</Label>
                <Select
                  value={form.dia_semana === null ? '' : String(form.dia_semana)}
                  onValueChange={(v) => setForm({ ...form, dia_semana: v === '' ? null : Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el día" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Días de retención</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={form.dias_retencion}
                onChange={(e) => setForm({ ...form, dias_retencion: Number(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">
                Los respaldos más antiguos que excedan esta cantidad se eliminan automáticamente.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="activo"
                checked={form.activo}
                onCheckedChange={(v: boolean) => setForm({ ...form, activo: v })}
              />
              <Label htmlFor="activo" className="text-sm font-normal">
                Programa activo
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarPrograma} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingSchedule ? 'Guardar cambios' : 'Crear programa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------------- ALERT: restaurar ---------------- */}
      <AlertDialog open={restoringId !== null && restoringId > 0} onOpenChange={(o) => !o && setRestoringId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restaurar esta copia de seguridad?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción <strong>reemplazará toda la base de datos actual</strong> con la
              copia seleccionada. Antes de sobrescribir se tomará automáticamente un respaldo
              de seguridad. Esta acción no se puede deshacer manualmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={restaurarRespaldo}>Sí, restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ---------------- ALERT: eliminar programa ---------------- */}
      <AlertDialog open={deleteScheduleId !== null} onOpenChange={(o) => !o && setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este programa?</AlertDialogTitle>
            <AlertDialogDescription>
              El respaldo automático dejará de ejecutarse con esta programación. Los respaldos
              ya creados no se verán afectados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={eliminarPrograma} disabled={deleting}>
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
