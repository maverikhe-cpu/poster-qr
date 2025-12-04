import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import './CanvasStage.css'
import type { FittedImageInfo } from '../canvas/imageUtils'
import { fitImageIntoCanvas, loadImageFromFile } from '../canvas/imageUtils'
import type { SquareSelection } from '../canvas/selectionTypes'

export interface CanvasStageProps {
  width?: number
  height?: number
  posterFile?: File | null
  qrFile?: File | null
  zoom?: number
  onSelectionChange?: (selection: SquareSelection | null) => void
}

export interface CanvasStageHandle {
  exportPng: () => Promise<Blob | null>
  clear: () => void
}

export const CanvasStage = forwardRef<CanvasStageHandle, CanvasStageProps>(function CanvasStage(
  { width = 960, height = 640, posterFile, qrFile, zoom = 1, onSelectionChange }: CanvasStageProps,
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const [posterInfo, setPosterInfo] = useState<FittedImageInfo | null>(null)
  const [selection, setSelection] = useState<SquareSelection | null>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const qrImageRef = useRef<HTMLImageElement | null>(null)
  const [qrRect, setQrRect] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null,
  )
  const [isDraggingQr, setIsDraggingQr] = useState(false)
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const offscreen = offscreenRef.current ?? document.createElement('canvas')
    offscreen.width = canvas.width
    offscreen.height = canvas.height
    offscreenRef.current = offscreen

    const ctx = canvas.getContext('2d')
    const offscreenCtx = offscreen.getContext('2d')
    if (!ctx || !offscreenCtx) return

    // 背景提示
    offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height)
    offscreenCtx.fillStyle = '#f3f4f6'
    offscreenCtx.fillRect(0, 0, offscreen.width, offscreen.height)
    offscreenCtx.fillStyle = '#9ca3af'
    offscreenCtx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    offscreenCtx.textAlign = 'center'
    offscreenCtx.fillText(
      '海报图片会显示在这里，可以在上面画正方形框',
      offscreen.width / 2,
      offscreen.height / 2,
    )

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(offscreen, 0, 0)
  }, [width, height])

  const redraw = () => {
    const canvas = canvasRef.current
    const offscreen = offscreenRef.current
    if (!canvas || !offscreen) return
    const ctx = canvas.getContext('2d')
    const offscreenCtx = offscreen.getContext('2d')
    if (!ctx || !offscreenCtx) return

    // 先绘制离屏中的海报背景
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(offscreen, 0, 0)

    // 再绘制二维码（如果有）
    if (qrRect && qrImageRef.current) {
      // 为了保持二维码边缘清晰，关闭平滑插值
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(
        qrImageRef.current,
        qrRect.x,
        qrRect.y,
        qrRect.width,
        qrRect.height,
      )
    }

    // 画当前选择框（始终显示，方便重新画和拖拽时参考）
    if (selection) {
      ctx.save()
      ctx.setLineDash([6, 4])
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 1
      ctx.strokeRect(selection.x, selection.y, selection.size, selection.size)
      ctx.restore()

      ctx.fillStyle = 'rgba(239,68,68,0.9)'
      ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      ctx.textAlign = 'left'
      const label = `${Math.round(selection.size)}px`
      const textX = selection.x
      const textY = Math.max(12, selection.y - 4)
      ctx.fillText(label, textX + 4, textY)
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      exportPng: () =>
        new Promise<Blob | null>((resolve) => {
          const displayCanvas = canvasRef.current
          if (!displayCanvas || !posterInfo) {
            resolve(null)
            return
          }

          const exportCanvas = document.createElement('canvas')
          exportCanvas.width = posterInfo.image.width
          exportCanvas.height = posterInfo.image.height
          const exportCtx = exportCanvas.getContext('2d')
          if (!exportCtx) {
            resolve(null)
            return
          }

          // 先画原始海报
          exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height)
          exportCtx.drawImage(posterInfo.image, 0, 0, posterInfo.image.width, posterInfo.image.height)

          // 再把二维码映射到原始坐标
          if (qrRect && qrImageRef.current) {
            const { offsetX, offsetY, scale } = posterInfo
            const xPoster = (qrRect.x - offsetX) / scale
            const yPoster = (qrRect.y - offsetY) / scale
            const wPoster = qrRect.width / scale
            const hPoster = qrRect.height / scale
            exportCtx.imageSmoothingEnabled = false
            exportCtx.drawImage(qrImageRef.current, xPoster, yPoster, wPoster, hPoster)
          }

          exportCanvas.toBlob((blob) => {
            resolve(blob ?? null)
          }, 'image/png')
        }),
      clear: () => {
        const canvas = canvasRef.current
        const offscreen = offscreenRef.current
        if (!canvas || !offscreen) return
        const ctx = canvas.getContext('2d')
        const offscreenCtx = offscreen.getContext('2d')
        if (!ctx || !offscreenCtx) return

        offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height)
        offscreenCtx.fillStyle = '#f3f4f6'
        offscreenCtx.fillRect(0, 0, offscreen.width, offscreen.height)
        offscreenCtx.fillStyle = '#9ca3af'
        offscreenCtx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
        offscreenCtx.textAlign = 'center'
        offscreenCtx.fillText(
          '海报图片会显示在这里，可以在上面画正方形框',
          offscreen.width / 2,
          offscreen.height / 2,
        )

        setPosterInfo(null)
        setSelection(null)
        setQrRect(null)

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(offscreen, 0, 0)
      },
    }),
    [posterInfo, qrRect],
  )

  // 加载二维码图片
  useEffect(() => {
    if (!qrFile) {
      qrImageRef.current = null
      setQrRect(null)
      redraw()
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const img = await loadImageFromFile(qrFile)
        if (cancelled) return
        qrImageRef.current = img
        // 如果已经有框，自动贴一次
        if (selection) {
          const longest = Math.max(img.width, img.height)
          const scale = selection.size / longest
          const width = img.width * scale
          const height = img.height * scale
          const x = selection.x + (selection.size - width) / 2
          const y = selection.y + (selection.size - height) / 2
          setQrRect({ x, y, width, height })
        }
        redraw()
      } catch {
        // 由上传区域处理错误提示
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrFile, selection])

  // 监听海报文件变化，加载并绘制到画布
  useEffect(() => {
    const canvas = canvasRef.current
    const offscreen = offscreenRef.current
    if (!canvas || !offscreen) return
    const ctx = canvas.getContext('2d')
    const offscreenCtx = offscreen.getContext('2d')
    if (!ctx || !offscreenCtx) return

    if (!posterFile) {
      // 清空为默认背景
      offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height)
      offscreenCtx.fillStyle = '#f3f4f6'
      offscreenCtx.fillRect(0, 0, offscreen.width, offscreen.height)
      offscreenCtx.fillStyle = '#9ca3af'
      offscreenCtx.font = '14px system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
      offscreenCtx.textAlign = 'center'
      offscreenCtx.fillText(
        '海报图片会显示在这里，可以在上面画正方形框',
        offscreen.width / 2,
        offscreen.height / 2,
      )
      setPosterInfo(null)
      setSelection(null)
      setQrRect(null)
      redraw()
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const img = await loadImageFromFile(posterFile)
        if (cancelled) return

        // 根据当前画布尺寸等比缩放海报用于预览
        const info: FittedImageInfo = fitImageIntoCanvas(img, canvas.width, canvas.height)
        setPosterInfo(info)

        offscreenCtx.clearRect(0, 0, offscreen.width, offscreen.height)
        offscreenCtx.drawImage(info.image, info.offsetX, info.offsetY, info.drawWidth, info.drawHeight)

        setSelection(null)
        setQrRect(null)
        redraw()
      } catch {
        // ignore, 上层有上传错误提示
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posterFile])

  // 鼠标绘制正方形框
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      return {
        x: (ev.clientX - rect.left) * scaleX,
        y: (ev.clientY - rect.top) * scaleY,
      }
    }

    const handleDown = (ev: MouseEvent) => {
      if (!posterInfo) return
      const { x, y } = getPos(ev)

      // 若点在二维码区域内，则开始拖动二维码
      if (qrRect && x >= qrRect.x && x <= qrRect.x + qrRect.width && y >= qrRect.y && y <= qrRect.y + qrRect.height) {
        setIsDraggingQr(true)
        dragOffsetRef.current = { dx: x - qrRect.x, dy: y - qrRect.y }
        return
      }

      startPointRef.current = { x, y }
      setIsDrawing(true)
    }

    const handleMove = (ev: MouseEvent) => {
      if (isDraggingQr && qrRect && selection) {
        const { x, y } = getPos(ev)
        const offset = dragOffsetRef.current ?? { dx: 0, dy: 0 }
        let nextX = x - offset.dx
        let nextY = y - offset.dy

        // 限制在框内
        nextX = Math.max(selection.x, Math.min(nextX, selection.x + selection.size - qrRect.width))
        nextY = Math.max(selection.y, Math.min(nextY, selection.y + selection.size - qrRect.height))

        setQrRect({ ...qrRect, x: nextX, y: nextY })
        redraw()
        return
      }

      if (!isDrawing || !startPointRef.current) return
      const { x, y } = getPos(ev)
      const start = startPointRef.current
      const dx = x - start.x
      const dy = y - start.y
      const size = Math.min(Math.abs(dx), Math.abs(dy))
      if (size <= 0) return

      let normX = dx >= 0 ? start.x : start.x - size
      let normY = dy >= 0 ? start.y : start.y - size

      // 限制选框在海报绘制区域内
      if (posterInfo) {
        const minX = posterInfo.offsetX
        const minY = posterInfo.offsetY
        const maxX = posterInfo.offsetX + posterInfo.drawWidth
        const maxY = posterInfo.offsetY + posterInfo.drawHeight
        const maxSizeX = maxX - minX
        const maxSizeY = maxY - minY
        const maxSize = Math.min(maxSizeX, maxSizeY)
        const clampedSize = Math.min(size, maxSize)
        const maxLeft = maxX - clampedSize
        const maxTop = maxY - clampedSize
        normX = Math.max(minX, Math.min(normX, maxLeft))
        normY = Math.max(minY, Math.min(normY, maxTop))

        const sq: SquareSelection = {
          x: normX,
          y: normY,
          size: clampedSize,
        }
        setSelection(sq)
        if (onSelectionChange) onSelectionChange(sq)
        redraw()
        return
      }

      const sq: SquareSelection = {
        x: normX,
        y: normY,
        size,
      }
      setSelection(sq)
      if (onSelectionChange) onSelectionChange(sq)
      redraw()
    }

    const handleUp = () => {
      if (isDraggingQr) {
        setIsDraggingQr(false)
        dragOffsetRef.current = null
        return
      }
      if (!isDrawing) return
      setIsDrawing(false)
      startPointRef.current = null

      // 鼠标抬起时，如果有二维码文件且已有 selection，则自动贴二维码
      if (selection && qrImageRef.current) {
        const img = qrImageRef.current
        const longest = Math.max(img.width, img.height)
        const scale = selection.size / longest
        const width = img.width * scale
        const height = img.height * scale
        const x = selection.x + (selection.size - width) / 2
        const y = selection.y + (selection.size - height) / 2
        setQrRect({ x, y, width, height })
        redraw()
      } else if (selection && !qrFile) {
        // 未上传二维码时提示
        // eslint-disable-next-line no-alert
        alert('请上传二维码')
      }
    }

    canvas.addEventListener('mousedown', handleDown)
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)

    return () => {
      canvas.removeEventListener('mousedown', handleDown)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posterInfo, isDrawing, onSelectionChange])

  return (
    <div className="canvas-wrapper" style={{ transform: `scale(${zoom})` }}>
      <canvas ref={canvasRef} width={width} height={height} />
    </div>
  )
})

