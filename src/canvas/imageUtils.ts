export interface FittedImageInfo {
  image: HTMLImageElement
  drawWidth: number
  drawHeight: number
  offsetX: number
  offsetY: number
  scale: number
}

// 加载 File 为 HTMLImageElement
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })
}

// 将图片按画布尺寸等比缩放展示（不改变原图分辨率，只用于预览坐标换算）
export function fitImageIntoCanvas(
  img: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
): FittedImageInfo {
  const width = img.width
  const height = img.height

  const scale = Math.min(canvasWidth / width, canvasHeight / height)
  const drawWidth = width * scale
  const drawHeight = height * scale
  const offsetX = (canvasWidth - drawWidth) / 2
  const offsetY = (canvasHeight - drawHeight) / 2

  return {
    image: img,
    drawWidth,
    drawHeight,
    offsetX,
    offsetY,
    scale,
  }
}


