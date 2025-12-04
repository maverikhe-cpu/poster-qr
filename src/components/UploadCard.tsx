import type React from 'react'
import './UploadCard.css'

export type UploadKind = 'poster' | 'qr'

export interface UploadCardProps {
  kind: UploadKind
  loading: boolean
  error: string | null
  previewUrl: string | null
  onFileSelected: (file: File) => void
}

export function UploadCard({
  kind,
  loading,
  error,
  previewUrl,
  onFileSelected,
}: UploadCardProps) {
  const label = kind === 'poster' ? '+ 海报名片' : '+ 二维码'

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <div className="upload-card">
      <label className="upload-inner">
        <div className="upload-title">{label}</div>
        <div className="upload-subtitle">点击或拖拽</div>
        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleChange}
          style={{ display: 'none' }}
        />
        {loading && <div className="upload-status">上传中...</div>}
        {previewUrl && !loading && (
          <div className="upload-preview">
            <img src={previewUrl} alt={label} />
          </div>
        )}
        {error && <div className="upload-error">{error}</div>}
      </label>
    </div>
  )
}

