import { QUIET_ATTR, WALLPAPER_BUILTIN, WALLPAPER_MEDIA_ATTR, WALLPAPER_MOUNT_ATTR, WALLPAPER_MOTION_DYNAMIC } from '../../constants'
import { PALETTE_HOST } from '@dsh-deepcraft/contracts/prefs'
import { WALLPAPERS } from 'virtual:dsh-deepcraft/generated'
import { motionReduced, readPrefs, subscribePrefs } from '../../core/prefs'
import { loadWallpaper, readWallpaper, subscribeWallpaper } from '../../shared/custom-wallpaper'
import { subscribeMutations } from '@dsh-deepcraft/engine/bus'
import type { WallpaperFile } from '../../shared/custom-wallpaper'
import type { HostContext } from '@dsh-deepcraft/engine/host'
import type { FeatureUi } from '../../core/feature'
import type manifest from './wallpaper.manifest'

/**
 * On the layer element itself: the stylesheets key on it, and the shared
 * scheduler ignores mutations against it (D40). The mount and media
 * attributes mark where the wallpaper paints: an image goes onto the
 * document element's canvas background, a video keeps the body's own layer.
 */
const LAYER_ATTR = 'data-dsh-deepcraft-wallpaper-layer'

/** The canvas veil over the wallpaper, as a colour-mix answer painted into the html background. */
const VEIL_PROPERTY = '--dsh-deepcraft-wallpaper-veil'
/** The media answer, as a CSS url() painted into the html background under the veil. */
const IMAGE_PROPERTY = '--dsh-deepcraft-wallpaper-image'

/**
 * The reader's wallpaper paints under the whole shell. An image rides the
 * document element's canvas background (`html[data-dsh-deepcraft-wallpaper-mount="image"]`,
 * theme/wallpaper.css): the canvas layer is below everything by construction,
 * so nothing in the shell can stand between it and the veil — a negative
 * z-index child of the body, which the desktop compositor drops below the
 * document canvas entirely, cannot make that promise. The veil the reader
 * dials in with `wallpaperVisibility` sits in the same background as a
 * gradient layer above the image, and `wallpaperBlur` is baked into a canvas
 * copy of the file since a background cannot be filtered alone.
 *
 * A video cannot be a background: it keeps the body's own layer at z-index -1,
 * and `data-dsh-deepcraft-wallpaper-media="video"` gates the stylesheet's
 * body::after veil to it alone, so an image is never dimmed twice.
 *
 * It installs while `wallpaperSource` is `custom` or `builtin` (the manifest's
 * live switch, D72); both surfaces stay bare while the host half holds no
 * file, no bundled pick is stored, or the palette follows the host (the
 * stylesheet's own gates paint nothing then either).
 */
