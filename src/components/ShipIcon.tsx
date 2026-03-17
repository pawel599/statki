import type { ShipType } from '../store/ships'

interface Props {
  type: ShipType
  size?: number
  color?: string
  dim?: boolean
}

export default function ShipIcon({ type, size = 32, color = '#cc2200', dim = false }: Props) {
  const s = dim ? '#331100' : color
  const glow = dim ? 'none' : `drop-shadow(0 0 3px ${color})`

  switch (type) {

    // Mind Flayer — pająkowata sylwetka z mackami i skrzydłami
    case 'carrier':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill={s} style={{ filter: glow }}>
          {/* Ciało */}
          <ellipse cx="16" cy="14" rx="5" ry="7" />
          {/* Głowa / kolec */}
          <polygon points="16,2 13,8 19,8" />
          {/* Boczne odnóża-skrzydła */}
          <line x1="11" y1="11" x2="2"  y2="8"  stroke={s} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="21" y1="11" x2="30" y2="8"  stroke={s} strokeWidth="1.8" strokeLinecap="round" />
          <line x1="11" y1="14" x2="2"  y2="14" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="21" y1="14" x2="30" y2="14" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
          {/* Macki */}
          <line x1="12" y1="21" x2="6"  y2="30" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="14" y1="21" x2="11" y2="30" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="16" y1="21" x2="16" y2="31" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="18" y1="21" x2="21" y2="30" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20" y1="21" x2="26" y2="30" stroke={s} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )

    // Demogorgon — otwarta kwiatowata twarz z płatkami
    case 'battleship':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill={s} style={{ filter: glow }}>
          {/* 5 płatków otwartej paszczy */}
          <g transform="rotate(0 16 16)">  <ellipse cx="16" cy="7" rx="3.5" ry="9" /></g>
          <g transform="rotate(72 16 16)"> <ellipse cx="16" cy="7" rx="3.5" ry="9" /></g>
          <g transform="rotate(144 16 16)"><ellipse cx="16" cy="7" rx="3.5" ry="9" /></g>
          <g transform="rotate(216 16 16)"><ellipse cx="16" cy="7" rx="3.5" ry="9" /></g>
          <g transform="rotate(288 16 16)"><ellipse cx="16" cy="7" rx="3.5" ry="9" /></g>
          {/* Centrum — otwór ust */}
          <circle cx="16" cy="16" r="4.5" fill={dim ? '#1a0000' : '#000'} />
          <circle cx="16" cy="16" r="2"   fill={s} />
        </svg>
      )

    // Demodog — czworonożny potwór bez głowy
    case 'cruiser':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill={s} style={{ filter: glow }}>
          {/* Tułów */}
          <rect x="5" y="11" width="20" height="10" rx="3" />
          {/* "Głowa" — otwierająca się paszcza */}
          <rect x="22" y="7" width="8" height="8" rx="2" />
          <polygon points="30,9 32,6 32,12" />
          {/* Nogi */}
          <rect x="7"  y="21" width="3.5" height="8" rx="1.5" />
          <rect x="12" y="21" width="3.5" height="8" rx="1.5" />
          <rect x="17" y="21" width="3.5" height="8" rx="1.5" />
          <rect x="7"  y="3"  width="3.5" height="8" rx="1.5" />
          <rect x="17" y="3"  width="3.5" height="8" rx="1.5" />
          {/* Ogon */}
          <path d="M5,13 C2,9 0,7 2,4 C4,2 6,4 5,8" stroke={s} strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
      )

    // Dart — mała kijanka / młody Demodog
    case 'destroyer':
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill={s} style={{ filter: glow }}>
          {/* Ciało */}
          <ellipse cx="14" cy="17" rx="11" ry="8" />
          {/* Ogon */}
          <path d="M25,17 Q31,11 29,18 Q27,25 25,18 Z" />
          {/* Oczy */}
          <circle cx="9"  cy="13" r="3"   fill={dim ? '#1a0000' : '#000'} />
          <circle cx="9"  cy="13" r="1.2" fill={dim ? s : '#cc6600'} />
          {/* Zęby */}
          <path d="M7,22 L9.5,26 L12,22 L14.5,26 L17,22"
            stroke={s} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}
