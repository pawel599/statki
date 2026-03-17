// Typy i logika statków — definicje, walidacja rozmieszczenia

export type ShipType = 'carrier' | 'battleship' | 'cruiser' | 'destroyer'

export interface ShipDefinition {
  type: ShipType
  name: string
  size: number
  count: number
}

// Flota gracza zgodna z zasadami gry
export const SHIP_DEFINITIONS: ShipDefinition[] = [
  { type: 'carrier',    name: 'Lotniskowiec', size: 5, count: 1 },
  { type: 'battleship', name: 'Pancernik',    size: 4, count: 1 },
  { type: 'cruiser',    name: 'Krążownik',    size: 3, count: 2 },
  { type: 'destroyer',  name: 'Niszczyciel',  size: 2, count: 1 },
]

export interface PlacedShip {
  id: string
  type: ShipType
  size: number
  row: number
  col: number
  horizontal: boolean
}

// Zwraca listę komórek zajmowanych przez statek
export function getShipCells(ship: {
  row: number
  col: number
  size: number
  horizontal: boolean
}): { row: number; col: number }[] {
  return Array.from({ length: ship.size }, (_, i) => ({
    row: ship.horizontal ? ship.row : ship.row + i,
    col: ship.horizontal ? ship.col + i : ship.col,
  }))
}

// Sprawdza czy rozmieszczenie statku jest prawidłowe (granice + margines 1 pola od innych)
export function isValidPlacement(
  row: number,
  col: number,
  size: number,
  horizontal: boolean,
  placedShips: PlacedShip[],
): boolean {
  const cells = getShipCells({ row, col, size, horizontal })

  // Sprawdź granice planszy
  if (cells.some((c) => c.row < 0 || c.row >= 10 || c.col < 0 || c.col >= 10)) {
    return false
  }

  // Zbierz zajęte komórki z marginesem 1 pola od każdego statku
  const blocked = new Set<string>()
  for (const ship of placedShips) {
    for (const c of getShipCells(ship)) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          blocked.add(`${c.row + dr}-${c.col + dc}`)
        }
      }
    }
  }

  return cells.every((c) => !blocked.has(`${c.row}-${c.col}`))
}
