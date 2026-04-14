import { createContext, useContext } from 'react'

export const VandaagDarkContext = createContext(false)
export const useVandaagDark = () => useContext(VandaagDarkContext)
