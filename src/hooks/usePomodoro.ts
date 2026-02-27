import { useState, useEffect, useRef, useCallback } from 'react'

interface UsePomodoroOptions {
  workMinutes: number
  breakMinutes: number
  /** If true, timer starts running immediately on mount */
  autoStart?: boolean
}

interface UsePomodoroReturn {
  secondsLeft: number
  isRunning: boolean
  isBreak: boolean
  sessionsCompleted: number
  /** 0→1 progress through the current phase */
  progress: number
  minutes: number
  seconds: number
  play: () => void
  pause: () => void
  reset: () => void
  toggle: () => void
}

export function usePomodoro({
  workMinutes,
  breakMinutes,
  autoStart = false,
}: UsePomodoroOptions): UsePomodoroReturn {
  const [secondsLeft, setSecondsLeft] = useState(workMinutes * 60)
  const [isRunning, setIsRunning] = useState(autoStart)
  const [isBreak, setIsBreak] = useState(false)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Keep latest phase/duration values in refs so the interval callback always
  // reads fresh data without needing them in the effect dependency array.
  // This prevents the interval from restarting on every phase flip.
  const isBreakRef = useRef(isBreak)
  const workMinutesRef = useRef(workMinutes)
  const breakMinutesRef = useRef(breakMinutes)
  isBreakRef.current = isBreak
  workMinutesRef.current = workMinutes
  breakMinutesRef.current = breakMinutes

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
  }, [])

  useEffect(() => {
    if (!isRunning) return

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          stop()
          if (!isBreakRef.current) {
            setSessionsCompleted(s => s + 1)
            setIsBreak(true)
            return breakMinutesRef.current * 60
          } else {
            setIsBreak(false)
            return workMinutesRef.current * 60
          }
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isRunning, stop])

  const totalSeconds = isBreak ? breakMinutes * 60 : workMinutes * 60
  const progress = 1 - secondsLeft / totalSeconds
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  const play = useCallback(() => setIsRunning(true), [])
  const pause = useCallback(() => stop(), [stop])

  const reset = useCallback(() => {
    stop()
    setIsBreak(false)
    setSecondsLeft(workMinutes * 60)
  }, [stop, workMinutes])

  const toggle = useCallback(() => {
    if (isRunning) {
      stop()
    } else {
      setIsRunning(true)
    }
  }, [isRunning, stop])

  return {
    secondsLeft,
    isRunning,
    isBreak,
    sessionsCompleted,
    progress,
    minutes,
    seconds,
    play,
    pause,
    reset,
    toggle,
  }
}
