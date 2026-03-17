import { useEffect, useState } from 'react'

// Kolory lampek — jak na ścianie Joyce Byers
const COLORS = ['#ff0000', '#ff6600', '#ffff00', '#00ff00', '#0088ff', '#ff00ff', '#ffffff']

// Liczba lampek i losowe opóźnienia migania
const COUNT = 28

interface Light {
  color: string
  delay: number   // opóźnienie animacji w sekundach
  on: boolean
}

function randomLights(): Light[] {
  return Array.from({ length: COUNT }, (_, i) => ({
    color: COLORS[i % COLORS.length],
    delay: Math.random() * 3,
    on: Math.random() > 0.2,
  }))
}

export default function ChristmasLights() {
  const [lights, setLights] = useState<Light[]>(randomLights)

  // Co losowy interwał losowo przełącza jedną lampkę
  useEffect(() => {
    const interval = setInterval(() => {
      setLights((prev) => {
        const next = [...prev]
        const i = Math.floor(Math.random() * COUNT)
        next[i] = { ...next[i], on: !next[i].on }
        return next
      })
    }, 200)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed top-0 left-0 w-full flex items-end justify-around px-4 pointer-events-none z-50" style={{ height: '36px' }}>
      {/* Drut lampek */}
      <div
        className="absolute top-3 left-0 w-full"
        style={{ height: '2px', background: 'linear-gradient(90deg, #111 0%, #222 50%, #111 100%)' }}
      />

      {lights.map((light, i) => (
        <div key={i} className="flex flex-col items-center" style={{ marginTop: '2px' }}>
          {/* Metalowa końcówka */}
          <div style={{ width: '3px', height: '6px', background: '#555', borderRadius: '1px' }} />
          {/* Żarówka */}
          <div
            style={{
              width: '10px',
              height: '14px',
              borderRadius: '50% 50% 45% 45%',
              background: light.on ? light.color : '#1a1a1a',
              boxShadow: light.on ? `0 0 8px 3px ${light.color}88` : 'none',
              transition: 'background 0.15s, box-shadow 0.15s',
            }}
          />
        </div>
      ))}
    </div>
  )
}
