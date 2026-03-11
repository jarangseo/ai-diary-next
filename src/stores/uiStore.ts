import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiStore {
  isLnbOpen: boolean
  setIsLnbOpen: () => void
}

export const useUiStore = create<UiStore>()(
  persist(
    (set) => ({
      isLnbOpen: false,
      setIsLnbOpen: () => set((state) => ({ isLnbOpen: !state.isLnbOpen })),
    }),
    { name: 'ui-store' }
  )
)
