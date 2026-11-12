import { QUIET_ATTR, WALLPAPER_MOTION_DYNAMIC } from '../../constants'
import { motionReduced, readPrefs, subscribePrefs } from '../../core/prefs'
import { loadWallpaper, readWallpaper, subscribeWallpaper } from '../../shared/custom-wallpaper'
import type { WallpaperFile } from '../../shared/custom-wallpaper'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './wallpaper.manifest'

/**
 * On the layer element itself: the stylesheets key on it, and the shared
 * scheduler ignores mutations against it (D40).
 */
const LAYER_ATTR = 'data-dsh-deepcraft-wallpaper-layer'

/**
 * The reader's wallpaper: one fixed layer at the bottom of the body, under the
 * whole shell. The stylesheet's rules (theme/wallpaper.css) let the shell
 * stand down and paint the canvas veil over it; this module only keeps the
 * media element in step with the stored file and the reader's play choices.
 *
 * It installs while `wallpaperSource` is `custom` (the manifest's live switch,
 * D72); the layer itself shows nothing while the host half holds no file.
 */
export function install(_ctx: HostContext, _ui: FeatureUi<typeof manifest>) {
  const layer = document.createElement('div')
  layer.setAttribute(LAYER_ATTR, '')
  layer.setAttribute(QUIET_ATTR, '')
  let media: HTMLImageElement | HTMLVideoElement | null = null
  let current: WallpaperFile | null = null
  let mounted = false

  /** Whether the video plays right now: the reader's choices plus the page's own visibility. */
  const plays = () =>
    current?.state.video === true
      && readPrefs().wallpaperMotion === WALLPAPER_MOTION_DYNAMIC
      && !readPrefs().wallpaperLite
      && !motionReduced()
      && document.visibilityState === 'visible'

  const sync = () => {
    current = readWallpaper()
    if (current === null) {
      if (mounted) {
        layer.remove()
        mounted = false
      }
      return
    }
    const tag = current.state.video ? 'video' : 'img'
    if (media === null || media.tagName.toLowerCase() !== tag) {
      media?.remove()
      media = document.createElement(tag)
      layer.replaceChildren(media)
    }
    const url = current.url
    if (media instanceof HTMLVideoElement) {
      media.muted = true
      media.loop = true
      media.setAttribute('playsinline', '')
      if (media.getAttribute('src') !== url) {
        media.src = url
        media.load()
      }
    } else if (media instanceof HTMLImageElement && media.getAttribute('src') !== url) {
      media.src = url
      media.alt = ''
    }
    if (!mounted) {
      document.body.appendChild(layer)
      mounted = true
    }
    if (media instanceof HTMLVideoElement) {
      if (plays()) {
        // Autoplay can still be refused before the first gesture; the video
        // stays on its first frame, and the next state change tries again.
        void media.play().catch(() => undefined)
      } else {
        media.pause()
      }
    }
  }

  const offWallpaper = subscribeWallpaper(sync)
  const offPrefs = subscribePrefs(sync)
  const onVisibility = () => sync()
  document.addEventListener('visibilitychange', onVisibility)
  // A fresh read: the feature installs and retires with the source switch, so a
  // "no file" cached by an earlier install must not outlive the file the reader
  // uploaded in between.
  void loadWallpaper(true).then(sync)

  return () => {
    offWallpaper()
    offPrefs()
    document.removeEventListener('visibilitychange', onVisibility)
    if (media instanceof HTMLVideoElement) media.pause()
    layer.remove()
  }
}
