import { useState } from 'react'
import { SHIP_DEFINITIONS, type ShipType, type PlacedShip } from '../store/ships'
import ShipIcon from './ShipIcon'

interface ShipPanelProps {
  placedShips: PlacedShip[]
  selectedShip: ShipType | null
  horizontal: boolean
  onSelect: (type: ShipType) => void
  onRotate: () => void
  onReady: () => void
  onRandom: () => void
}

function countPlaced(type: ShipType, placedShips: PlacedShip[]): number {
  return placedShips.filter((s) => s.type === type).length
}

export default function ShipPanel({
  placedShips,
  selectedShip,
  horizontal,
  onSelect,
  onRotate,
  onReady,
  onRandom,
}: ShipPanelProps) {
  const [spinning, setSpinning] = useState(false)

  function handleRotate() {
    setSpinning(true)
    setTimeout(() => setSpinning(false), 320)
    onRotate()
  }

  const allPlaced = SHIP_DEFINITIONS.every(
    (def) => countPlaced(def.type, placedShips) >= def.count,
  )

  const selectedDef = SHIP_DEFINITIONS.find((d) => d.type === selectedShip) ?? null

  return (
    <div
      className="flex flex-col gap-3 w-52 p-4 rounded select-none"
      style={{
        background: '#060010',
        border: '1px solid #2a0020',
        boxShadow: '0 0 20px rgba(180, 0, 80, 0.15)',
      }}
    >
      {/* Nagłówek */}
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
          const placed   = countPlaced(def.type, placedShips)
          const isFullyPlaced = placed >= def.count
          const isSelected    = selectedShip === def.type

          return (
            <button
              key={def.type}
              disabled={isFullyPlaced}
              onClick={() => !isFullyPlaced && onSelect(def.type)}
              className="flex flex-col gap-1.5 p-2.5 rounded text-left transition-all duration-150"
              style={{
                background: isSelected ? 'rgba(180,0,50,0.2)' : isFullyPlaced ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                border: isSelected ? '1px solid #cc2200' : isFullyPlaced ? '1px solid #1a0010' : '1px solid #3a1030',
                boxShadow: isSelected ? '0 0 12px rgba(200,0,0,0.4)' : 'none',
                cursor: isFullyPlaced ? 'default' : 'pointer',
                opacity: isFullyPlaced ? 0.4 : 1,
              }}
            >
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
                <span className="text-xs" style={{ color: isFullyPlaced ? '#2a0015' : '#661133' }}>
                  {placed}/{def.count}
                </span>
              </div>

              {/* Ikona potwora + rozmiar */}
              <div className="flex items-center gap-2">
                <ShipIcon
                  type={def.type}
                  size={28}
                  color={isSelected ? '#ff4400' : '#cc2200'}
                  dim={isFullyPlaced}
                />
                <div className="flex gap-0.5 items-center">
                  {Array.from({ length: def.size }, (_, i) => (
                    <div
                      key={i}
                      className="h-2 rounded-sm"
                      style={{
                        width: `${Math.min(18, 90 / def.size)}px`,
                        background: isFullyPlaced ? '#1a0010' : isSelected ? '#cc2200' : '#550a1a',
                        boxShadow: isSelected ? '0 0 4px rgba(200,50,0,0.5)' : 'none',
                      }}
                    />
                  ))}
                  <span className="text-xs ml-1" style={{ color: '#441122' }}>×{def.size}</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px solid #1a0015' }} />

      {/* Sekcja obrotu — widoczna zawsze, aktywna przy wybranym statku */}
      <div className="flex flex-col gap-2">

        {/* Podgląd orientacji wybranego statku */}
        {selectedDef ? (
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs tracking-widest uppercase" style={{ color: '#551122' }}>
              orientacja
            </span>
            <div
              className={`flex ${horizontal ? 'flex-row' : 'flex-col'} gap-0.5 p-2 rounded`}
              style={{ background: 'rgba(200,0,50,0.07)', border: '1px solid #2a0018', minHeight: '36px', minWidth: '36px' }}
            >
              {Array.from({ length: selectedDef.size }, (_, i) => (
                <div
                  key={i}
                  className="rounded-sm"
                  style={{
                    width:  horizontal ? `${Math.min(22, 110 / selectedDef.size)}px` : '18px',
                    height: horizontal ? '18px' : `${Math.min(22, 110 / selectedDef.size)}px`,
                    background: '#cc2200',
                    boxShadow: '0 0 4px rgba(200,50,0,0.6)',
                  }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: '#661122' }}>
              {horizontal ? '↔ poziomo' : '↕ pionowo'}
            </span>
          </div>
        ) : (
          <div className="text-center text-xs" style={{ color: '#330010' }}>
            wybierz statek
          </div>
        )}

        {/* Przycisk OBRÓĆ */}
        <button
          onClick={handleRotate}
          className="py-2.5 px-3 rounded font-bold tracking-widest uppercase transition-all duration-150"
          style={{
            fontSize: '0.8rem',
            background: selectedDef ? 'rgba(180,0,40,0.2)' : 'rgba(100,0,20,0.1)',
            border: selectedDef ? '1px solid #880022' : '1px solid #2a0010',
            color: selectedDef ? '#dd3311' : '#440011',
            cursor: 'pointer',
            boxShadow: selectedDef ? '0 0 10px rgba(180,0,40,0.2)' : 'none',
            textShadow: selectedDef ? '0 0 8px #aa2200' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!selectedDef) return
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = 'rgba(200,0,50,0.35)'
            b.style.boxShadow   = '0 0 16px rgba(200,0,50,0.5)'
            b.style.color       = '#ff4422'
          }}
          onMouseLeave={(e) => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = selectedDef ? 'rgba(180,0,40,0.2)' : 'rgba(100,0,20,0.1)'
            b.style.boxShadow   = selectedDef ? '0 0 10px rgba(180,0,40,0.2)' : 'none'
            b.style.color       = selectedDef ? '#dd3311' : '#440011'
          }}
        >
          <span className={spinning ? 'st-rotate-spin' : ''} style={{ display: 'inline-block' }}>↻</span> OBRÓĆ
          <span className="ml-2 text-xs opacity-40 font-normal normal-case tracking-normal">[R]</span>
        </button>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px solid #1a0015' }} />

      {/* Przycisk LOSOWE ROZMIESZCZENIE */}
      <button
        onClick={onRandom}
        className="py-2 px-3 rounded text-xs tracking-widest uppercase font-semibold transition-all duration-150"
        style={{
          background: 'rgba(80,0,120,0.2)',
          border: '1px solid #4a0060',
          color: '#9933cc',
          cursor: 'pointer',
          textShadow: '0 0 6px #7700aa',
        }}
        onMouseEnter={(e) => {
          const b = e.currentTarget as HTMLButtonElement
          b.style.background = 'rgba(120,0,180,0.35)'
          b.style.borderColor = '#8800cc'
          b.style.color = '#cc55ff'
        }}
        onMouseLeave={(e) => {
          const b = e.currentTarget as HTMLButtonElement
          b.style.background = 'rgba(80,0,120,0.2)'
          b.style.borderColor = '#4a0060'
          b.style.color = '#9933cc'
        }}
      >
        ⚄ LOSOWE
      </button>

      {/* Przycisk GOTOWY — aktywny tylko gdy wszystkie statki rozstawione */}
      <button
        onClick={allPlaced ? onReady : undefined}
        disabled={!allPlaced}
        className="py-3 px-3 rounded font-bold tracking-widest uppercase transition-all duration-300"
        style={{
          fontSize: '0.85rem',
          background: allPlaced ? 'rgba(0,160,60,0.25)' : 'rgba(20,20,20,0.4)',
          border: allPlaced ? '1px solid #00aa44' : '1px solid #1a1a1a',
          color: allPlaced ? '#00ee66' : '#2a2a2a',
          cursor: allPlaced ? 'pointer' : 'not-allowed',
          boxShadow: allPlaced ? '0 0 16px rgba(0,180,60,0.4)' : 'none',
          textShadow: allPlaced ? '0 0 10px #00cc55' : 'none',
        }}
        onMouseEnter={(e) => {
          if (!allPlaced) return
          const b = e.currentTarget as HTMLButtonElement
          b.style.background = 'rgba(0,200,80,0.35)'
          b.style.boxShadow  = '0 0 24px rgba(0,220,80,0.6)'
          b.style.color      = '#00ff77'
        }}
        onMouseLeave={(e) => {
          if (!allPlaced) return
          const b = e.currentTarget as HTMLButtonElement
          b.style.background = 'rgba(0,160,60,0.25)'
          b.style.boxShadow  = '0 0 16px rgba(0,180,60,0.4)'
          b.style.color      = '#00ee66'
        }}
      >
        {allPlaced ? '✓ GOTOWY' : '— GOTOWY —'}
      </button>
    </div>
  )
}
