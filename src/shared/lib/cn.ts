import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Склейка классов с разрешением конфликтов Tailwind (тз.md:78). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
