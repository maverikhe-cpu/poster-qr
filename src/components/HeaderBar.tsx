import './HeaderBar.css'

export function HeaderBar({ onClear }: { onClear: () => void }) {
  return (
    <header className="header-bar">
      <div className="header-left">
        <span className="logo">海报二维码工具</span>
      </div>
      <div className="header-right">
        <button
          type="button"
          className="text-btn"
          onClick={() => {
            const help = [
              '使用步骤：',
              '1. 上传海报名片（JPG/PNG，最多10MB）',
              '2. 上传二维码图片',
              '3. 在画布上拖拽画一个正方形框',
              '4. 等二维码自动贴到框里',
              '5. 点击“下载图片”获取新海报',
            ].join('\n')
            alert(help)
          }}
        >
          使用帮助
        </button>
        <button type="button" className="outline-btn" onClick={onClear}>
          清空画布
        </button>
      </div>
    </header>
  )
}


