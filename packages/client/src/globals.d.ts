/**
 * Browser and host additions the TypeScript DOM library does not declare.
 */

/** The Window Controls Overlay API (Chromium): the caption buttons' box on the Windows desktop shell */
interface WindowControlsOverlay extends EventTarget {
  readonly visible: boolean
  getTitlebarAreaRect(): DOMRect
}

interface Navigator {
  readonly windowControlsOverlay?: WindowControlsOverlay
}

interface Window {
  /** The host's boot manifest: every client entry the loader will evaluate (the page-owner verdict reads ds-bot's entry here, D81). */
  readonly __DSH_BOOT__?: { entries?: unknown }
  /** ds-bot's registry, present while its browser half runs (the page-owner verdict reads only its presence, D81). */
  readonly dshBot?: unknown
}

/** Additions this skin puts on the global scope. */
declare var __dshStepDisplay: { set: (mode: 'compact' | 'standard' | 'detailed' | 'verbose') => Promise<boolean>, read: () => string } | undefined

interface HTMLScriptElement {
  /**
   * What a feature chunk's script hands back (D72): the chunk's factory, set
   * on its own script element while it runs. It is called with the `require`
   * that resolves the modules the chunk shares with the bundle.
   */
  __dshChunk?: (require: (id: string) => unknown) => { install?: unknown }
}

interface KeyboardEvent {
  /** Set on the Escape the skin dispatches to the host's own menu; the skin's key route skips it. */
  __dshHostMenuEscape?: boolean
}
