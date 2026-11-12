#!/usr/bin/env node
/**
 * wallpaper.cjs — the reader's own wallpaper on the real host (D84).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * The file goes through the host half's route, the way the settings page's
 * picker sends it, and the source is switched on by its own control: the layer
 * must then stand under the shell, the sidebar column must give up its fill, and
 * the canvas veil must be painted over the layer at the stored visibility.
 * Switching the source off takes the layer away again, and the file is removed
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

/** What the page paints for the layer and the shell it should stand down. */
const readPage = (page) => page.evaluate(() => {
  const layer = document.querySelector('[data-dsh-deepcraft-wallpaper-layer]')
  const media = layer === null ? null : layer.firstElementChild
  const column = document.querySelector('[data-dsh-deepcraft-part~="sidebar-column"]')
  const veil = getComputedStyle(document.body, '::after')
  return {
    attribute: document.body.getAttribute('data-dsh-deepcraft-wallpaper'),
    layer: layer !== null,
    tag: media === null ? null : media.tagName.toLowerCase(),
    src: media === null ? null : (media.getAttribute('src') ?? ''),
    columnFill: column === null ? null : getComputedStyle(column).backgroundColor,
    // The veil is a colour over the layer (the rule writes the `background`
    // shorthand), so its own background-colour is what says it is painted.
    veil: veil.backgroundColor,
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
        await page.waitForFunction(() => document.querySelector('[data-dsh-deepcraft-wallpaper-layer]') !== null, undefined, { timeout: 15000 }).catch(() => {})
        read.on = await readPage(page)
        await pickSource(page, SKIN.off)
        await page.waitForTimeout(500)
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
        check('来源开到自定义后，层挂在页面底层，画的是这份文件',
          read.on?.attribute === 'custom' && read.on?.layer === true && read.on?.tag === 'img' && (read.on?.src ?? '').includes(ROUTES.file),
          JSON.stringify(read.on)),
        check('层在时侧栏列让出填充，画布面纱盖在层上',
          read.on?.columnFill === 'rgba(0, 0, 0, 0)' && read.on?.veil !== 'rgba(0, 0, 0, 0)',
          JSON.stringify({ columnFill: read.on?.columnFill, veil: read.on?.veil })),
        check('来源关掉后层从页面上撤走', read.off?.attribute === 'off' && read.off?.layer === false, JSON.stringify(read.off)),
        check('移除之后状态里没有壁纸', read.removed?.ok === true && read.removed?.wallpaper === null, JSON.stringify(read.removed)),
        check('控制台没有异常', problems.length === 0, problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { wallpaperScenario }
