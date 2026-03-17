import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface LobbyProps {
  onGameReady: (gameId: string, playerId: string, isPlayer1: boolean, roomCode: string) => void
}

// Generuje 6-znakowy kod pokoju — pomija mylące znaki (0/O, 1/I/L)
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// Pobierz lub wygeneruj trwały ID gracza (na sesję)
function getOrCreatePlayerId(): string {
  const key = 'st_player_id'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}

export default function Lobby({ onGameReady }: LobbyProps) {
  const [nickname, setNickname]   = useState(() => sessionStorage.getItem('st_nickname') ?? '')
  const [joinCode, setJoinCode]   = useState('')
  const [loading, setLoading]     = useState<'create' | 'join' | null>(null)
  const [error, setError]         = useState<string | null>(null)
  // Stan po stworzeniu gry — oczekiwanie na drugiego gracza
  const [waitingGameId, setWaitingGameId]     = useState<string | null>(null)
  const [waitingRoomCode, setWaitingRoomCode] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Zapisz pseudonim na bieżąco
  useEffect(() => {
    sessionStorage.setItem('st_nickname', nickname)
  }, [nickname])

  // Realtime: czekaj na dołączenie drugiego gracza
  useEffect(() => {
    if (!waitingGameId) return

    const playerId = getOrCreatePlayerId()

    channelRef.current = supabase
      .channel(`lobby-${waitingGameId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${waitingGameId}` },
        (payload) => {
          const game = payload.new as { status: string; player2_id: string | null }
          if (game.status === 'placement' && game.player2_id) {
            channelRef.current?.unsubscribe()
            onGameReady(waitingGameId, playerId, true, waitingRoomCode ?? '')
          }
        },
      )
      .subscribe()

    return () => { channelRef.current?.unsubscribe() }
  }, [waitingGameId, onGameReady])

  function validateNickname(): boolean {
    if (!nickname.trim()) {
      setError('Wpisz pseudonim przed kontynuowaniem.')
      return false
    }
    return true
  }

  // Stwórz nową grę
  async function handleCreate() {
    if (!validateNickname()) return
    setError(null)
    setLoading('create')

    const playerId = getOrCreatePlayerId()

    const roomCode = generateRoomCode()

    const { data, error: dbErr } = await supabase
      .from('games')
      .insert({ status: 'waiting', player1_id: playerId, room_code: roomCode })
      .select()
      .single()

    setLoading(null)

    if (dbErr || !data) {
      setError(`Błąd tworzenia gry: ${dbErr?.message ?? 'nieznany błąd'}`)
      return
    }

    setWaitingGameId(data.id as string)
    setWaitingRoomCode(roomCode)
  }

  // Dołącz do istniejącej gry
  async function handleJoin() {
    if (!validateNickname()) return
    if (!joinCode.trim()) { setError('Wpisz kod pokoju.'); return }
    setError(null)
    setLoading('join')

    const playerId = getOrCreatePlayerId()
    const code = joinCode.trim().toUpperCase()

    // Znajdź grę po kodzie pokoju
    const { data: games, error: findErr } = await supabase
      .from('games')
      .select()
      .eq('room_code', code)
      .eq('status', 'waiting')
      .limit(1)

    if (findErr || !games?.length) {
      setLoading(null)
      setError('Nie znaleziono pokoju o tym kodzie lub gra już się rozpoczęła.')
      return
    }

    const game = games[0] as { id: string; player1_id: string; room_code: string }

    if (game.player1_id === playerId) {
      setLoading(null)
      setError('Nie możesz dołączyć do własnego pokoju.')
      return
    }

    const { error: updateErr } = await supabase
      .from('games')
      .update({ player2_id: playerId, status: 'placement' })
      .eq('id', game.id)

    setLoading(null)

    if (updateErr) {
      setError(`Błąd dołączania: ${updateErr.message}`)
      return
    }

    onGameReady(game.id, playerId, false, game.room_code)
  }

  // ── Widok oczekiwania (po stworzeniu gry) ───────────────────────────────────
  if (waitingRoomCode) {
    return (
      <div className="flex flex-col items-center gap-6 select-none">
        <div
          className="flex flex-col items-center gap-4 p-8 rounded"
          style={{ background: '#060010', border: '1px solid #2a0020', boxShadow: '0 0 30px rgba(180,0,80,0.15)' }}
        >
          <p className="text-xs tracking-[0.3em] uppercase" style={{ color: '#551122' }}>
            Twój kod pokoju
          </p>
          <div
            className="text-center font-bold tracking-[0.3em]"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: '3.5rem',
              color: '#ff2200',
              textShadow: '0 0 20px #ff0000, 0 0 50px #880000',
              letterSpacing: '0.4em',
            }}
          >
            {waitingRoomCode}
          </div>
          <p className="text-xs tracking-widest" style={{ color: '#441122' }}>
            Podaj ten kod drugiemu graczowi
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: '#cc2200', boxShadow: '0 0 8px #ff0000', animation: 'pulse-glow 1.2s ease-in-out infinite' }}
            />
            <span className="text-xs tracking-widest uppercase" style={{ color: '#661122' }}>
              Oczekiwanie na gracza…
            </span>
          </div>
        </div>
        <button
          onClick={() => { channelRef.current?.unsubscribe(); setWaitingGameId(null); setWaitingRoomCode(null) }}
          className="text-xs tracking-widest uppercase"
          style={{ color: '#330010', cursor: 'pointer', background: 'none', border: 'none' }}
        >
          ← anuluj
        </button>
      </div>
    )
  }

  // ── Główny widok lobby ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-6 w-80 select-none">

      {/* Pseudonim */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-xs tracking-[0.25em] uppercase" style={{ color: '#661122' }}>
          Pseudonim
        </label>
        <input
          type="text"
          maxLength={20}
          placeholder="np. Eleven"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
          className="w-full px-3 py-2 rounded text-sm tracking-wider outline-none"
          style={{
            background: '#0a0018',
            border: '1px solid #3a1030',
            color: '#cc3322',
            caretColor: '#ff2200',
            fontFamily: 'monospace',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#880022'; e.currentTarget.style.boxShadow = '0 0 10px rgba(180,0,40,0.3)' }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = '#3a1030'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px solid #1a0015', width: '100%' }} />

      {/* Stwórz grę */}
      <button
        onClick={handleCreate}
        disabled={loading !== null}
        className="w-full py-3 rounded font-bold tracking-widest uppercase transition-all duration-150"
        style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.1rem',
          background: loading === 'create' ? 'rgba(180,0,40,0.15)' : 'rgba(180,0,40,0.2)',
          border: '1px solid #880022',
          color: loading === 'create' ? '#661122' : '#dd3311',
          cursor: loading !== null ? 'not-allowed' : 'pointer',
          textShadow: loading === 'create' ? 'none' : '0 0 8px #aa2200',
          boxShadow: loading === 'create' ? 'none' : '0 0 12px rgba(180,0,40,0.25)',
        }}
        onMouseEnter={(e) => {
          if (loading) return
          const b = e.currentTarget
          b.style.background = 'rgba(200,0,50,0.35)'
          b.style.boxShadow  = '0 0 20px rgba(200,0,50,0.5)'
          b.style.color      = '#ff4422'
        }}
        onMouseLeave={(e) => {
          if (loading) return
          const b = e.currentTarget
          b.style.background = 'rgba(180,0,40,0.2)'
          b.style.boxShadow  = '0 0 12px rgba(180,0,40,0.25)'
          b.style.color      = '#dd3311'
        }}
      >
        {loading === 'create' ? '⏳ Tworzenie…' : '⚡ Stwórz grę'}
      </button>

      {/* Separator z napisem */}
      <div className="flex items-center gap-3 w-full">
        <div style={{ flex: 1, borderTop: '1px solid #1a0015' }} />
        <span className="text-xs tracking-[0.3em] uppercase" style={{ color: '#330010' }}>lub</span>
        <div style={{ flex: 1, borderTop: '1px solid #1a0015' }} />
      </div>

      {/* Dołącz do gry */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-xs tracking-[0.25em] uppercase" style={{ color: '#334400' }}>
          Kod pokoju
        </label>
        <input
          type="text"
          maxLength={6}
          placeholder="np. A3F9C1"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
          className="w-full px-3 py-2 rounded text-sm tracking-[0.3em] uppercase outline-none"
          style={{
            background: '#080018',
            border: '1px solid #1a2a00',
            color: '#88aa22',
            caretColor: '#aacc00',
            fontFamily: "'Bebas Neue', monospace",
            letterSpacing: '0.3em',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = '#446600'; e.currentTarget.style.boxShadow = '0 0 10px rgba(80,120,0,0.3)' }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = '#1a2a00'; e.currentTarget.style.boxShadow = 'none' }}
        />
        <button
          onClick={handleJoin}
          disabled={loading !== null}
          className="w-full py-3 rounded font-bold tracking-widest uppercase transition-all duration-150"
          style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '1.1rem',
            background: loading === 'join' ? 'rgba(60,100,0,0.15)' : 'rgba(60,100,0,0.2)',
            border: '1px solid #446600',
            color: loading === 'join' ? '#334400' : '#88cc22',
            cursor: loading !== null ? 'not-allowed' : 'pointer',
            textShadow: loading === 'join' ? 'none' : '0 0 8px #668800',
            boxShadow: loading === 'join' ? 'none' : '0 0 12px rgba(80,120,0,0.2)',
          }}
          onMouseEnter={(e) => {
            if (loading) return
            const b = e.currentTarget
            b.style.background = 'rgba(80,130,0,0.3)'
            b.style.boxShadow  = '0 0 20px rgba(100,160,0,0.4)'
            b.style.color      = '#aaee33'
          }}
          onMouseLeave={(e) => {
            if (loading) return
            const b = e.currentTarget
            b.style.background = 'rgba(60,100,0,0.2)'
            b.style.boxShadow  = '0 0 12px rgba(80,120,0,0.2)'
            b.style.color      = '#88cc22'
          }}
        >
          {loading === 'join' ? '⏳ Dołączanie…' : '→ Dołącz do gry'}
        </button>
      </div>

      {/* Błąd */}
      {error && (
        <p
          className="text-xs text-center tracking-wide"
          style={{ color: '#cc2200', textShadow: '0 0 6px #880000' }}
        >
          {error}
        </p>
      )}
    </div>
  )
}
