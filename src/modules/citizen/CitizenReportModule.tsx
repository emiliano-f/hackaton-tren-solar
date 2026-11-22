import { useState, type ChangeEvent, type FormEvent } from 'react'
import { createReport, getReports } from '../../shared/repository'
import type { EnvironmentalReport, Priority, ReportCategory, ReportStatus } from '../../shared/types'
import {
  CameraIcon, CATEGORY_ICONS, CheckCircleIcon, CloseIcon, LocateIcon, PinIcon, SendIcon,
} from './icons'
import { LocationPreview } from './LocationPreview'
import { approximateKilobytes, compressPhoto, isQuotaError, PhotoError } from './photo'
import {
  CATEGORY_LABELS, DESCRIPTION_MAX, TITLE_MAX, draftCoordinates, emptyDraft, isInsideJujuy, parseCoordinate, validateDraft,
  type DraftErrors, type ReportDraft,
} from './validation'

/** Prioridad inicial sugerida; Gestión la puede cambiar después. */
const INITIAL_PRIORITY: Record<ReportCategory, Priority> = {
  fire: 'high', water: 'medium', deforestation: 'medium', waste: 'medium', other: 'low',
}
/** Texto corto para los botones de categoría. */
const CATEGORY_CHIPS: Record<ReportCategory, string> = {
  fire: 'Incendio o quema', waste: 'Residuos', water: 'Agua', deforestation: 'Desmonte', other: 'Otro problema ambiental',
}
const CATEGORY_ORDER: ReportCategory[] = ['fire', 'waste', 'water', 'deforestation', 'other']
const STATUS_LABELS: Record<ReportStatus, string> = { new: 'Nuevo', reviewing: 'En revisión', in_progress: 'En curso', resolved: 'Resuelto' }
const PRIORITY_LABELS: Record<Priority, string> = { low: 'Baja', medium: 'Media', high: 'Alta', critical: 'Crítica' }

type LocationState = { kind: 'idle' } | { kind: 'locating' } | { kind: 'error'; message: string }
interface Photo { dataUrl: string; name: string }

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="field-error">{message}</p> : null
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' }).format(date)
}

