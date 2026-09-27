import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AlertCircle, ArrowLeft, Check, CloudOff, Loader2, MoreHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { COLORS } from '@/lib/colors'
import type { Project } from '@/lib/types'
import { cn } from '@/lib/utils'
import { CalendarActionsContext, type CalendarActions, type EditorTarget } from '../calendar/editor-context'
import { EditorDialog } from '../calendar/EditorDialog'
import { useCalendars } from '../calendar/queries'
import { ThemeToggle } from '../theme/ThemeToggle'
import { ProjectCanvas, type SaveState } from './diagram/ProjectCanvas'
import { useDeleteGeneralTask, usePatchGeneralTask, useProject } from './queries'

/** Lienzo de un proyecto: diagrama de actividades a pantalla completa */
export function ProjectPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const project = useProject(id)
  const [editor, setEditor] = useState<EditorTarget | null>(null)

  const actions = useMemo<CalendarActions>(
    () => ({
      openEditor: setEditor,
      openDay: (date) => navigate(`/dia/${date}`),
      openGeneral: () => navigate('/pendientes'),
    }),
    [navigate],
  )

  return (
    <CalendarActionsContext.Provider value={actions}>
      <div className="flex h-svh flex-col overflow-hidden">
        {project.isPending ? (
          <>
            <header className="flex h-[68px] items-center gap-3 border-b px-4">
              <Skeleton className="h-6 w-48" />
            </header>
            <div className="grid flex-1 place-items-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : project.isError || !project.data.isProject ? (
          <div className="grid flex-1 place-items-center p-6">
            <div className="flex max-w-sm flex-col items-center gap-3 text-center">
              <AlertCircle className="size-6 text-destructive" />
              <p className="text-sm text-muted-foreground">
                {project.isError ? `No se pudo abrir el proyecto: ${project.error.message}` : 'Esto no es un proyecto.'}
              </p>
              <Button variant="outline" asChild>
                <Link to="/pendientes">Volver a pendientes</Link>
              </Button>
            </div>
          </div>
        ) : (
          <Loaded key={project.data.id} project={project.data} />
        )}
      </div>
      <EditorDialog target={editor} onClose={() => setEditor(null)} />
    </CalendarActionsContext.Provider>
  )
}

function Loaded({ project }: { project: Project }) {
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [progress, setProgress] = useState(project.progress)
  const onProgress = useCallback(
    (p: Project['progress']) =>
      setProgress((prev) =>
        prev.done === p.done && prev.inProgress === p.inProgress && prev.total === p.total ? prev : p,
      ),
    [],
  )

  return (
    <>
      <ProjectHeader project={project} saveState={saveState} progress={progress} />
      <ProjectCanvas project={project} onSaveState={setSaveState} onProgress={onProgress} />
    </>
  )
}

function ProjectHeader({
  project,
  saveState,
  progress,
}: {
  project: Project
  saveState: SaveState
  progress: Project['progress']
}) {
  const navigate = useNavigate()
  const calendars = useCalendars()
  const patch = usePatchGeneralTask()
  const remove = useDeleteGeneralTask()
  const [title, setTitle] = useState(project.title)
  const [confirm, setConfirm] = useState(false)
  const category = calendars.data?.find((c) => c.id === project.calendarId)
  const pct = progress.total ? Math.round((progress.done * 100) / progress.total) : 0

  const saveTitle = () => {
    const t = title.trim()
    if (!t) return setTitle(project.title)
    if (t !== project.title) patch.mutate({ id: project.id, patch: { title: t } })
  }

  return (
    <header className="flex min-h-[68px] shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b px-3 py-3 sm:px-5">
      <Button variant="ghost" size="icon" asChild>
        <Link to="/pendientes" aria-label="Volver a pendientes">
          <ArrowLeft />
        </Link>
      </Button>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          {category && <span className={cn('size-2.5 shrink-0 rounded-full', COLORS[category.color].dot)} />}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                setTitle(project.title)
                e.currentTarget.blur()
              }
            }}
            maxLength={120}
            aria-label="Nombre del proyecto"
            className="min-w-0 flex-1 rounded-sm bg-transparent text-lg font-semibold tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:text-xl"
          />
        </div>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {progress.done}/{progress.total} actividades
          {progress.inProgress > 0 && (
            <span className="flex items-center gap-1.5 text-flow-active">
              <span className="flow-heartbeat size-1.5 rounded-full bg-flow-active" />
              {progress.inProgress} en progreso
            </span>
          )}
          <SaveIndicator state={saveState} />
        </span>
      </div>
      <Progress
        value={pct}
        className="hidden h-2 w-32 md:block"
        indicatorClassName={cn(pct === 100 && 'bg-emerald-600 dark:bg-emerald-500')}
        aria-label="Avance del proyecto"
      />
      <ThemeToggle className="hidden sm:inline-flex" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Opciones del proyecto">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm(true)}>
            <Trash2 />
            Eliminar proyecto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>¿Eliminar "{project.title}"?</DialogTitle>
            <DialogDescription>
              Se borra el diagrama. Lo que ya programaste en el calendario se queda allí. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => remove.mutate(project.id, { onSuccess: () => navigate('/pendientes', { replace: true }) })}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'error')
    return (
      <span className="flex items-center gap-1 text-destructive">
        <CloudOff className="size-3" /> Sin guardar
      </span>
    )
  if (state === 'saved')
    return (
      <span className="flex items-center gap-1">
        <Check className="size-3" /> Guardado
      </span>
    )
  return (
    <span className="flex items-center gap-1">
      <Loader2 className="size-3 animate-spin" /> Guardando…
    </span>
  )
}
