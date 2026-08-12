"use client"

import { createContext, useContext, useState } from "react"

interface MenuContextValue {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

const MenuContext = createContext<MenuContextValue>({
  isOpen: false,
  setOpen: () => {},
})

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  return <MenuContext.Provider value={{ isOpen, setOpen: setIsOpen }}>{children}</MenuContext.Provider>
}

export const useMenu = () => useContext(MenuContext)
