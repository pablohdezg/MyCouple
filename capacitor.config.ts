import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Actualizar la app sin generar un APK nuevo cada vez
 * ----------------------------------------------------
 * Por defecto, el APK lleva la web empotrada dentro (`webDir: 'dist'`):
 * fiable, funciona sin conexión desde el primer segundo, pero cualquier
 * cambio de código exige un APK nuevo.
 *
 * Si en vez de eso defines la variable de entorno CAP_REMOTE_URL apuntando
 * a una web publicada (por ejemplo, con GitHub Pages: ver
 * .github/workflows/pages.yml) ANTES de ejecutar "npx cap sync android",
 * la app cargará esa web en vez de la empotrada. A partir de ahí, para
 * publicar cambios sólo hace falta subir el código a GitHub: la web se
 * actualiza sola y el móvil la coge la próxima vez que abra la app con
 * conexión. No haría falta un APK nuevo salvo que cambie algo nativo
 * (permisos, plugins Java...), como el propio compartir ubicación.
 *
 * Es opcional: si no defines esa variable, todo sigue exactamente igual
 * que hasta ahora.
 */
const remoteUrl = process.env.CAP_REMOTE_URL

const config: CapacitorConfig = {
  appId: 'com.nuestrorincon.app',
  appName: 'MyCouple',
  webDir: 'dist',
  ...(remoteUrl
    ? { server: { url: remoteUrl, cleartext: false } }
    : {}),
  android: {
    allowMixedContent: false,
    backgroundColor: '#fff6f4',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 900,
      launchAutoHide: true,
      backgroundColor: '#fff6f4',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#e8567c',
    },
  },
}

export default config
