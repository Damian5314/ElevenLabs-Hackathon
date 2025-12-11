'use client';

import { Provider } from '@/types';
import { MapPin, Phone, Star, Clock } from 'lucide-react';

interface ProviderCardProps {
  provider: Provider;
  index: number;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

export default function ProviderCard({
  provider,
  index,
  isSelected,
  onClick,
  disabled,
}: ProviderCardProps) {
  const handleClick = () => {
    if (!disabled && onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-300
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isSelected
          ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
          : disabled
            ? 'border-gray-700 bg-gray-800/50'
            : 'border-gray-700 bg-gray-800/50 hover:border-emerald-500/50 hover:bg-gray-800'
        }
      `}
    >
      {/* Number badge */}
      <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
        {index + 1}
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl">{provider.image}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">{provider.name}</h3>
          <div className="flex items-center gap-1 text-yellow-400">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">{provider.rating}</span>
            <span className="text-gray-400 text-sm">({provider.reviewCount} reviews)</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-gray-300">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span className="truncate">{provider.address}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <Phone className="w-4 h-4 text-gray-500" />
          <span>{provider.phone}</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <Clock className="w-4 h-4" />
          <span>Volgende: {provider.nextAvailable}</span>
        </div>
      </div>

      {/* Specialties */}
      <div className="mt-3 flex flex-wrap gap-1">
        {provider.specialties.slice(0, 2).map((specialty, i) => (
          <span
            key={i}
            className="px-2 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300"
          >
            {specialty}
          </span>
        ))}
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </div>
  );
}
