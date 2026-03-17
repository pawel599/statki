import { SHIP_DEFINITIONS, type ShipType, type PlacedShip } from '../store/ships'

interface ShipPanelProps {
  placedShips: PlacedShip[]
  selectedShip: ShipType | null
  horizontal: boolean
  onSelect: (type: ShipType) => void
  onRotate: () => void
}

// Oblicza ile sztuk danego typu zostało już rozmieszczonych
function countPlaced(type: ShipType, placedShips: PlacedShip[]): number {
  return placedShips.filter((s) => s.type === type).length
}

export default function ShipPanel({
  placedShips,
  selectedShip,
  horizontal,
  onSelect,
  onRotate,
}: ShipPanelProps) {
  const allPlaced = SHIP_DEFINITIONS.every(
    (def) => countPlaced(def.type, placedShips) >= def.count,
  )

  return (
    <div
      className="flex flex-col gap-3 w-52 p-4 rounded select-none"
      style={{
        background: '#060010',
        border: '1px solid #2a0020',
        boxShadow: '0 0 20px rgba(180, 0, 80, 0.15)',
      }}
    >
      {/* Nagłówek panelu */}
      <h3
        className="text-center text-xs tracking-[0.25em] uppercase font-semibold pb-2"
        style={{
          color: '#cc3300',
          textShadow: '0 0 8px #cc3300',
          borderBottom: '1px solid #2a0020',
        }}
      >
        Twoja flota
      </h3>

      {/* Lista statków */}
      <div className="flex flex-col gap-2">
        {SHIP_DEFINITIONS.map((def) => {
          const placed = countPlaced(def.type, placedShips)
          const remaining = def.count - placed
          const isFullyPlaced = remaining === 0
          const isSelected = selectedShip === def.type

          return (
            <button
              key={def.type}
              disabled={isFullyPlaced}
              onClick={() => !isFullyPlaced && onSelect(def.type)}
              className="flex flex-col gap-1.5 p-2.5 rounded text-left transition-all duration-150"
              style={{
                background: isSelected
                  ? 'rgba(180, 0, 50, 0.2)'
                  : isFullyPlaced
                    ? 'rgba(255,255,255,0.02)'
                    : 'rgba(255,255,255,0.04)',
                border: isSelected
                  ? '1px solid #cc2200'
                  : isFullyPlaced
                    ? '1px solid #1a0010'
                    : '1px solid #3a1030',
                boxShadow: isSelected ? '0 0 12px rgba(200,0,0,0.4)' : 'none',
                cursor: isFullyPlaced ? 'default' : 'pointer',
                opacity: isFullyPlaced ? 0.4 : 1,
              }}
            >
              {/* Nazwa i liczba pozostałych */}
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-semibold tracking-wide"
                  style={{
                    color: isSelected ? '#ff4400' : isFullyPlaced ? '#441122' : '#aa3322',
                    textShadow: isSelected ? '0 0 6px #ff2200' : 'none',
                  }}
                >
                  {def.name}
                </span>
                <span
                  className="text-xs"
                  style={{ color: isFullyPlaced ? '#2a0015' : '#661133' }}
                >
                  {placed}/{def.count}
                </span>
              </div>

              {/* Wizualna reprezentacja statku — kolorowe pola */}
              <div className="flex gap-0.5">
                {Array.from({ length: def.size }, (_, i) => (
                  <div
                    key={i}
                    className="h-4 rounded-sm"
                    style={{
                      width: `${Math.min(32, 160 / def.size)}px`,
                      background: isFullyPlaced
                        ? '#1a0010'
                        : isSelected
                          ? i < placed * (def.size / def.count)
                            ? '#330a00'
                            : '#cc2200'
                          : '#550a1a',
                      boxShadow: isSelected ? '0 0 4px rgba(200,50,0,0.5)' : 'none',
                    }}
                  />
                ))}
                <span
                  className="text-xs ml-1 self-center"
                  style={{ color: '#441122' }}
                >
                  ×{def.size}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Przycisk obrotu */}
      <button
        onClick={onRotate}
        className="mt-1 py-2 px-3 rounded text-xs tracking-widest uppercase font-semibold transition-all duration-150"
        style={{
          background: 'rgba(180,0,50,0.1)',
          border: '1px solid #3a0020',
          color: '#993322',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(180,0,50,0.25)'
          ;(e.currentTarget as HTMLButtonElement).style.color = '#ff4422'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(180,0,50,0.1)'
          ;(e.currentTarget as HTMLButtonElement).style.color = '#993322'
        }}
      >
        {/* Wskaźnik aktualnej orientacji */}
        {horizontal ? '↔ poziomo' : '↕ pionowo'}
        <span className="ml-2 opacity-50">[R]</span>
      </button>

      {/* Status floty */}
      {allPlaced && (
        <div
          className="text-center text-xs tracking-widest py-2 rounded"
          style={{
            color: '#00cc66',
            textShadow: '0 0 8px #00aa44',
            border: '1px solid #004422',
            background: 'rgba(0,100,40,0.1)',
          }}
        >
          ✓ FLOTA GOTOWA
        </div>
      )}
    </div>
  )
}
