import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  time?: string
  onTimeChange: (time: string) => void
  className?: string
}

export function TimePicker({ time, onTimeChange, className }: TimePickerProps) {
  const [inputValue, setInputValue] = React.useState(time || "")
  
  React.useEffect(() => {
    setInputValue(time || "")
  }, [time])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value
    // Keep only digits
    let value = raw.replace(/[^0-9]/g, "")

    // Auto-insert colon after 2 digits
    if (value.length > 2) {
      value = value.slice(0, 4) // max 4 digits before formatting
      value = `${value.slice(0, 2)}:${value.slice(2)}`
    }

    // If user deleted back to only hour (2 digits), remove colon
    if (value.length <= 2) {
      value = value.slice(0, 2)
    }

    setInputValue(value)

    // Validate time format HH:MM when full length
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/
    if (timeRegex.test(value)) {
      onTimeChange(value)
    }
  }

  const handleInputBlur = () => {
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/
    if (!inputValue) return

    if (timeRegex.test(inputValue)) {
      const [hours, minutes] = inputValue.split(":")
      const formattedTime = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`
      setInputValue(formattedTime)
      onTimeChange(formattedTime)
    } else {
      // Reset to previous valid value if invalid
      setInputValue(time || "")
    }
  }

  return (
    <Input
      value={inputValue}
      onChange={handleInputChange}
      onBlur={handleInputBlur}
      placeholder="HH:MM"
      className={cn(className)}
      maxLength={5}
    />
  )
}