export function install(_ctx: HostContext, _ui: FeatureUi<typeof manifest>) {
  const layer = document.createElement('div')
  layer.setAttribute(LAYER_ATTR, '')
  layer.setAttribute(QUIET_ATTR, '')
  let video: HTMLVideoElement | null = null
  let current: WallpaperFile | null = null
  let mounted = false
  let dead = false
  let lastSource: string | null = null
  let paintedKey: string | null = null
  let paintedUrl: string | null = null
  let paintSeq = 0

  /** Whether the video plays right now: the reader's choices plus the page's own visibility. */
  const plays = () =>
    current?.state.video === true
      && readPrefs().wallpaperMotion === WALLPAPER_MOTION_DYNAMIC
      && !readPrefs().wallpaperLite
      && !motionReduced()
      && document.visibilityState === 'visible'

  /** The media the layer paints: the bundled pick while the source is `builtin`, the reader's own file otherwise. */
  const currentFile = (): WallpaperFile | null => {
    const prefs = readPrefs()
    if (prefs.wallpaperSource === WALLPAPER_BUILTIN) {
      const wallpaper = WALLPAPERS[prefs.wallpaperBuiltinId]
      if (wallpaper === undefined) return null
      return { state: { type: wallpaper.video ? 'video/mp4' : 'image/webp', version: wallpaper.url, video: wallpaper.video }, url: wallpaper.url }
    }
    return readWallpaper()
  }

  /** One amount as the document carries it right now — a slider's draft custom property outranks the stored preference. */
  const wallpaperAmount = (name: string, fallback: number) => {
    const parsed = Number.parseFloat(getComputedStyle(document.body).getPropertyValue(name))
    return Number.isFinite(parsed) ? parsed : fallback
  }

  /** The veil colour the stylesheet's gradient layer paints over the html image (theme/wallpaper.css's math). */
  const veilColor = () => {
    const prefs = readPrefs()
    const canvas = getComputedStyle(document.body).getPropertyValue('--dsh-deepcraft-canvas').trim() || 'transparent'
    const visibility = wallpaperAmount('--dsh-deepcraft-wallpaper-visibility', prefs.wallpaperVisibility)
    const cap = prefs.wallpaperLite ? Math.min(visibility, 0.6) : Math.min(visibility, 1)
    return `color-mix(in srgb, ${canvas} ${(1 - cap) * 100}%, transparent)`
  }

  /** A blur is baked into a bitmap copy: a background image cannot be filtered alone. */
  const blurToUrl = (file: WallpaperFile, blur: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          if (ctx === null) throw new Error('canvas 2d unavailable')
          // The sheet's filter reads CSS pixels; the bitmap's equivalent grows
          // with the natural size against the painted size.
          ctx.filter = `blur(${blur * (img.naturalWidth / Math.max(window.innerWidth, 1))}px)`
          ctx.drawImage(img, 0, 0)
          canvas.toBlob(blob => {
            if (blob === null) reject(new Error('canvas toBlob returned null'))
            else resolve(URL.createObjectURL(blob))
          }, 'image/webp')
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }
      img.onerror = () => reject(new Error('wallpaper image failed to decode'))
      img.src = file.url
    })

  /** Take both wallpaper surfaces down: the html canvas and the body's video layer. */
  const clearSurfaces = () => {
    document.documentElement.removeAttribute(WALLPAPER_MOUNT_ATTR)
    document.documentElement.style.removeProperty(IMAGE_PROPERTY)
    document.documentElement.style.removeProperty(VEIL_PROPERTY)
    document.body.removeAttribute(WALLPAPER_MEDIA_ATTR)
    if (paintedUrl !== null) {
      URL.revokeObjectURL(paintedUrl)
      paintedUrl = null
    }
    paintedKey = null
    if (mounted) {
      // A detached video keeps decoding unless it is told to stop.
      if (video !== null) video.pause()
      layer.remove()
      mounted = false
    }
  }

  /**
   * Paint an image into the document canvas. The mount attribute, the veil and
   * the image go on together each sync, so a visibility or canvas-colour change
   * under the same file still repaints.
   */
  const paintImage = (file: WallpaperFile) => {
    const prefs = readPrefs()
    const blur = wallpaperAmount('--dsh-deepcraft-wallpaper-blur', prefs.wallpaperBlur)
    const key = `${file.state.version}\t${blur}\t${prefs.wallpaperLite}`
    document.documentElement.style.setProperty(VEIL_PROPERTY, veilColor())
    if (key !== paintedKey) {
      paintedKey = key
      const seq = ++paintSeq
      const urlPromise = blur > 0 && !prefs.wallpaperLite
        ? blurToUrl(file, blur)
        : Promise.resolve(file.url)
      void urlPromise.then(url => {
        if (dead || seq !== paintSeq || paintedKey !== key) {
          if (url.startsWith('blob:')) URL.revokeObjectURL(url)
          return
        }
        if (paintedUrl !== null) URL.revokeObjectURL(paintedUrl)
        paintedUrl = url.startsWith('blob:') ? url : null
        document.documentElement.style.setProperty(IMAGE_PROPERTY, `url("${url.replace(/["\\]/g, '\\$&')}")`)
        document.documentElement.setAttribute(WALLPAPER_MOUNT_ATTR, 'image')
      }, () => {
        // A blur pass that fails or a file that cannot decode leaves the page
        // without wallpaper rather than a broken half-state (D12).
        if (seq === paintSeq) {
          paintedKey = null
          document.documentElement.style.removeProperty(IMAGE_PROPERTY)
          document.documentElement.removeAttribute(WALLPAPER_MOUNT_ATTR)
        }
      })
    }
  }

  const sync = () => {
    if (dead) return
    const prefs = readPrefs()
    // The feature stays installed across the builtin↔custom switch, so the
    // cached answer can predate a file dropped through the file route: a
    // switch into `custom` re-reads the host half once.
    if (prefs.wallpaperSource !== lastSource) {
      lastSource = prefs.wallpaperSource
      if (prefs.wallpaperSource !== WALLPAPER_BUILTIN) {
        void loadWallpaper(true).then(sync)
        return
      }
    }
    current = currentFile()
    const mountsVideo = current !== null && current.state.video === true && prefs.palette !== PALETTE_HOST
    document.body.setAttribute(WALLPAPER_MEDIA_ATTR, mountsVideo ? 'video' : '')
    if (current === null || prefs.palette === PALETTE_HOST) {
      clearSurfaces()
      return
    }
    if (current.state.video === true) {
      document.documentElement.removeAttribute(WALLPAPER_MOUNT_ATTR)
      document.documentElement.style.removeProperty(IMAGE_PROPERTY)
      document.documentElement.style.removeProperty(VEIL_PROPERTY)
      if (paintedUrl !== null) {
        URL.revokeObjectURL(paintedUrl)
        paintedUrl = null
      }
      paintedKey = null
      if (video === null) {
        video = document.createElement('video')
        layer.replaceChildren(video)
      }
      if (video.getAttribute('src') !== current.url) {
        video.muted = true
        video.loop = true
        video.setAttribute('playsinline', '')
        video.src = current.url
        video.load()
      }
      if (!mounted) {
        document.body.appendChild(layer)
        mounted = true
      }
      if (plays()) {
        // Autoplay can still be refused before the first gesture; the video
        // stays on its first frame, and the next state change tries again.
        void video.play().catch(() => undefined)
      } else {
        video.pause()
      }
      return
    }
    if (video !== null) {
      video.pause()
      video = null
      layer.replaceChildren()
    }
    if (mounted) {
      layer.remove()
      mounted = false
    }
    paintImage(current)
  }

  const offWallpaper = subscribeWallpaper(sync)
  const offPrefs = subscribePrefs(sync)
  const onVisibility = () => sync()
  document.addEventListener('visibilitychange', onVisibility)
  // The amount sliders preview through the body's own custom properties
  // before their preference lands; an image's veil and blurred bitmap are
  // baked from the stored value, so a live draft must repaint them itself.
  const offDraft = subscribeMutations(document.body, {
    attributes: true,
    attributeFilter: ['style'],
    attributeOldValue: true,
  }, records => {
    if (records.some(record => {
      const before = record.oldValue ?? ''
      const after = document.body.getAttribute('style') ?? ''
      const pick = (style: string, name: string) => new RegExp(`${name}\\s*:\\s*([^;]+)`).exec(style)?.[1]?.trim() ?? ''
      return pick(before, '--dsh-deepcraft-wallpaper-visibility') !== pick(after, '--dsh-deepcraft-wallpaper-visibility')
        || pick(before, '--dsh-deepcraft-wallpaper-blur') !== pick(after, '--dsh-deepcraft-wallpaper-blur')
    })) sync()
  })
  // A fresh read: the feature installs and retires with the source switch, so a
  // "no file" cached by an earlier install must not outlive the file the reader
  // uploaded in between.
  void loadWallpaper(true).then(sync)

  return () => {
    dead = true
    paintSeq += 1
    offWallpaper()
    offPrefs()
    offDraft()
    document.removeEventListener('visibilitychange', onVisibility)
    if (video !== null) video.pause()
    clearSurfaces()
    layer.remove()
  }
}
