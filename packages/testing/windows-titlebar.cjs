'use strict'

/** Supply the Windows caption strip the desktop shell normally provides. */
async function showWindowsTitlebar(page) {
  await page.evaluate(() => {
    const root = document.documentElement
    root.setAttribute('data-windows-titlebar', '')
    root.style.setProperty('--dsh-windows-titlebar-height', '40px')
    root.style.setProperty('--dsh-frame-top-clearance', '40px')
    Object.defineProperty(navigator, 'windowControlsOverlay', {
      configurable: true,
      value: Object.assign(new EventTarget(), {
        visible: true,
        getTitlebarAreaRect: () => new DOMRect(0, 0, window.innerWidth - 140, 40),
      }),
    })
  })
}

module.exports = { showWindowsTitlebar }
