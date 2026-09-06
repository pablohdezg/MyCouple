/**
 * Puente con Capacitor. Todo va envuelto en try/catch para que la app
 * funcione igual en el navegador (PWA) que dentro del APK.
 */

let isNative: boolean | null = null

export function native(): boolean {
  if (isNative === null) {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
      .Capacitor
    isNative = !!cap?.isNativePlatform?.()
  }
  return isNative
}

type Style = 'light' | 'medium' | 'heavy'

export async function haptic(style: Style = 'light'): Promise<void> {
  try {
    if (native()) {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      const map = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      }
      await Haptics.impact({ style: map[style] })
    } else if (navigator.vibrate) {
      navigator.vibrate(style === 'heavy' ? 26 : style === 'medium' ? 16 : 8)
    }
  } catch {
    /* silencio */
  }
}

export async function applyStatusBar(dark: boolean, color: string): Promise<void> {
  if (!native()) return
  try {
    const { StatusBar, Style: SBStyle } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: dark ? SBStyle.Dark : SBStyle.Light })
    await StatusBar.setBackgroundColor({ color })
  } catch {
    /* silencio */
  }
}

export async function hideSplash(): Promise<void> {
  if (!native()) return
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen')
    await SplashScreen.hide()
  } catch {
    /* silencio */
  }
}

export async function onBackButton(handler: () => boolean): Promise<void> {
  if (!native()) return
  try {
    const { App } = await import('@capacitor/app')
    App.addListener('backButton', () => {
      const handled = handler()
      if (!handled) App.exitApp()
    })
  } catch {
    /* silencio */
  }
}

export async function onResume(handler: () => void): Promise<void> {
  try {
    if (native()) {
      const { App } = await import('@capacitor/app')
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) handler()
      })
    }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') handler()
    })
  } catch {
    /* silencio */
  }
}

export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (native()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const res = await LocalNotifications.requestPermissions()
      return res.display === 'granted'
    }
    if ('Notification' in window) {
      const p = await Notification.requestPermission()
      return p === 'granted'
    }
  } catch {
    /* silencio */
  }
  return false
}

export interface Reminder {
  id: number
  title: string
  body: string
  at: Date
}

/** Reprograma todos los recordatorios (borra los anteriores). */
export async function scheduleReminders(list: Reminder[]): Promise<void> {
  if (!native()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
    }
    const future = list.filter((r) => r.at.getTime() > Date.now()).slice(0, 60)
    if (!future.length) return
    await LocalNotifications.schedule({
      notifications: future.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        schedule: { at: r.at },
        smallIcon: 'ic_stat_icon',
      })),
    })
  } catch {
    /* silencio */
  }
}

/** Dispara una notificación local inmediata (no programada). */
export async function notifyNow(title: string, body: string, id?: number): Promise<void> {
  if (!native()) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    await LocalNotifications.schedule({
      notifications: [
        {
          id: id ?? Math.floor(Date.now() % 2147483000),
          title,
          body,
          smallIcon: 'ic_stat_icon',
        },
      ],
    })
  } catch {
    /* silencio */
  }
}

export async function share(text: string, title = 'Nuestro rincón'): Promise<void> {
  try {
    if (native()) {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title, text })
      return
    }
    if (navigator.share) {
      await navigator.share({ title, text })
      return
    }
    await navigator.clipboard.writeText(text)
  } catch {
    /* silencio */
  }
}
