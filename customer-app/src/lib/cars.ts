// The customer's saved cars live in the account (/v1/me/cars); the store keeps the last loaded list for the screens.
import { api } from '@/lib/api'
import type { SavedCar } from '@/lib/types'
import { carPlate, parsePlate, useStore, type Car } from '@/store'

const fromDto = (c: SavedCar): Car => {
  const p = parsePlate(c.plate)
  return { id: c.id, b: c.brand, m: c.model, ps: p?.ps ?? '', pn: p?.pn ?? c.plate, def: c.isDefault }
}

/** Cars saved on the phone by earlier versions of the app (local ids like "c1759999999999"). */
const isLocal = (c: Car) => /^c\d+$/.test(c.id)

/** Loads the cars from the account. Cars still on the phone from an earlier version are uploaded once. */
export async function loadCars() {
  let list = await api.cars.list()
  const local = useStore.getState().cars.filter(isLocal)
  if (local.length && !list.length) {
    for (const c of local) await api.cars.create({ brand: c.b, model: c.m, plate: carPlate(c), isDefault: c.def })
    list = await api.cars.list()
  }
  useStore.getState().setCars(list.map(fromDto))
}

/** Adds (`id` null) or edits a car, then reloads the list. */
export async function saveCar(id: string | null, c: Omit<Car, 'id' | 'def'>) {
  const body = { brand: c.b, model: c.m, plate: carPlate(c) }
  await (id ? api.cars.update(id, body) : api.cars.create(body))
  await loadCars()
}

export async function deleteCar(id: string) {
  await api.cars.remove(id)
  await loadCars()
}
