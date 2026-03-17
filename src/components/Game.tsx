import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Board, { type CellState } from './Board'
import { getShipCells, type PlacedShip } from '../store/ships'

interface Shot {
  id: string
  game_id: string
  player_id: string
  row: number
  col: number
  result: 'hit' | 'miss' | 'sunk'
}

interface GameProps {
  gameId: string
  playerId: string
  isPlayer1: boolean
  myShips: PlacedShip[]
  onReturnToLobby: () => void
}

function createEmptyGrid(): CellState[][] {
  return Array.from({ length: 10 }, () => Array(10).fill('empty') as CellState[])
}

// Zwraca zbiór kluczy "row-col" wszystkich komórek w pełni zatopionych statków
function getSunkShipCells(ships: PlacedShip[], shooterShots: Shot[]): Set<string> {
  const sunk = new Set<string>()
  for (const ship of ships) {
    const cells = getShipCells(ship)
    if (cells.every((c) => shooterShots.some((s) => s.row === c.row && s.col === c.col))) {
      cells.forEach((c) => sunk.add(`${c.row}-${c.col}`))
    }
  }
  return sunk
}

function StatItem({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem', color, letterSpacing: '0.05em', lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: '0.6rem', color: '#331111', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  )
}

export default function Game({ gameId, playerId, isPlayer1, myShips, onReturnToLobby }: GameProps) {
  const [shots, setShots]                 = useState<Shot[]>([])
  const [currentTurn, setCurrentTurn]     = useState<string | null>(null)
  const [opponentId, setOpponentId]       = useState<string | null>(null)
  const [opponentShips, setOpponentShips] = useState<PlacedShip[]>([])
  const [shooting, setShooting]           = useState(false)
  const [winner, setWinner]               = useState<string | null>(null)
  const [sunkNote, setSunkNote]           = useState<{ text: string; key: number } | null>(null)
  const [endTime, setEndTime]             = useState<number | null>(null)
  const sunkTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startTimeRef  = useRef<number>(Date.now())

  const isMyTurn = currentTurn === playerId
  const iWon     = winner === playerId
  const gameOver = winner !== null

  function showSunkNote(text: string) {
    if (sunkTimerRef.current) clearTimeout(sunkTimerRef.current)
    setSunkNote({ text, key: Date.now() })
    sunkTimerRef.current = setTimeout(() => setSunkNote(null), 2600)
  }

  // Załaduj dane początkowe
  useEffect(() => {
    async function init() {
      const { data: game } = await supabase
        .from('games')
        .select()
        .eq('id', gameId)
        .single()

      if (!game) return
      setCurrentTurn(game.current_turn as string)
      if (game.winner_id) setWinner(game.winner_id as string)

      const oppId = isPlayer1
        ? (game.player2_id as string)
        : (game.player1_id as string)
      setOpponentId(oppId)

      const { data: oppBoard } = await supabase
        .from('boards')
        .select('ships')
        .eq('game_id', gameId)
        .eq('player_id', oppId)
        .single()

      if (oppBoard) setOpponentShips(oppBoard.ships as PlacedShip[])

      const { data: existingShots } = await supabase
        .from('shots')
        .select()
        .eq('game_id', gameId)

      if (existingShots) setShots(existingShots as Shot[])
    }

    init()
  }, [gameId, isPlayer1])

  // Realtime: nowe strzały + zmiany tury / wynik gry
  useEffect(() => {
    const channel = supabase
      .channel(`game-playing-${gameId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shots', filter: `game_id=eq.${gameId}` },
        (payload) => {
          const shot = payload.new as Shot
          setShots((prev) => [...prev, shot])
          // Powiadomienie o zatopieniu
          if (shot.result === 'sunk') {
            const text = shot.player_id === playerId
              ? '💥 Zatopiony!'
              : '☠ Twój statek zatopiony!'
            showSunkNote(text)
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const g = payload.new as { current_turn: string; winner_id: string | null }
          setCurrentTurn(g.current_turn)
          if (g.winner_id) {
            setWinner(g.winner_id)
            setEndTime(Date.now())
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId, playerId])

  // Moja plansza: moje statki + strzały przeciwnika; zatopione statki oznaczone inaczej
  const myBoardCells = useMemo<CellState[][]>(() => {
    const grid = createEmptyGrid()
    for (const ship of myShips) {
      for (const c of getShipCells(ship)) grid[c.row][c.col] = 'ship'
    }
    const oppShots  = shots.filter((s) => s.player_id !== playerId)
    const sunkCells = getSunkShipCells(myShips, oppShots)
    for (const shot of oppShots) {
      grid[shot.row][shot.col] = shot.result === 'miss' ? 'miss' : 'hit'
    }
    for (const key of sunkCells) {
      const [r, c] = key.split('-').map(Number)
      grid[r][c] = 'sunk'
    }
    return grid
  }, [shots, myShips, playerId])

  // Plansza przeciwnika: moje strzały; zatopione statki oznaczone inaczej
  const enemyBoardCells = useMemo<CellState[][]>(() => {
    const grid     = createEmptyGrid()
    const myShots  = shots.filter((s) => s.player_id === playerId)
    const sunkCells = getSunkShipCells(opponentShips, myShots)
    for (const shot of myShots) {
      grid[shot.row][shot.col] = shot.result === 'miss' ? 'miss' : 'hit'
    }
    for (const key of sunkCells) {
      const [r, c] = key.split('-').map(Number)
      grid[r][c] = 'sunk'
    }
    return grid
  }, [shots, playerId, opponentShips])

  // Strzał w planszę przeciwnika
  const handleShoot = useCallback(async (row: number, col: number) => {
    if (!isMyTurn || shooting || !opponentId || gameOver) return
    if (enemyBoardCells[row][col] !== 'empty') return

    setShooting(true)

    const hitShip = opponentShips.find((ship) =>
      getShipCells(ship).some((c) => c.row === row && c.col === col),
    )

    let result: 'hit' | 'miss' | 'sunk' = 'miss'
    if (hitShip) {
      const myPrevShots = shots.filter((s) => s.player_id === playerId)
      const shipCells   = getShipCells(hitShip)
      const allHit = shipCells.every(
        (c) => (c.row === row && c.col === col) ||
          myPrevShots.some((s) => s.row === c.row && s.col === c.col),
      )
      result = allHit ? 'sunk' : 'hit'
    }

    await supabase.from('shots').insert({ game_id: gameId, player_id: playerId, row, col, result })

    // Wykryj koniec gry — wszystkie pola statków przeciwnika zatopione
    const allEnemyCells = opponentShips.flatMap((s) => getShipCells(s))
    const myAllShots    = [...shots.filter((s) => s.player_id === playerId), { row, col }]
    const allSunk       = allEnemyCells.every((ec) =>
      myAllShots.some((s) => s.row === ec.row && s.col === ec.col),
    )

    if (allSunk) {
      // Koniec gry — zapisz zwycięzcę i zaktualizuj status w bazie
      await supabase
        .from('games')
        .update({ winner_id: playerId, status: 'finished', current_turn: playerId })
        .eq('id', gameId)
    } else if (result === 'miss') {
      // Pudło — tura przechodzi na przeciwnika
      await supabase.from('games').update({ current_turn: opponentId }).eq('id', gameId)
    }
    // Trafienie (hit/sunk bez końca gry) — tura zostaje

    setShooting(false)
  }, [isMyTurn, shooting, opponentId, gameOver, enemyBoardCells, opponentShips, shots, playerId, gameId])

  // ── Ekran końca gry ─────────────────────────────────────────────────────────
  if (gameOver) {
    const myShots    = shots.filter((s) => s.player_id === playerId)
    const myHits     = myShots.filter((s) => s.result !== 'miss').length
    const myMisses   = myShots.filter((s) => s.result === 'miss').length
    const mySunk     = myShots.filter((s) => s.result === 'sunk').length
    const oppShots   = shots.filter((s) => s.player_id !== playerId)
    const oppHits    = oppShots.filter((s) => s.result !== 'miss').length

    const durationMs  = (endTime ?? Date.now()) - startTimeRef.current
    const totalSec    = Math.floor(durationMs / 1000)
    const mins        = Math.floor(totalSec / 60)
    const secs        = totalSec % 60
    const duration    = `${mins}:${String(secs).padStart(2, '0')}`

    const accent = iWon ? '#00ff66' : '#ff2200'
    const accentDim = iWon ? '#003311' : '#330000'
    const accentGlow = iWon
      ? '0 0 20px #00cc44, 0 0 60px #008822'
      : '0 0 20px #ff0000, 0 0 60px #880000'

    return (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center st-demogorgon-enter"
        style={{ background: 'rgba(0,0,0,0.95)' }}
      >
        <div className="flex flex-col items-center gap-6 select-none" style={{ minWidth: '320px' }}>

          {/* Główny napis */}
          <div
            className="text-center font-bold tracking-[0.15em] uppercase"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '5rem',
              color: accent,
              textShadow: accentGlow,
              lineHeight: 0.95,
            }}
          >
            {iWon ? 'WYGRAŁEŚ' : 'PRZEGRAŁEŚ'}
          </div>
          <div style={{ color: accentDim, fontSize: '0.7rem', letterSpacing: '0.35em', textTransform: 'uppercase' }}>
            {iWon ? 'Flota wroga zniszczona' : 'Twoja flota została zatopiona'}
          </div>

          {/* Panel statystyk */}
          <div
            className="w-full flex flex-col gap-2 px-6 py-4 rounded"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${iWon ? '#003311' : '#330000'}`,
            }}
          >
            {/* Czas gry */}
            <div className="flex justify-between items-center">
              <span style={{ color: '#441122', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Czas gry
              </span>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem', color: '#cc3300', textShadow: '0 0 8px #880000', letterSpacing: '0.1em' }}>
                {duration}
              </span>
            </div>

            <div style={{ borderTop: '1px solid #1a0010' }} />

            {/* Moje strzały */}
            <p style={{ color: '#441122', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '2px' }}>
              Twoje strzały
            </p>
            <div className="flex justify-between">
              <StatItem label="Łącznie" value={myShots.length} color="#661122" />
              <StatItem label="Trafienia" value={myHits} color="#880000" />
              <StatItem label="Zatopione" value={mySunk} color="#cc5500" />
              <StatItem label="Pudła" value={myMisses} color="#442200" />
            </div>

            <div style={{ borderTop: '1px solid #1a0010' }} />

            {/* Strzały przeciwnika */}
            <div className="flex justify-between items-center">
              <span style={{ color: '#441122', fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                Strzały przeciwnika
              </span>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.1rem', color: '#552211', letterSpacing: '0.1em' }}>
                {oppShots.length} ({oppHits} trafiło)
              </span>
            </div>
          </div>

          {/* Przycisk NOWA GRA */}
          <button
            onClick={onReturnToLobby}
            className="w-full py-3 px-6 rounded font-bold tracking-widest uppercase"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '1.2rem',
              background: 'rgba(180,0,40,0.2)',
              border: '1px solid #880022',
              color: '#dd3311',
              cursor: 'pointer',
              textShadow: '0 0 8px #aa2200',
              boxShadow: '0 0 14px rgba(180,0,40,0.2)',
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget
              b.style.background = 'rgba(200,0,50,0.35)'
              b.style.boxShadow  = '0 0 24px rgba(200,0,50,0.5)'
              b.style.color      = '#ff4422'
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget
              b.style.background = 'rgba(180,0,40,0.2)'
              b.style.boxShadow  = '0 0 14px rgba(180,0,40,0.2)'
              b.style.color      = '#dd3311'
            }}
          >
            ⚡ NOWA GRA
          </button>
        </div>
      </div>
    )
  }

  // ── Główny widok gry ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4">

      {/* Toast zatopionego statku */}
      {sunkNote && (
        <div
          key={sunkNote.key}
          className="st-sunk-toast fixed top-6 left-1/2 z-30 px-7 py-3 rounded pointer-events-none"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.6rem',
            background: 'rgba(10,3,0,0.92)',
            border: '1px solid #cc5500',
            color: '#ff7700',
            textShadow: '0 0 14px #ff5500, 0 0 30px #aa3300',
            letterSpacing: '0.15em',
            boxShadow: '0 0 20px rgba(200,80,0,0.4)',
          }}
        >
          {sunkNote.text}
        </div>
      )}

      {/* Wskaźnik tury */}
      <div
        className="px-6 py-2 rounded tracking-[0.2em] uppercase font-bold"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.1rem',
          background: isMyTurn ? 'rgba(0,160,60,0.15)' : 'rgba(180,0,40,0.1)',
          border: `1px solid ${isMyTurn ? '#00aa44' : '#440011'}`,
          color: isMyTurn ? '#00ee66' : '#661122',
          textShadow: isMyTurn ? '0 0 12px #00cc44' : 'none',
          boxShadow: isMyTurn ? '0 0 20px rgba(0,180,60,0.3)' : 'none',
          transition: 'all 0.4s ease',
        }}
      >
        {shooting
          ? '⚡ Strzelam…'
          : isMyTurn
          ? '▶ Twoja tura — wybierz cel'
          : '⏳ Tura przeciwnika'}
      </div>

      {/* Dwie plansze */}
      <div className="flex items-start gap-10">

        {/* Moja plansza */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs tracking-[0.3em] uppercase" style={{ color: '#334400' }}>
            Twoja plansza
          </p>
          <Board
            cells={myBoardCells}
            label="— Upside Down —"
            readOnly
          />
        </div>

        {/* Plansza przeciwnika */}
        <div className="flex flex-col items-center gap-2">
          <p
            className="text-xs tracking-[0.3em] uppercase"
            style={{
              color: isMyTurn ? '#660000' : '#330010',
              textShadow: isMyTurn ? '0 0 6px #440000' : 'none',
            }}
          >
            Plansza przeciwnika
          </p>
          <Board
            cells={enemyBoardCells}
            label={isMyTurn ? '— Kliknij, aby strzelać —' : '— Hawkins —'}
            onCellClick={isMyTurn && !shooting ? handleShoot : undefined}
            blocked={!isMyTurn || shooting}
          />
        </div>
      </div>

      {/* Statystyki strzałów */}
      <div className="flex gap-8 text-xs" style={{ color: '#330010' }}>
        {(() => {
          const myShots = shots.filter((s) => s.player_id === playerId)
          const hits    = myShots.filter((s) => s.result !== 'miss').length
          const misses  = myShots.filter((s) => s.result === 'miss').length
          const sunk    = myShots.filter((s) => s.result === 'sunk').length
          return (
            <>
              <span>Strzały: <span style={{ color: '#661122' }}>{myShots.length}</span></span>
              <span>Trafienia: <span style={{ color: '#880000' }}>{hits}</span></span>
              <span>Zatopione: <span style={{ color: '#cc5500' }}>{sunk}</span></span>
              <span>Pudła: <span style={{ color: '#442200' }}>{misses}</span></span>
            </>
          )
        })()}
      </div>
    </div>
  )
}
