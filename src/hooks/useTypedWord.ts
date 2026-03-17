import { useEffect, useRef } from 'react'

// Wykrywa wpisanie słowa kluczowego w dowolnym momencie (bez focusu na input)
export function useTypedWord(word: string, onMatch: () => void) {
  const buffer = useRef('')

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      // Ignoruj klawisze specjalne
      if (e.key.length !== 1) {
        buffer.current = ''
        return
      }

      buffer.current = (buffer.current + e.key.toLowerCase()).slice(-word.length)

      if (buffer.current === word.toLowerCase()) {
        buffer.current = ''
        onMatch()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [word, onMatch])
}
