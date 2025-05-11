"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import { enUS } from "date-fns/locale"
import "react-day-picker/dist/style.css"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (<DayPicker
      locale={{ ...enUS, options: { weekStartsOn: 1 } }}
      className="p-4 rounded-md bg-white"
      showOutsideDays={showOutsideDays}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar"

export { Calendar }
