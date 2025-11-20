import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TimePickerProps {
  time?: string
  onTimeChange: (time: string) => void
  className?: string
}

export function TimePicker({ time, onTimeChange, className }: TimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(time || "")
  
  React.useEffect(() => {
    setInputValue(time || "")
  }, [time])
  
  // Generate time options from 10:00 to 22:00 (every 15 minutes)
  const generateTimeOptions = () => {
    const times: string[] = []
    for (let hour = 10; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        if (hour === 22 && minute > 0) break; // Stop at 22:00
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        times.push(timeString)
      }
    }
    return times
  }

  const timeOptions = generateTimeOptions()

  const handleTimeSelect = (selectedTime: string) => {
    setInputValue(selectedTime)
    onTimeChange(selectedTime)
    setOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    
    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
    if (timeRegex.test(value)) {
      onTimeChange(value)
    }
  }

  const handleInputBlur = () => {
    // Format the input if it's valid
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
    if (timeRegex.test(inputValue)) {
      const [hours, minutes] = inputValue.split(':')
      const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`
      setInputValue(formattedTime)
      onTimeChange(formattedTime)
    } else if (inputValue) {
      // Reset to previous valid value if invalid
      setInputValue(time || "")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder="HH:MM"
            className={cn("pr-10", className)}
            maxLength={5}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setOpen(!open)}
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <ScrollArea className="h-[280px]">
          <div className="p-2 pr-4">
            {timeOptions.map((timeOption) => (
              <button
                key={timeOption}
                onClick={() => handleTimeSelect(timeOption)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                  time === timeOption && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                )}
              >
                {timeOption}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
