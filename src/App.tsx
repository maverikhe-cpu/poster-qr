import { useEffect, useState, useRef } from 'react'
import './App.css'
import { HeaderBar } from './components/HeaderBar'
import { UploadCard } from './components/UploadCard'
import { CanvasStage } from './components/CanvasStage'
import type { SquareSelection } from './canvas/selectionTypes'
import type { CanvasStageHandle } from './components/CanvasStage'

type UploadState = {
  loading: boolean
  error: string | null
  previewUrl: string | null
  file: File | null
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg']

function App() {
  const [poster, setPoster] = useState<UploadState>({
    loading: false,
    error: null,
    previewUrl: null,
    file: null,
  })
  const [qr, setQr] = useState<UploadState>({
    loading: false,
    error: null,
    previewUrl: null,
    file: null,
  })
  const [selection, setSelection] = useState<SquareSelection | null>(null)
  const [zoom, setZoom] = useState(1)
  const canvasHandleRef = useRef<CanvasStageHandle | null>(null)

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return '仅支持 JPG / PNG 格式'
    }
    if (file.size > MAX_FILE_SIZE) {
      return '文件大小不能超过 10MB'
    }
    return null
  }

  const applyFile = (target: 'poster' | 'qr', file: File) => {
    const error = validateFile(file)
    const updater = target === 'poster' ? setPoster : setQr
    const prevState = target === 'poster' ? poster : qr

    if (error) {
      updater({
        ...prevState,
        loading: false,
        error,
      })
      return
    }

    const previewUrl = URL.createObjectURL(file)
    if (prevState.previewUrl) {
      URL.revokeObjectURL(prevState.previewUrl)
    }

    updater({
      loading: false,
      error: null,
      previewUrl,
      file,
    })
  }

  const handlePosterFile = (file: File) => {
    setPoster((prev) => ({ ...prev, loading: true, error: null }))
    applyFile('poster', file)
  }

  const handleQrFile = (file: File) => {
    setQr((prev) => ({ ...prev, loading: true, error: null }))
    applyFile('qr', file)
  }

  // 全局拖拽上传：优先填充海报，其次二维码
  useEffect(() => {
    const handleDragOver = (event: DragEvent) => {
      event.preventDefault()
    }

    const handleDrop = (event: DragEvent) => {
      event.preventDefault()
      const file = event.dataTransfer?.files?.[0]
      if (!file) return
      if (!poster.file) {
        handlePosterFile(file)
      } else {
        handleQrFile(file)
      }
    }

    window.addEventListener('dragover', handleDragOver)
    window.addEventListener('drop', handleDrop)
    return () => {
      window.removeEventListener('dragover', handleDragOver)
      window.removeEventListener('drop', handleDrop)
    }
  }, [poster.file])

  const handleClear = () => {
    if (poster.previewUrl) URL.revokeObjectURL(poster.previewUrl)
    if (qr.previewUrl) URL.revokeObjectURL(qr.previewUrl)
    setPoster({ loading: false, error: null, previewUrl: null, file: null })
    setQr({ loading: false, error: null, previewUrl: null, file: null })
    setSelection(null)
    setZoom(1)
    canvasHandleRef.current?.clear()
  }

  const canDownload = !!poster.file && !!qr.file && !!selection

  return (
    <div className="app-root">
      <HeaderBar onClear={handleClear} />
      <main className="app-main">
        <aside className="sidebar">
          <div className="sidebar-section">
            <h2 className="sidebar-title">海报名片</h2>
            <UploadCard
              kind="poster"
              loading={poster.loading}
              error={poster.error}
              previewUrl={poster.previewUrl}
              onFileSelected={handlePosterFile}
            />
          </div>
          <div className="sidebar-section">
            <h2 className="sidebar-title">二维码</h2>
            <UploadCard
              kind="qr"
              loading={qr.loading}
              error={qr.error}
              previewUrl={qr.previewUrl}
              onFileSelected={handleQrFile}
            />
          </div>
          <div className="sidebar-section">
            <h2 className="sidebar-title">操作</h2>
            <button
              type="button"
              className="primary-btn"
              disabled={!canDownload}
              onClick={async () => {
                const handle = canvasHandleRef.current
                if (!handle) return
                const blob = await handle.exportPng()
                if (!blob) return
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                const ts = new Date().toISOString().replace(/[-:]/g, '').split('.')[0]
                a.href = url
                a.download = `海报_二维码_${ts}.png`
                document.body.appendChild(a)
                a.click()
                a.remove()
                URL.revokeObjectURL(url)
                // eslint-disable-next-line no-alert
                alert('✅ 下载成功')
              }}
            >
              下载图片
            </button>
          </div>
        </aside>
        <section className="canvas-layout">
          <div className="canvas-toolbar">
            <span className="canvas-zoom-label">缩放：</span>
            <button
              type="button"
              className="canvas-zoom-btn"
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
            >
              -
            </button>
            <span className="canvas-zoom-value">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              className="canvas-zoom-btn"
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
            >
              +
            </button>
          </div>
          <section className="canvas-section">
            <CanvasStage
              ref={canvasHandleRef}
              posterFile={poster.file}
              qrFile={qr.file}
              zoom={zoom}
              onSelectionChange={(sel) => {
                setSelection(sel)
              }}
            />
          </section>
        </section>
      </main>
    </div>
  )
}

export default App

