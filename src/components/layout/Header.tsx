"use client"

import * as React from "react"
import { Menu } from "lucide-react"

interface HeaderProps {
  title: string
  userName: string
  userEmail: string
  onMenuClick?: () => void
}

export function Header({ title, userName, userEmail, onMenuClick }: HeaderProps) {
  return (
    <header 
      className="sticky top-0 z-40 flex h-16 w-full items-center justify-between px-8 border-b"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button onClick={onMenuClick} className="block md:hidden hover:opacity-80 transition" style={{ color: 'var(--muted)' }}>
            <Menu className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{title}</h1>
      </div>
      <div className="flex items-center gap-4 hidden md:flex">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{userName}</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{userEmail}</span>
        </div>
        <div 
          className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: 'var(--purple)' }}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
