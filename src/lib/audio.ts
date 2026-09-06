/** Notas de voz: grabación con MediaRecorder y guardado en IndexedDB. */

export interface Recording {
  dataUrl: string
  seconds: number
}

export class VoiceRecorder {
  private rec?: MediaRecorder
  private chunks: BlobPart[] = []
  private stream?: MediaStream
  private startedAt = 0

  get recording(): boolean {
    return this.rec?.state === 'recording'
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
    const mimeType = types.find((t) => MediaRecorder.isTypeSupported?.(t))
    this.rec = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
    this.chunks = []
    this.rec.ondataavailable = (e) => e.data.size && this.chunks.push(e.data)
    this.rec.start()
    this.startedAt = Date.now()
  }

  stop(): Promise<Recording> {
    return new Promise((resolve, reject) => {
      const rec = this.rec
      if (!rec) return reject(new Error('No se estaba grabando'))
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' })
        const seconds = Math.max(1, Math.round((Date.now() - this.startedAt) / 1000))
        this.cleanup()
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('No se pudo guardar el audio'))
        reader.onload = () => resolve({ dataUrl: String(reader.result), seconds })
        reader.readAsDataURL(blob)
      }
      rec.stop()
    })
  }

  cancel(): void {
    try {
      this.rec?.stop()
    } catch {
      /* nada */
    }
    this.cleanup()
  }

  private cleanup() {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = undefined
    this.rec = undefined
  }
}

export function micErrorMessage(e: unknown): string {
  const name = (e as DOMException)?.name
  if (name === 'NotAllowedError') return 'No has dado permiso para el micrófono'
  if (name === 'NotFoundError') return 'No se ha encontrado ningún micrófono'
  return 'No se ha podido grabar el audio'
}

export const fmtDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`
