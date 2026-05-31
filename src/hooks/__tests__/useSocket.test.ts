import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSocket } from './mockSocket'
import { useSocket } from '../useSocket'

const mockSocket = createMockSocket()
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

describe('useSocket', () => {
  const defaultProps = {
    userId: 'user-1',
    userName: 'TestUser',
    roomId: 'room-1',
    onNewMessage: vi.fn(),
    onUserTyping: vi.fn(),
    onUserJoined: vi.fn(),
    onUserLeft: vi.fn(),
    onOnlineUsers: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should connect and join room on mount', () => {
    renderHook(() => useSocket(defaultProps))
    mockSocket.simulateEvent('connect')
    expect(mockSocket.emit).toHaveBeenCalledWith('join-room', 'room-1')
  })

  it('should call onNewMessage when new-message event received', () => {
    renderHook(() => useSocket(defaultProps))

    const message = {
      id: '1',
      userId: 'user-2',
      userName: 'Other',
      content: 'Hello',
      type: 'user',
      createdAt: new Date().toISOString(),
    }

    act(() => {
      mockSocket.simulateEvent('new-message', message)
    })

    expect(defaultProps.onNewMessage).toHaveBeenCalledWith(message)
  })

  it('should call onUserTyping when user-typing event received', () => {
    renderHook(() => useSocket(defaultProps))

    act(() => {
      mockSocket.simulateEvent('user-typing', 'OtherUser')
    })

    expect(defaultProps.onUserTyping).toHaveBeenCalledWith('OtherUser')
  })

  it('should call onUserJoined when user-joined event received', () => {
    renderHook(() => useSocket(defaultProps))

    const user = { id: 'user-2', name: 'NewUser' }

    act(() => {
      mockSocket.simulateEvent('user-joined', user)
    })

    expect(defaultProps.onUserJoined).toHaveBeenCalledWith(user)
  })

  it('should call onOnlineUsers when online-users event received', () => {
    renderHook(() => useSocket(defaultProps))

    const users = [
      { id: 'user-1', name: 'Me' },
      { id: 'user-2', name: 'Other' },
    ]

    act(() => {
      mockSocket.simulateEvent('online-users', users)
    })

    expect(defaultProps.onOnlineUsers).toHaveBeenCalledWith(users)
  })

  it('should emit send-message when sendMessage is called', () => {
    const { result } = renderHook(() => useSocket(defaultProps))

    act(() => {
      result.current.sendMessage('Hello!')
    })

    expect(mockSocket.emit).toHaveBeenCalledWith('send-message', {
      roomId: 'room-1',
      content: 'Hello!',
    })
  })

  it('should throttle emitTyping (emit once, ignore subsequent calls within 1s)', () => {
    const { result } = renderHook(() => useSocket(defaultProps))

    act(() => {
      result.current.emitTyping()
      result.current.emitTyping()
      result.current.emitTyping()
    })

    // user-typing should be emitted only once
    const typingCalls = mockSocket.emit.mock.calls.filter(
      ([event]) => event === 'user-typing'
    )
    expect(typingCalls).toHaveLength(1)
  })

  it('should disconnect socket on unmount', () => {
    const { unmount } = renderHook(() => useSocket(defaultProps))

    unmount()

    expect(mockSocket.disconnect).toHaveBeenCalled()
  })
})
