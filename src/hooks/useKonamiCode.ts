import { useEffect, useRef } from 'react'

// Sekwencja Konami: ↑ ↑ ↓ ↓ ← → ← → B A
const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
]

export function useKonamiCode(onSuccess: () => void) {
  const progress = useRef(0)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === KONAMI[progress.current]) {
        progress.current += 1
        if (progress.current === KONAMI.length) {
          progress.current = 0
          onSuccess()
        }
      } else {
        // Resetuj — ale sprawdź czy obecny klawisz zaczyna nową sekwencję
        progress.current = e.key === KONAMI[0] ? 1 : 0
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onSuccess])
}
