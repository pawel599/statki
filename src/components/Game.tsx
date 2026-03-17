import { useState, useEffect, useCallback, useMemo } from 'react'
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
}

function createEmptyGrid(): CellState[][] {
  return Array.from({ length: 10 }, () => Array(10).fill('empty') as CellState[])
}

export default function Game({ gameId, playerId, isPlayer1, myShips }: GameProps) {
  const [shots, setShots]               = useState<Shot[]>([])
  const [currentTurn, setCurrentTurn]   = useState<string | null>(null)
  const [opponentId, setOpponentId]     = useState<string | null>(null)
  const [opponentShips, setOpponentShips] = useState<PlacedShip[]>([])
  const [shooting, setShooting]         = useState(false)
  const [winner, setWinner]             = useState<string | null>(null)

  const isMyTurn = currentTurn === playerId
  const iWon     = winner === playerId
  const gameOver = winner !== null

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

      // Pobierz statki przeciwnika
      const { data: oppBoard } = await supabase
        .from('boards')
        .select('ships')
        .eq('game_id', gameId)
        .eq('player_id', oppId)
        .single()

      if (oppBoard) setOpponentShips(oppBoard.ships as PlacedShip[])

      // Pobierz dotychczasowe strzały
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
        (payload) => setShots((prev) => [...prev, payload.new as Shot]),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
        (payload) => {
          const g = payload.new as { current_turn: string; winner_id: string | null }
          setCurrentTurn(g.current_turn)
          if (g.winner_id) setWinner(g.winner_id)
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [gameId])

  // Moja plansza: moje statki + trafienia/pudła przeciwnika
  const myBoardCells = useMemo<CellState[][]>(() => {
    const grid = createEmptyGrid()
    for (const ship of myShips) {
      for (const c of getShipCells(ship)) {
        grid[c.row][c.col] = 'ship'
      }
    }
    for (const shot of shots) {
      if (shot.player_id !== playerId) {
        grid[shot.row][shot.col] = shot.result === 'miss' ? 'miss' : 'hit'
      }
    }
    return grid
  }, [shots, myShips, playerId])

  // Plansza przeciwnika: tylko moje strzały, statki ukryte
  const enemyBoardCells = useMemo<CellState[][]>(() => {
    const grid = createEmptyGrid()
    for (const shot of shots) {
      if (shot.player_id === playerId) {
        grid[shot.row][shot.col] = shot.result === 'miss' ? 'miss' : 'hit'
      }
    }
    return grid
  }, [shots, playerId])

  // Strzał w planszę przeciwnika
  const handleShoot = useCallback(async (row: number, col: number) => {
    if (!isMyTurn || shooting || !opponentId || gameOver) return
    if (enemyBoardCells[row][col] !== 'empty') return

    setShooting(true)

    // Ustal wynik na podstawie statków przeciwnika
    const hitShip = opponentShips.find((ship) =>
      getShipCells(ship).some((c) => c.row === row && c.col === col),
    )

    let result: 'hit' | 'miss' | 'sunk' = 'miss'
    if (hitShip) {
      const myPrevShots = shots.filter((s) => s.player_id === playerId)
      const shipCells   = getShipCells(hitShip)
      // Czy ten strzał zatapia cały statek?
      const allHit = shipCells.every(
        (c) => (c.row === row && c.col === col) ||
          myPrevShots.some((s) => s.row === c.row && s.col === c.col),
      )
      result = allHit ? 'sunk' : 'hit'
    }

    await supabase.from('shots').insert({ game_id: gameId, player_id: playerId, row, col, result })

    // Sprawdź wygraną — wszystkie pola statków przeciwnika zatopione
    const allEnemyCells = opponentShips.flatMap((s) => getShipCells(s))
    const myAllShots    = [...shots.filter((s) => s.player_id === playerId), { row, col }]
    const allSunk       = allEnemyCells.every((ec) =>
      myAllShots.some((s) => s.row === ec.row && s.col === ec.col),
    )

    if (allSunk) {
      // Wszystkie statki zatopione — koniec gry
      await supabase
        .from('games')
        .update({ winner_id: playerId, status: 'finished', current_turn: playerId })
        .eq('id', gameId)
    } else if (result === 'miss') {
      // Pudło — tura przechodzi na przeciwnika
      await supabase.from('games').update({ current_turn: opponentId }).eq('id', gameId)
    }
    // Trafienie (hit/sunk bez końca gry) — tura zostaje u tego samego gracza

    setShooting(false)
  }, [isMyTurn, shooting, opponentId, gameOver, enemyBoardCells, opponentShips, shots, playerId, gameId])

  // ── Ekran końca gry ─────────────────────────────────────────────────────────
  if (gameOver) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center st-demogorgon-enter"
        style={{ background: 'rgba(0,0,0,0.93)' }}>
        <div className="flex flex-col items-center gap-6 select-none">
          <div
            className="text-center font-bold tracking-[0.2em] uppercase"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '4rem',
              color: iWon ? '#00ff66' : '#ff2200',
              textShadow: iWon
                ? '0 0 20px #00cc44, 0 0 60px #008822'
                : '0 0 20px #ff0000, 0 0 60px #880000',
              lineHeight: 1.1,
            }}
          >
            {iWon ? 'ZWYCIĘSTWO' : 'PORAŻKA'}
          </div>
          <div style={{ color: iWon ? '#003311' : '#330000', fontSize: '0.75rem', letterSpacing: '0.3em' }}>
            {iWon ? 'Flota wroga zniszczona' : 'Twoja flota została zatopiona'}
          </div>
        </div>
      </div>
    )
  }

  // ── Główny widok gry ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6">

      {/* Wskaźnik tury */}
      <div className="flex items-center gap-4">
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
          const myShots  = shots.filter((s) => s.player_id === playerId)
          const hits     = myShots.filter((s) => s.result !== 'miss').length
          const misses   = myShots.filter((s) => s.result === 'miss').length
          return (
            <>
              <span>Strzały: <span style={{ color: '#661122' }}>{myShots.length}</span></span>
              <span>Trafienia: <span style={{ color: '#880000' }}>{hits}</span></span>
              <span>Pudła: <span style={{ color: '#442200' }}>{misses}</span></span>
            </>
          )
        })()}
      </div>
    </div>
  )
}
