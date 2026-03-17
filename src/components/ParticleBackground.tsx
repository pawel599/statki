import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  opacity: number
  opacitySpeed: number
}

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a)
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let particles: Particle[] = []

    function resize() {
      if (!canvas) return
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }

    function spawnParticle(): Particle {
      return {
        x:            randomBetween(0, canvas!.width),
        y:            canvas!.height + randomBetween(0, 60),
        size:         randomBetween(0.8, 2.8),
        speedY:       randomBetween(0.2, 0.7),
        speedX:       randomBetween(-0.15, 0.15),
        opacity:      randomBetween(0.1, 0.55),
        opacitySpeed: randomBetween(0.003, 0.008),
      }
    }

    function init() {
      resize()
      particles = Array.from({ length: 130 }, () => {
        const p = spawnParticle()
        // Rozłóż startowo po całym ekranie
        p.y = randomBetween(0, canvas!.height)
        return p
      })
    }

    function draw() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        // Mieszanka białawych i lekko czerwonawych spor
        const r = Math.random() > 0.85 ? 220 : 200
        const g = Math.random() > 0.85 ? 160 : 190
        const b = Math.random() > 0.85 ? 160 : 190
        ctx.fillStyle = `rgba(${r},${g},${b},${p.opacity})`
        ctx.fill()

        p.y -= p.speedY
        p.x += p.speedX
        p.opacity += (Math.random() > 0.5 ? 1 : -1) * p.opacitySpeed

        if (p.opacity < 0.05) p.opacity = 0.05
        if (p.opacity > 0.6)  p.opacity = 0.6

        // Cząsteczka wyszła za górę — odradzaj od dołu
        if (p.y < -10) {
          const fresh = spawnParticle()
          p.x            = fresh.x
          p.y            = fresh.y
          p.size         = fresh.size
          p.speedY       = fresh.speedY
          p.speedX       = fresh.speedX
          p.opacity      = fresh.opacity
          p.opacitySpeed = fresh.opacitySpeed
        }
      }

      animId = requestAnimationFrame(draw)
    }

    init()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  )
}
