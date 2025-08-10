import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined, formatString = 'PPP'): string {
  if (!date) {
    return 'N/A';
  }
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return format(dateObj, formatString);
  } catch (error) {
    return 'Invalid Date';
  }
}

export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  let videoId = null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === 'youtu.be') {
      videoId = urlObj.pathname.slice(1);
    } else if (urlObj.hostname.includes('youtube.com')) {
      videoId = urlObj.searchParams.get('v');
    }
  } catch (error) {
    // Not a valid URL
    return null;
  }
  return videoId;
}

/**
 * Sanitizes user input to prevent XSS attacks
 * @param input String to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validates an email address format
 * @param email Email to validate
 * @returns Boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validates a URL format
 * @param url URL to validate
 * @returns Boolean indicating if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Securely stores sensitive data in localStorage with encryption
 * @param key Storage key
 * @param value Value to store
 */
export function secureStore(key: string, value: string): void {
  // Simple XOR encryption with a session key (not production-grade encryption)
  // For production, use a proper encryption library
  const sessionKey = sessionStorage.getItem('encryptionKey') || 
    (() => {
      const newKey = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('encryptionKey', newKey);
      return newKey;
    })();
  
  // Simple XOR encryption
  const encrypted = Array.from(value).map((char, i) => 
    String.fromCharCode(char.charCodeAt(0) ^ sessionKey.charCodeAt(i % sessionKey.length))
  ).join('');
  
  localStorage.setItem(key, btoa(encrypted));
}

/**
 * Retrieves securely stored data from localStorage
 * @param key Storage key
 * @returns Decrypted value or null if not found
 */
export function secureRetrieve(key: string): string | null {
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;
  
  const sessionKey = sessionStorage.getItem('encryptionKey');
  if (!sessionKey) return null;
  
  try {
    const decoded = atob(encrypted);
    return Array.from(decoded).map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ sessionKey.charCodeAt(i % sessionKey.length))
    ).join('');
  } catch (e) {
    return null;
  }
}

// Format date as relative time (e.g. "2 hours ago")
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  // For older dates, fall back to standard date format
  return formatDate(dateString);
}
