#!/usr/bin/env node
/**
 * wallpaper.cjs — the reader's own wallpaper on the real host (D84).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * The file goes through the host half's route, the way the settings page's
 * picker sends it, and the source is switched on by its own control: an image
 * paints into the document element's canvas background (theme/wallpaper.css),
 * the sidebar column must give up its fill, and the canvas veil must ride over
 * the image as the gradient's colour at the stored visibility. Switching the
 * source off takes the canvas back to plain colour, and the file is removed
 * before the scenario ends so the home the next scenario boots on carries none.
 */
'use strict'
const { openSkinSettings } = require('./settings-route.cjs')
const { uploadPng } = require('./media-fixture.cjs')

/** The routes under test (packages/contracts/src/routes.ts). */
const ROUTES = {
  status: '/dsh-deepcraft/wallpaper',
  file: '/dsh-deepcraft/wallpaper/file',
}

/** The settings page's own labels, in either interface language. */
const SKIN = {
  appearance: /^(外观|Appearance)$/,
  rowTitle: /^(壁纸|Wallpaper)$/,
  custom: /^(自定义|Custom)$/,
  off: /^(关闭|Off)$/,
}

/** Open the Appearance tab and press one of the wallpaper source's two choices. */
async function pickSource(page, choice) {
  await openSkinSettings(page)
  await page.locator('.dsh-deepcraft-settings-tabs [role="tab"]').filter({ hasText: SKIN.appearance }).first().click()
  await page.waitForTimeout(400)
  const row = page.locator('.dsh-deepcraft-settings-row')
    .filter({ has: page.locator('.dsh-deepcraft-settings-row-title').filter({ hasText: SKIN.rowTitle }) }).first()
  await row.getByRole('button', { name: choice }).click()
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
}

/** What the page paints for the wallpaper and the shell it should stand down. */
const readPage = (page) => page.evaluate(() => {
  const html = document.documentElement
  const style = getComputedStyle(html)
  const column = document.querySelector('[data-dsh-deepcraft-part~="sidebar-column"]')
  const root = document.querySelector('#root')
  const pane = document.querySelector('[data-pane="conversation"]')
  return {
    attribute: document.body.getAttribute('data-dsh-deepcraft-wallpaper'),
    mount: html.getAttribute('data-dsh-deepcraft-wallpaper-mount'),
    image: style.getPropertyValue('--dsh-deepcraft-wallpaper-image').trim(),
    // The veil rides the image as the html canvas's gradient layer.
    painted: style.backgroundImage,
    columnFill: column === null ? null : getComputedStyle(column).backgroundColor,
    // The skin's own canvas rules gate out under a wallpaper: an opaque fill
    // left on #root or the conversation pane covers the painted canvas.
    rootFill: root === null ? null : getComputedStyle(root).backgroundColor,
    paneFill: pane === null ? null : getComputedStyle(pane).backgroundColor,
    veil: style.getPropertyValue('--dsh-deepcraft-wallpaper-veil').trim(),
  }
})

function wallpaperScenario({ check }) {
  const read = {}
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend({ page }) {
      try {
        read.upload = await uploadPng(page, ROUTES.file)
        read.status = await page.evaluate(async (route) => (await fetch(route)).json(), ROUTES.status)
        await pickSource(page, SKIN.custom)
        await page.waitForFunction(() => document.documentElement.getAttribute('data-dsh-deepcraft-wallpaper-mount') === 'image', undefined, { timeout: 15000 }).catch(() => {})
        read.on = await readPage(page)
        await pickSource(page, SKIN.off)
        await page.waitForFunction(() => document.body.getAttribute('data-dsh-deepcraft-wallpaper') === 'off', undefined, { timeout: 15000 }).catch(() => {})
        await page.waitForTimeout(300)
        read.off = await readPage(page)
      } finally {
        read.removed = await page.evaluate(async (route) => {
          await fetch(route, { method: 'DELETE' })
          return (await fetch('/dsh-deepcraft/wallpaper')).json()
        }, ROUTES.file)
      }
    },
    async assert({ session }) {
      const problems = session.problems.filter((line) => !/Failed to load resource/.test(line))
      return [
        check('文件按自己的类型存进宿主半边，状态里带类型与版本',
          read.upload.status === 200 && read.status?.wallpaper?.type === 'image/png' && typeof read.status?.wallpaper?.version === 'string',
          JSON.stringify({ upload: read.upload.status, status: read.status })),
        check('来源开到自定义后，画布底层画的是这份文件',
          read.on?.attribute === 'custom' && read.on?.mount === 'image' && (read.on?.image ?? '').includes(ROUTES.file) && (read.on?.painted ?? 'none') !== 'none',
          JSON.stringify(read.on)),
        check('壁纸在时侧栏列、页面根与会话面板都让出填充，画布面纱盖在图上',
          read.on?.columnFill === 'rgba(0, 0, 0, 0)' && (read.on?.rootFill === 'rgba(0, 0, 0, 0)' || read.on?.rootFill === 'transparent') && (read.on?.paneFill === 'rgba(0, 0, 0, 0)' || read.on?.paneFill === 'transparent' || read.on?.paneFill === null) && (read.on?.painted ?? '').includes('linear-gradient') && read.on?.veil !== '' && read.on?.veil !== 'transparent',
          JSON.stringify({ columnFill: read.on?.columnFill, rootFill: read.on?.rootFill, paneFill: read.on?.paneFill, painted: read.on?.painted, veil: read.on?.veil })),
        check('来源关掉后画布回到纯色', read.off?.attribute === 'off' && read.off?.mount === null, JSON.stringify(read.off)),
        check('移除之后状态里没有壁纸', read.removed?.ok === true && read.removed?.wallpaper === null, JSON.stringify(read.removed)),
        check('控制台没有异常', problems.length === 0, problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { wallpaperScenario }