export default function CitizenReportModule() {
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [photo, setPhoto] = useState<Photo | undefined>()
  const [photoError, setPhotoError] = useState<string | undefined>()
  const [processingPhoto, setProcessingPhoto] = useState(false)
  const [locationState, setLocationState] = useState<LocationState>({ kind: 'idle' })
  const [submitError, setSubmitError] = useState<string | undefined>()
  const [lastCreated, setLastCreated] = useState<EnvironmentalReport | undefined>()
  const [reports, setReports] = useState<EnvironmentalReport[]>(() => getReports())

  function update<K extends keyof ReportDraft>(field: K, value: ReportDraft[K]) {
    setDraft(current => ({ ...current, [field]: value }))
    setLastCreated(undefined)
  }

  function setPoint(lat: number, lng: number) {
    setDraft(current => ({ ...current, lat: lat.toFixed(5), lng: lng.toFixed(5) }))
    setErrors(current => ({ ...current, location: undefined }))
    setLastCreated(undefined)
  }

  function requestCurrentLocation() {
    if (!('geolocation' in navigator)) {
      setLocationState({ kind: 'error', message: 'Tu navegador no permite obtener la ubicación. Marcá el punto en el mapa o cargá las coordenadas.' })
      return
    }
    setLocationState({ kind: 'locating' })
    navigator.geolocation.getCurrentPosition(
      position => {
        setPoint(position.coords.latitude, position.coords.longitude)
        setLocationState({ kind: 'idle' })
      },
      () => setLocationState({ kind: 'error', message: 'No pudimos obtener tu ubicación. Revisá el permiso, o marcá el punto en el mapa.' }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    )
  }

  async function handlePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setPhotoError(undefined)
    if (!file) return
    setProcessingPhoto(true)
    try {
      setPhoto({ dataUrl: await compressPhoto(file), name: file.name })
    } catch (error) {
      setPhoto(undefined)
      setPhotoError(error instanceof PhotoError ? error.message : 'No se pudo procesar la foto.')
    } finally {
      setProcessingPhoto(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(undefined)
    const validation = validateDraft(draft)
    setErrors(validation)
    if (Object.keys(validation).length > 0 || draft.category === '') {
      const firstInvalid = (['title', 'category', 'description', 'location'] as const).find(key => validation[key])
      const target = firstInvalid === 'category' ? 'citizen-report-category-fire' : firstInvalid === 'location' ? 'citizen-report-lat' : `citizen-report-${firstInvalid}`
      document.getElementById(target)?.focus()
      return
    }

    const { lat, lng } = draftCoordinates(draft)
    const label = draft.label.trim()
    try {
      const report = createReport({
        title: draft.title.trim(),
        description: draft.description.trim(),
        category: draft.category,
        location: label ? { lat, lng, label } : { lat, lng },
        priority: INITIAL_PRIORITY[draft.category],
        status: 'new',
        ...(photo ? { photoDataUrl: photo.dataUrl } : {}),
      })
      setLastCreated(report)
      setReports(getReports())
      setDraft(emptyDraft)
      setPhoto(undefined)
      setErrors({})
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmitError(isQuotaError(error)
        ? 'No hay espacio en este navegador para guardar el reporte. Quitá la foto e intentá de nuevo.'
        : 'No se pudo guardar el reporte. Intentá de nuevo.')
    }
  }

  const previewLat = parseCoordinate(draft.lat)
  const previewLng = parseCoordinate(draft.lng)
  const previewPoint = previewLat !== undefined && previewLng !== undefined && isInsideJujuy(previewLat, previewLng)
    ? { lat: previewLat, lng: previewLng }
    : undefined
  const descriptionLength = draft.description.trim().length
  const recent = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5)

  return (
    <section className="mx-auto max-w-2xl space-y-6" aria-labelledby="citizen-title">
      {lastCreated && (
        <div role="status" className="flex items-start gap-3 rounded-2xl bg-emerald-700 p-4 text-white shadow-raised">
          <CheckCircleIcon className="mt-0.5 h-6 w-6 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Reporte guardado</p>
            <p className="mt-0.5 text-sm text-emerald-50">«{lastCreated.title}» quedó registrado como Nuevo, pendiente de revisión.</p>
          </div>
          <button type="button" onClick={() => setLastCreated(undefined)} className="-m-2 rounded-lg p-2.5 hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-white" aria-label="Cerrar aviso">
            <CloseIcon />
          </button>
        </div>
      )}

      <header>
        <p className="eyebrow">Participación ciudadana</p>
        <h2 id="citizen-title" className="page-title mt-1">Reportar un problema ambiental</h2>
        <p className="page-lead mt-2">Contanos qué viste y dónde. El reporte queda registrado como «Nuevo» para que el equipo de gestión lo revise. En este prototipo se guarda en tu navegador.</p>
      </header>

      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <div className="card">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="citizen-report-title" className="field-label">Título del reporte *</label>
            <span className="field-hint">Resumí el problema</span>
          </div>
          <input id="citizen-report-title" className="field-input" value={draft.title} maxLength={TITLE_MAX}
            onChange={e => update('title', e.target.value)} aria-invalid={!!errors.title} aria-describedby="citizen-report-title-error"
            placeholder="Ej.: Basural junto al río Grande" />
          <FieldError id="citizen-report-title-error" message={errors.title} />
        </div>

        <fieldset className="card" aria-describedby="citizen-report-category-error">
          <legend className="sr-only">Categoría</legend>
          <div className="flex items-baseline justify-between gap-3" aria-hidden="true">
            <span className="field-label">Categoría *</span>
            <span className="field-hint">Elegí una</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {CATEGORY_ORDER.map(category => {
              const Icon = CATEGORY_ICONS[category]
              const checked = draft.category === category
              return (
                <label key={category}
                  className={`flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-600 has-[:focus-visible]:ring-offset-2 ${category === 'other' ? 'col-span-2 justify-center' : ''} ${checked ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <input id={`citizen-report-category-${category}`} type="radio" name="citizen-report-category" value={category}
                    checked={checked} onChange={() => update('category', category)} className="sr-only" />
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${checked ? 'bg-emerald-700 text-white' : 'bg-terracotta-50 text-terracotta-700'}`}>
                    <Icon />
                  </span>
                  <span>{CATEGORY_CHIPS[category]}</span>
                </label>
              )
            })}
          </div>
          <FieldError id="citizen-report-category-error" message={errors.category} />
        </fieldset>

        <div className="card">
          <label htmlFor="citizen-report-description" className="field-label">Descripción del problema *</label>
          <textarea id="citizen-report-description" rows={4} className="field-input" value={draft.description} maxLength={DESCRIPTION_MAX}
            onChange={e => update('description', e.target.value)} aria-invalid={!!errors.description} aria-describedby="citizen-report-description-error citizen-report-description-count"
            placeholder="Qué observaste, desde cuándo, qué tan extendido está…" />
          <div className="mt-1.5 flex items-start justify-between gap-3">
            <FieldError id="citizen-report-description-error" message={errors.description} />
            <span id="citizen-report-description-count" className="field-hint ml-auto shrink-0 tabular-nums">{descriptionLength}/{DESCRIPTION_MAX}</span>
          </div>
        </div>

        <fieldset className="card" aria-describedby="citizen-report-location-error">
          <legend className="sr-only">Ubicación</legend>
          <p className="field-label" aria-hidden="true">Ubicación del problema *</p>
          <button type="button" onClick={requestCurrentLocation} disabled={locationState.kind === 'locating'}
            className="mt-3 flex min-h-[52px] w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-left text-emerald-900 transition-colors hover:bg-emerald-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-70">
            <LocateIcon className="h-5 w-5 shrink-0 text-emerald-700" />
            <span>
              <span className="block text-sm font-semibold">{locationState.kind === 'locating' ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}</span>
              <span className="block text-xs text-emerald-800">Tu navegador te va a pedir permiso</span>
            </span>
          </button>
          {locationState.kind === 'error' && <p className="mt-2 text-sm text-amber-800">{locationState.message}</p>}

          <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200">
            <LocationPreview point={previewPoint} onPick={setPoint} />
          </div>
          <p className="field-hint mt-1.5">
            {previewPoint ? 'Punto marcado. Tocá otro lugar del mapa para corregirlo.' : 'También podés tocar el mapa para marcar el lugar.'}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="citizen-report-lat" className="field-hint font-semibold">Latitud</label>
              <input id="citizen-report-lat" inputMode="decimal" className="field-input tabular-nums" value={draft.lat}
                onChange={e => update('lat', e.target.value)} aria-invalid={!!errors.location} placeholder="-24.19100" />
            </div>
            <div>
              <label htmlFor="citizen-report-lng" className="field-hint font-semibold">Longitud</label>
              <input id="citizen-report-lng" inputMode="decimal" className="field-input tabular-nums" value={draft.lng}
                onChange={e => update('lng', e.target.value)} aria-invalid={!!errors.location} placeholder="-65.29700" />
            </div>
          </div>
          <div className="mt-3">
            <label htmlFor="citizen-report-label" className="field-hint font-semibold">Referencia del lugar (opcional)</label>
            <input id="citizen-report-label" className="field-input" value={draft.label} maxLength={80}
              onChange={e => update('label', e.target.value)} placeholder="Ej.: 200 m al norte del puente, Tilcara" />
            <FieldError id="citizen-report-label-error" message={errors.label} />
          </div>
          {errors.location && (
            <p id="citizen-report-location-error" role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
              {errors.location}
            </p>
          )}
        </fieldset>

        <div className="card">
          <div className="flex items-baseline justify-between gap-3">
            <p className="field-label">Foto <span className="font-normal text-slate-500">(opcional)</span></p>
            {photo && <span className="field-hint">1 foto adjunta</span>}
          </div>
          {photo && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-sand p-3">
              <img src={photo.dataUrl} alt="Vista previa de la foto adjunta" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{photo.name}</p>
                <p className="text-xs text-slate-600"><span className="tabular-nums">≈ {approximateKilobytes(photo.dataUrl)} KB</span> · reducida para ocupar poco espacio</p>
              </div>
              <button type="button" onClick={() => setPhoto(undefined)} className="btn-ghost shrink-0 text-rose-700 hover:bg-rose-50">Quitar</button>
            </div>
          )}
          <label htmlFor="citizen-report-photo"
            className="mt-3 flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-emerald-600">
            <CameraIcon className="h-5 w-5 text-slate-500" />
            {processingPhoto ? 'Procesando foto…' : photo ? 'Cambiar foto' : 'Tomar o subir una foto'}
            <input id="citizen-report-photo" type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="sr-only" disabled={processingPhoto} />
          </label>
          <FieldError id="citizen-report-photo-error" message={photoError} />
        </div>

        {submitError && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">{submitError}</p>}

        <button type="submit" disabled={processingPhoto} className="btn-primary min-h-[52px] w-full text-base">
          <SendIcon /> Enviar reporte
        </button>
        <p className="text-center text-xs text-slate-500">Los campos con * son obligatorios.</p>
      </form>

      <section aria-labelledby="citizen-recent-title" className="pt-2">
        <p className="eyebrow">Historial</p>
        <h3 id="citizen-recent-title" className="section-title mt-1">Últimos reportes</h3>
        {recent.length === 0
          ? <p className="card mt-3 text-sm text-slate-600">Todavía no hay reportes.</p>
          : (
            <ul className="mt-3 space-y-3">
              {recent.map(report => (
                <li key={report.id} className="card flex gap-3 p-4">
                  {report.photoDataUrl && <img src={report.photoDataUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold leading-5">{report.title}</p>
                      <span className="shrink-0 text-xs text-slate-500 tabular-nums">{formatWhen(report.createdAt)}</span>
                    </div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-600">
                      <PinIcon className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="truncate">{report.location.label ?? `${report.location.lat.toFixed(3)}, ${report.location.lng.toFixed(3)}`} · {CATEGORY_LABELS[report.category]}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`pill status-${report.status}`}>{STATUS_LABELS[report.status]}</span>
                      <span className={`pill priority-${report.priority}`}>Prioridad {PRIORITY_LABELS[report.priority].toLowerCase()}</span>
                      {report.id.startsWith('demo-') && <span className="pill tag-demo">Ejemplo</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </section>
    </section>
  )
}
