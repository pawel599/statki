import { useState, useCallback, useMemo, useEffect } from 'react'
import Board, { type CellState, cellKey } from './components/Board'
import ShipPanel from './components/ShipPanel'
import ChristmasLights from './components/ChristmasLights'
import { useKonamiCode } from './hooks/useKonamiCode'
import { useTypedWord } from './hooks/useTypedWord'
import {
  SHIP_DEFINITIONS,
  type ShipType,
  type PlacedShip,
  getShipCells,
  isValidPlacement,
} from './store/ships'

// Tworzy pustą planszę 10×10
function createEmptyGrid(): CellState[][] {
  return Array.from({ length: 10 }, () => Array(10).fill('empty') as CellState[])
}

// Wiadomości jumpscare Demogorgona
const DEMOGORGON_MESSAGES = [
  'DEMOGORGON\nZNALAZŁ CIĘ',
  'HAWKINS\nCIĘ POTRZEBUJE',
  'MIND FLAYER\nNADĄCIĄGA',
  'NIE MA UCIECZKI\nZ UPSIDE DOWN',
]

let shipIdCounter = 0

export default function App() {
  const [placedShips, setPlacedShips]     = useState<PlacedShip[]>([])
  const [selectedShip, setSelectedShip]   = useState<ShipType | null>(null)
  const [horizontal, setHorizontal]       = useState(true)
  const [hoverCell, setHoverCell]         = useState<{ row: number; col: number } | null>(null)
  const [shaking, setShaking]             = useState(false)
  const [demogorgon, setDemogorgon]       = useState(false)
  const [demoExiting, setDemoExiting]     = useState(false)
  const [demoMessage]                     = useState(
    () => DEMOGORGON_MESSAGES[Math.floor(Math.random() * DEMOGORGON_MESSAGES.length)],
  )

  // Siatka wynikająca z rozmieszczonych statków
  const cells = useMemo<CellState[][]>(() => {
    const grid = createEmptyGrid()
    for (const ship of placedShips) {
      for (const c of getShipCells(ship)) {
        grid[c.row][c.col] = 'ship'
      }
    }
    return grid
  }, [placedShips])

  // Definicja aktualnie wybranego statku
  const selectedDef = useMemo(
    () => SHIP_DEFINITIONS.find((d) => d.type === selectedShip) ?? null,
    [selectedShip],
  )

  // Mapa podglądu — klucz pola → czy umieszczenie jest prawidłowe
  const previewCells = useMemo<Map<string, boolean>>(() => {
    if (!selectedDef || !hoverCell) return new Map()
    const valid = isValidPlacement(
      hoverCell.row,
      hoverCell.col,
      selectedDef.size,
      horizontal,
      placedShips,
    )
    const preview = new Map<string, boolean>()
    for (const c of getShipCells({ ...hoverCell, size: selectedDef.size, horizontal })) {
      // Pokaż tylko pola w granicach planszy
      if (c.row >= 0 && c.row < 10 && c.col >= 0 && c.col < 10) {
        preview.set(cellKey(c.row, c.col), valid)
      }
    }
    return preview
  }, [selectedDef, hoverCell, horizontal, placedShips])

  // Obsługa kliknięcia pola — rozmieszcza statek lub ignoruje
  function handleCellClick(row: number, col: number) {
    if (!selectedDef) return
    if (!isValidPlacement(row, col, selectedDef.size, horizontal, placedShips)) return

    const newShip: PlacedShip = {
      id: `ship-${shipIdCounter++}`,
      type: selectedDef.type,
      size: selectedDef.size,
      row,
      col,
      horizontal,
    }
    setPlacedShips((prev) => [...prev, newShip])

    // Sprawdź czy wszystkie statki tego typu są już rozmieszczone
    const newPlaced = [...placedShips, newShip]
    const placedCount = newPlaced.filter((s) => s.type === selectedDef.type).length
    if (placedCount >= selectedDef.count) {
      // Przejdź do następnego nieukończonego statku
      const next = SHIP_DEFINITIONS.find((def) => {
        const count = newPlaced.filter((s) => s.type === def.type).length
        return count < def.count
      })
      setSelectedShip(next?.type ?? null)
    }
  }

  // Obrót statku — klawisz R lub prawy przycisk myszy
  const handleRotate = useCallback(() => setHorizontal((h) => !h), [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'r' || e.key === 'R') handleRotate()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleRotate])

  // Easter egg: wpisanie "eleven" → drżenie planszy
  const triggerTelekinesis = useCallback(() => {
    setShaking(true)
    setTimeout(() => setShaking(false), 850)
  }, [])
  useTypedWord('eleven', triggerTelekinesis)

  // Easter egg: kod Konami → jumpscare Demogorgona
  const triggerDemogorgon = useCallback(() => {
    if (demogorgon) return
    setDemogorgon(true)
    setDemoExiting(false)
    setTimeout(() => {
      setDemoExiting(true)
      setTimeout(() => setDemogorgon(false), 650)
    }, 2500)
  }, [demogorgon])
  useKonamiCode(triggerDemogorgon)

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: 'radial-gradient(ellipse at center, #0a0010 0%, #000000 100%)' }}
    >
      <ChristmasLights />

      <h1 className="st-title text-6xl mt-8">Stranger Statki</h1>

      {/* Układ poziomy: panel + plansza */}
      <div className="flex items-start gap-8">
        <ShipPanel
          placedShips={placedShips}
          selectedShip={selectedShip}
          horizontal={horizontal}
          onSelect={setSelectedShip}
          onRotate={handleRotate}
        />

        <Board
          cells={cells}
          onCellClick={handleCellClick}
          previewCells={selectedShip ? previewCells : undefined}
          onCellHover={selectedShip ? setHoverCell : undefined}
          onBoardLeave={() => setHoverCell(null)}
          onRightClick={selectedShip ? handleRotate : undefined}
          label="— Upside Down —"
          shaking={shaking}
        />
      </div>

      {/* Podpowiedzi */}
      <div className="flex flex-col items-center gap-1">
        {selectedShip ? (
          <p className="text-xs tracking-widest uppercase" style={{ color: '#664400', textShadow: '0 0 6px #442200' }}>
            Kliknij planszę, aby umieścić • [R] lub PPM = obrót
          </p>
        ) : (
          <p className="text-xs tracking-widest uppercase" style={{ color: '#660000', textShadow: '0 0 6px #440000' }}>
            Wybierz statek z panelu
          </p>
        )}
        <p className="text-xs tracking-wider" style={{ color: '#330000' }}>
          wpisz "eleven" • ↑↑↓↓←→←→BA
        </p>
      </div>

      {/* Jumpscare Demogorgona */}
      {demogorgon && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center ${demoExiting ? 'st-demogorgon-exit' : 'st-demogorgon-enter'}`}
          style={{ background: 'rgba(0,0,0,0.95)' }}
        >
          <div className="flex flex-col items-center gap-6 select-none">
            <pre
              className="text-center leading-tight"
              style={{
                color: '#cc2200',
                textShadow: '0 0 20px #ff0000, 0 0 40px #880000',
                fontSize: '0.65rem',
                fontFamily: 'monospace',
              }}
            >
{`        .  .  .
     . (  O  O  ) .
    .  (  >--<  )  .
   .  (  ( ))) )  .
  .  .  '-----'  .  .
    . ( (  | |  ) ) .
       '---' '---'`}
            </pre>
            <div
              className="text-center font-bold tracking-widest whitespace-pre-line"
              style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: '2.5rem',
                color: '#ff2200',
                textShadow: '0 0 20px #ff0000, 0 0 50px #aa0000',
                lineHeight: 1.2,
              }}
            >
              {demoMessage}
            </div>
            <p style={{ color: '#550000', fontSize: '0.7rem', letterSpacing: '0.2em' }}>
              naciśnij dowolny klawisz
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
