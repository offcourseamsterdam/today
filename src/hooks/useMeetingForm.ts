import { useState, useEffect } from 'react'
import { EMPTY_RULE_STATE, type RecurrenceFormState } from '../components/ui/RecurrenceFrequencyPicker'
import { buildRule } from '../lib/recurrence'
import type { Meeting, AgendaItem } from '../types'

export interface MeetingFormState {
  title: string
  date: string
  time: string
  durationMinutes: number
  location: string
  agendaItems: AgendaItem[]
  context: string
  projectId: string
  isRecurring: boolean
  ruleState: RecurrenceFormState
  language: 'auto' | 'nl' | 'en'
}

export interface MeetingFormActions {
  setTitle: (v: string) => void
  setDate: (v: string) => void
  setTime: (v: string) => void
  setDurationMinutes: (v: number) => void
  setLocation: (v: string) => void
  setAgendaItems: (v: AgendaItem[] | ((prev: AgendaItem[]) => AgendaItem[])) => void
  setContext: (v: string) => void
  setProjectId: (v: string) => void
  setIsRecurring: (v: boolean) => void
  setRuleState: (v: RecurrenceFormState | ((prev: RecurrenceFormState) => RecurrenceFormState)) => void
  setLanguage: (v: 'auto' | 'nl' | 'en') => void
}

export function useMeetingForm(
  openMeetingId: string | null,
  isNew: boolean,
  existingMeeting: Meeting | null | undefined,
) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [durationMinutes, setDurationMinutes] = useState(30)
  const [location, setLocation] = useState('')
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [context, setContext] = useState('')
  const [projectId, setProjectId] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [ruleState, setRuleState] = useState<RecurrenceFormState>(EMPTY_RULE_STATE)
  const [language, setLanguage] = useState<'auto' | 'nl' | 'en'>('auto')

  // Reset/populate form when modal opens
  useEffect(() => {
    if (isNew) {
      setTitle('')
      setDate('')
      setTime('09:00')
      setDurationMinutes(30)
      setLocation('')
      setAgendaItems([])
      setContext('')
      setProjectId('')
      setIsRecurring(false)
      setRuleState(EMPTY_RULE_STATE)
      setLanguage('auto')
    } else if (existingMeeting) {
      setTitle(existingMeeting.title)
      setDate(existingMeeting.date ?? '')
      setTime(existingMeeting.time)
      setDurationMinutes(existingMeeting.durationMinutes)
      setLocation(existingMeeting.location ?? '')
      setAgendaItems(existingMeeting.agendaItems ?? [])
      setContext(existingMeeting.context ?? '')
      setProjectId(existingMeeting.projectId ?? '')
      setLanguage(existingMeeting.language ?? 'auto')
      setIsRecurring(existingMeeting.isRecurring)
      if (existingMeeting.recurrenceRule) {
        const r = existingMeeting.recurrenceRule
        setRuleState({
          freq: r.frequency,
          weeklyDay: r.customDays?.[0] ?? 1,
          monthlyDate: r.monthlyDate ?? 1,
          monthlyWeek: r.monthlyWeekday?.week ?? 1,
          monthlyDay: r.monthlyWeekday?.day ?? 1,
          customDays: r.customDays ?? [],
          annualDates: r.annualDates ?? [],
        })
      } else {
        setRuleState(EMPTY_RULE_STATE)
      }
    }
  }, [openMeetingId]) // eslint-disable-line react-hooks/exhaustive-deps

  function buildMeetingData(): Omit<Meeting, 'id' | 'createdAt'> {
    return {
      title: title.trim(),
      date: date || undefined,
      time,
      durationMinutes,
      location: location.trim() || undefined,
      agendaItems: isRecurring ? undefined : (agendaItems.length > 0 ? agendaItems : undefined),
      context: context.trim() || undefined,
      projectId: projectId || undefined,
      isRecurring,
      recurrenceRule: isRecurring ? buildRule(ruleState) : undefined,
      language: language !== 'auto' ? language : undefined,
    }
  }

  const form: MeetingFormState = {
    title, date, time, durationMinutes, location,
    agendaItems, context, projectId, isRecurring, ruleState, language,
  }

  const actions: MeetingFormActions = {
    setTitle, setDate, setTime, setDurationMinutes, setLocation,
    setAgendaItems, setContext, setProjectId, setIsRecurring, setRuleState, setLanguage,
  }

  const isValid = title.trim().length > 0 && (!isRecurring || projectId.length > 0)

  return { form, actions, buildMeetingData, isValid }
}
