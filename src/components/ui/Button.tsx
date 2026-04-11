import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "danger"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", style, ...props }, ref) => {
    
    let btnStyle: React.CSSProperties = { ...style }
    
    if (variant === "default") {
      btnStyle.backgroundColor = 'var(--purple)'
      btnStyle.color = '#ffffff'
    } else if (variant === "outline") {
      btnStyle.borderColor = 'var(--border)'
      btnStyle.color = 'var(--muted)'
      btnStyle.backgroundColor = 'transparent'
    } else if (variant === "ghost") {
      btnStyle.color = 'var(--muted)'
      btnStyle.backgroundColor = 'transparent'
    }

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "hover:bg-[var(--purple-light)]": variant === "default",
            "border hover:border-[var(--purple)] hover:text-[var(--text)]": variant === "outline",
            "hover:bg-[var(--purple-dim)] hover:text-[var(--text)]": variant === "ghost",
            "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20": variant === "danger",
            "h-10 px-4 py-2": size === "default",
            "h-9 px-3": size === "sm",
            "h-11 px-8": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        style={btnStyle}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
