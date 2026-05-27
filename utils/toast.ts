'use client'

import { toast as sonnerToast } from 'sonner'

// Stub in case sonner is not available or failing to load
export const toast = {
    success: (msg: string) => {
        try {
            sonnerToast.success(msg)
        } catch (e) {
            console.log('TOAST SUCCESS:', msg)
            // Fallback to alert or custom UI if needed
        }
    },
    error: (msg: string) => {
        try {
            sonnerToast.error(msg)
        } catch (e) {
            console.error('TOAST ERROR:', msg)
        }
    },
    loading: (msg: string) => {
        try {
            return sonnerToast.loading(msg)
        } catch (e) {
            console.log('TOAST LOADING:', msg)
        }
    }
}
