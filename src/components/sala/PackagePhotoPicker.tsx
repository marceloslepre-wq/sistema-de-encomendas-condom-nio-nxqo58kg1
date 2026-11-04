import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Camera,
  FolderOpen,
  RefreshCw,
  Check,
  X,
  Loader2,
  ImageIcon,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type PickerMode = 'choose' | 'camera'

interface PackagePhotoPickerProps {
  photo: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
}

/**
 * Seletor de "Foto do Pacote" do modal Processar Volume (Triagem).
 * Oferece duas opções: capturar com a câmera (getUserMedia) ou escolher
 * um arquivo do computador/celular (input file, accept image/*).
 * O resultado é sempre um File, enviado exatamente como antes.
 */
export function PackagePhotoPicker({ photo, onChange, disabled }: PackagePhotoPickerProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<PickerMode>('choose')
  const [startingCamera, setStartingCamera] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [flash, setFlash] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)

  // Preview da foto já anexada (revoga o blob quando troca)
  useEffect(() => {
    if (!photo) {
      setPhotoUrl(null)
      return
    }
    const url = URL.createObjectURL(photo)
    setPhotoUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const capturedFileRef = useRef<File | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startCamera = useCallback(async () => {
    setCameraError(null)
    setCapturedUrl(null)
    capturedFileRef.current = null

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraError(
        'Este navegador/dispositivo não permite acesso à câmera (verifique se o site está em HTTPS). Use a opção "Escolher arquivo do computador".',
      )
      return
    }

    setStartingCamera(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
    } catch (err: any) {
      const name = err?.name || ''
      setCameraError(
        name === 'NotAllowedError'
          ? 'A permissão de acesso à câmera foi negada. Libere a câmera nas permissões do navegador ou escolha um arquivo do computador.'
          : name === 'NotFoundError' || name === 'OverconstrainedError'
            ? 'Nenhuma câmera foi encontrada neste dispositivo. Use a opção "Escolher arquivo do computador".'
            : 'Não foi possível acessar a câmera. Verifique a permissão do navegador ou escolha um arquivo do computador.',
      )
    } finally {
      setStartingCamera(false)
    }
  }, [])

  // Anexa o stream ao <video> quando ele monta (modo câmera)
  useEffect(() => {
    if (mode === 'camera' && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [mode])

  // Encerra a câmera ao fechar o modal/desmontar
  useEffect(() => {
    if (!open) {
      stopCamera()
      setMode('choose')
      setCameraError(null)
      setStartingCamera(false)
      setCapturedUrl(null)
      capturedFileRef.current = null
      setFlash(false)
    }
  }, [open, stopCamera])

  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  // Quando o pai reseta a foto (nova triagem), limpa o input interno
  useEffect(() => {
    if (!photo && fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [photo])

  const handleCapture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    setFlash(true)
    window.setTimeout(() => setFlash(false), 220)

    canvas.toBlob(
      (blob) => {
        // Encerra as tracks da câmera após capturar
        stopCamera()
        if (!blob) {
          setCameraError('Não foi possível capturar a foto. Tente novamente ou escolha um arquivo.')
          return
        }
        const file = new File([blob], `foto-pacote-${Date.now()}.jpg`, { type: 'image/jpeg' })
        capturedFileRef.current = file
        setCapturedUrl(URL.createObjectURL(blob))
      },
      'image/jpeg',
      0.9,
    )
  }

  const handleRetake = () => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedUrl(null)
    capturedFileRef.current = null
    startCamera()
  }

  const handleConfirmCapture = () => {
    if (capturedFileRef.current) {
      onChange(capturedFileRef.current)
      if (capturedUrl) URL.revokeObjectURL(capturedUrl)
      setCapturedUrl(null)
      capturedFileRef.current = null
      setOpen(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onChange(file)
      setOpen(false)
    }
  }

  const handleOpenPicker = () => {
    setMode('choose')
    setCameraError(null)
    setOpen(true)
  }

  const handleRemovePhoto = () => {
    onChange(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-2">
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      {photo ? (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2">
          <img
            src={photoUrl || undefined}
            alt="Foto do pacote"
            className="h-14 w-14 rounded-md object-cover border"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{photo.name}</p>
            <p className="text-xs text-muted-foreground">{(photo.size / 1024).toFixed(0)} KB</p>
          </div>
          <div className="flex flex-col gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleOpenPicker}
              disabled={disabled}
            >
              <ImageIcon className="h-4 w-4 mr-1" /> Trocar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleRemovePhoto}
              disabled={disabled}
            >
              <X className="h-4 w-4 mr-1" /> Remover
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full h-10 justify-start text-muted-foreground font-normal"
          onClick={handleOpenPicker}
          disabled={disabled}
        >
          <Camera className="h-4 w-4 mr-2" />
          Tirar foto ou escolher arquivo
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" /> Foto do Pacote
            </DialogTitle>
            <DialogDescription>
              {mode === 'choose'
                ? 'Como você quer adicionar a foto do pacote?'
                : 'Centralize o pacote e toque em capturar.'}
            </DialogDescription>
          </DialogHeader>

          {mode === 'choose' && (
            <div className="grid gap-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setMode('camera')
                  startCamera()
                }}
                className="flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-5 w-5 text-primary" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">Tirar foto com a câmera</span>
                  <span className="block text-xs text-muted-foreground">
                    Usar a câmera do dispositivo agora
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-4 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">
                    Escolher arquivo do computador
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Selecionar uma imagem de uma pasta
                  </span>
                </span>
              </button>
            </div>
          )}

          {mode === 'camera' && (
            <div className="space-y-3 py-2">
              <div className="relative overflow-hidden rounded-lg border bg-black aspect-video">
                {capturedUrl ? (
                  <img
                    src={capturedUrl}
                    alt="Foto capturada"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn('h-full w-full object-cover', cameraError && 'hidden')}
                  />
                )}

                {startingCamera && !capturedUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <p className="text-sm">Abrindo a câmera...</p>
                  </div>
                )}

                {flash && (
                  <div className="absolute inset-0 bg-white animate-out fade-out duration-200 pointer-events-none" />
                )}
              </div>

              {cameraError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              <div className="flex gap-2">
                {capturedUrl ? (
                  <>
                    <Button variant="outline" className="flex-1" onClick={handleRetake}>
                      <RefreshCw className="h-4 w-4 mr-2" /> Repetir
                    </Button>
                    <Button className="flex-1" onClick={handleConfirmCapture}>
                      <Check className="h-4 w-4 mr-2" /> Confirmar
                    </Button>
                  </>
                ) : cameraError ? (
                  <>
                    <Button variant="outline" className="flex-1" onClick={() => setMode('choose')}>
                      <X className="h-4 w-4 mr-2" /> Voltar
                    </Button>
                    <Button className="flex-1" onClick={() => fileInputRef.current?.click()}>
                      <FolderOpen className="h-4 w-4 mr-2" /> Escolher arquivo
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        stopCamera()
                        setMode('choose')
                      }}
                    >
                      <X className="h-4 w-4 mr-2" /> Cancelar
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleCapture}
                      disabled={startingCamera || !!cameraError}
                    >
                      <Camera className="h-4 w-4 mr-2" /> Capturar
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
