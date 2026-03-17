import { useState, useCallback, useEffect } from 'react'

// Typy możliwych stanów pojedynczego pola
export type CellState = 'empty' | 'ship' | 'hit' | 'miss'

// Klucz identyfikujący pole
export function cellKey(row: number, col: number) {
  return `${row}-${col}`
}

// Mapowanie stanu pola na style — paleta Upside Down
function getCellStyle(
  state: CellState,
  preview: 'valid' | 'invalid' | null,
  isClicked: boolean,
  hasStatic: boolean,
  readOnly: boolean,
): { className: string; style: React.CSSProperties } {
  const base =
    'w-14 h-14 border flex items-center justify-center select-none text-base font-bold transition-colors duration-100 relative'

  const clickAnim = isClicked
    ? state === 'miss'
      ? 'st-click-miss'
      : 'st-click-burst'
    : ''

  const staticAnim = hasStatic ? 'st-static' : ''

  // Podgląd rozmieszczenia nadpisuje normalny wygląd
  if (preview === 'valid') {
    return {
      className: `${base} cursor-crosshair st-preview-valid ${staticAnim}`,
      style: {},
    }
  }
  if (preview === 'invalid') {
    return {
      className: `${base} cursor-crosshair st-preview-invalid ${staticAnim}`,
      style: {},
    }
  }

  const cursorClass = blocked ? 'cursor-not-allowed' : readOnly ? 'cursor-default' : 'cursor-pointer'

  switch (state) {
    case 'empty':
      return {
        className: `${base} ${cursorClass} ${clickAnim} ${staticAnim} bg-[#050d1a] border-[#1a2a4a] ${readOnly ? '' : 'hover:bg-[#0a1f3a] hover:border-[#2a4a7a]'}`,
        style: {},
      }
    case 'ship':
      // Zielona bioluminescencja — grzybnia Upside Down
      return {
        className: `${base} ${cursorClass} ${clickAnim} ${staticAnim} st-cell-ship ${readOnly ? '' : 'hover:brightness-125'}`,
        style: {},
      }
    case 'hit':
      return {
        className: `${base} ${cursorClass} ${clickAnim} ${staticAnim} bg-[#3d0000] border-[#cc2200] st-cell-hit`,
        style: {},
      }
    case 'miss':
      return {
        className: `${base} ${cursorClass} ${clickAnim} ${staticAnim} bg-[#0a0a14] border-[#3a3a5a]`,
        style: {},
      }
  }
}

// Etykiety wierszy i kolumn
const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
const COL_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
const GRID_SIZE = 10

interface BoardProps {
  cells: CellState[][]
  onCellClick?: (row: number, col: number) => void
  // Mapa klucz → valid/invalid dla podglądu rozmieszczania statku
  previewCells?: Map<string, boolean>
  onCellHover?: (row: number, col: number) => void
  onBoardLeave?: () => void
  // Prawy przycisk myszy — obrót statku w trybie rozmieszczania
  onRightClick?: () => void
  label?: string
  shaking?: boolean
  // Tryb tylko do odczytu — brak kursora pointer, brak hover
  readOnly?: boolean
  // Plansza zablokowana (nie moja tura) — cursor-not-allowed
  blocked?: boolean
}

export default function Board({
  cells,
  onCellClick,
  previewCells,
  onCellHover,
  onBoardLeave,
  onRightClick,
  label,
  shaking,
  readOnly,
  blocked,
}: BoardProps) {
  const [animating, setAnimating] = useState<Set<string>>(new Set())
  const [staticNoise, setStaticNoise] = useState<Set<string>>(new Set())

  // Losowe zakłócenia statyczne na pustych polach — efekt Upside Down
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const schedule = () => {
      timeout = setTimeout(
        () => {
          const row = Math.floor(Math.random() * GRID_SIZE)
          const col = Math.floor(Math.random() * GRID_SIZE)
          if (cells[row]?.[col] === 'empty') {
            const key = cellKey(row, col)
            setStaticNoise((prev) => new Set(prev).add(key))
            setTimeout(() => {
              setStaticNoise((prev) => {
                const next = new Set(prev)
                next.delete(key)
                return next
              })
            }, 300)
          }
          schedule()
        },
        800 + Math.random() * 2200,
      )
    }
    schedule()
    return () => clearTimeout(timeout)
  }, [cells])

  const handleClick = useCallback(
    (row: number, col: number) => {
      if (!onCellClick) return
      const key = cellKey(row, col)
      setAnimating((prev) => new Set(prev).add(key))
      setTimeout(() => {
        setAnimating((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }, 400)
      onCellClick(row, col)
    },
    [onCellClick],
  )

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <h2
          className="text-sm font-semibold tracking-[0.3em] uppercase mb-1"
          style={{ color: '#cc3300', textShadow: '0 0 8px #cc3300' }}
        >
          {label}
        </h2>
      )}

      {/* Ramka planszy */}
      <div
        className={`p-3 rounded ${shaking ? 'st-telekinesis' : ''}`}
        style={{
          boxShadow: '0 0 30px 4px rgba(150, 0, 0, 0.25), inset 0 0 20px rgba(0,0,0,0.8)',
          background: '#03060f',
        }}
        onMouseLeave={onBoardLeave}
        onContextMenu={(e) => {
          e.preventDefault()
          onRightClick?.()
        }}
      >
        {/* Nagłówek kolumn */}
        <div className="flex">
          <div className="w-14 h-14" />
          {COL_LABELS.map((col) => (
            <div
              key={col}
              className="w-14 h-14 flex items-center justify-center text-sm font-semibold"
              style={{ color: '#cc3300', textShadow: '0 0 6px #cc3300' }}
            >
              {col}
            </div>
          ))}
        </div>

        {/* Wiersze planszy */}
        {Array.from({ length: GRID_SIZE }, (_, row) => (
          <div key={row} className="flex">
            {/* Etykieta wiersza */}
            <div
              className="w-14 h-14 flex items-center justify-center text-sm font-semibold"
              style={{ color: '#cc3300', textShadow: '0 0 6px #cc3300' }}
            >
              {ROW_LABELS[row]}
            </div>

            {/* Pola wiersza */}
            {Array.from({ length: GRID_SIZE }, (_, col) => {
              const state = cells[row][col]
              const key = cellKey(row, col)
              const previewValid = previewCells?.get(key)
              const preview =
                previewValid === true ? 'valid' : previewValid === false ? 'invalid' : null
              const { className, style } = getCellStyle(
                state,
                preview,
                animating.has(key),
                staticNoise.has(key),
                readOnly ?? false,
              )

              return (
                <div
                  key={col}
                  className={className}
                  style={style}
                  onClick={() => handleClick(row, col)}
                  onMouseEnter={() => onCellHover?.(row, col)}
                >
                  {state === 'miss' && (
                    <span
                      style={{
                        display: 'block',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#ccd6f6',
                        boxShadow: '0 0 6px rgba(200,210,255,0.6)',
                      }}
                    />
                  )}
                  {state === 'hit' && (
                    <span style={{ color: '#ff4400', textShadow: '0 0 10px #ff2200, 0 0 20px #aa0000', fontSize: '1.3rem', lineHeight: 1 }}>
                      ✕
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
