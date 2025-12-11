'use client';

import { TimeSlot } from '@/types';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedDate?: string;
  selectedTime?: string;
  onSelect?: (date: string, time: string) => void;
  onSlotClick?: (date: string, time: string) => void;
  disabled?: boolean;
}

export default function TimeSlotPicker({
  slots,
  selectedDate,
  selectedTime,
  onSelect,
  onSlotClick,
  disabled,
}: TimeSlotPickerProps) {
  const handleClick = (date: string, time: string) => {
    if (disabled) return;
    if (onSlotClick) {
      onSlotClick(date, time);
    } else if (onSelect) {
      onSelect(date, time);
    }
  };
  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    };
    return date.toLocaleDateString('nl-NL', options);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Beschikbare tijden</h3>

      <div className="space-y-3">
        {slots.slice(0, 3).map((day) => (
          <div key={day.date} className="bg-gray-800/50 rounded-xl p-3">
            <div className="text-sm font-medium text-emerald-400 mb-2">
              {formatDate(day.date)}
            </div>
            <div className="flex flex-wrap gap-2">
              {day.slots.map((time) => {
                const isSelected = selectedDate === day.date && selectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => handleClick(day.date, time)}
                    disabled={disabled}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                      ${isSelected
                        ? 'bg-emerald-500 text-white'
                        : disabled
                          ? 'bg-gray-700 text-gray-400'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }
                    `}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        Zeg een tijd zoals "morgen om 10 uur" of klik op een tijd hierboven
      </p>
    </div>
  );
}
