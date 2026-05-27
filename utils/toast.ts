'use client'

import { toast as sonnerToast } from 'sonner'

export const toast = {
    success: (msg: string, options?: any) => {
        try {
            sonnerToast.success(msg, options)
        } catch (e) {
            console.log('TOAST SUCCESS:', msg)
        }
    },
    error: (msg: string, options?: any) => {
        try {
            sonnerToast.error(msg, options)
        } catch (e) {
            console.error('TOAST ERROR:', msg)
        }
    },
    loading: (msg: string, options?: any) => {
        try {
            return sonnerToast.loading(msg, options)
        } catch (e) {
            console.log('TOAST LOADING:', msg)
            return undefined
        }
    },
    dismiss: (id?: string | number) => {
        try {
            sonnerToast.dismiss(id)
        } catch (e) {
            console.log('TOAST DISMISS')
        }
    }
}
