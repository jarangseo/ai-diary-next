import { vi } from 'vitest'

type SocketCallback = (...args: unknown[]) => void

export function createMockSocket() {
  const listeners = new Map<string, SocketCallback[]>()

  const socket = {
    on: vi.fn((event: string, callback: SocketCallback) => {
      if (!listeners.has(event)) {
        listeners.set(event, [])
      }
      listeners.get(event)?.push(callback)
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
    simulateEvent: (event: string, ...args: unknown[]) => {
      listeners.get(event)?.forEach((callback) => callback(...args))
    },
  }

  return socket
}
