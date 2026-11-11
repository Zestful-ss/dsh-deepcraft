#!/usr/bin/env node
/**
 * conversation-styles.cjs — the reading layout on the real host: a conversation
 * style an earlier build stored must neither change the layout nor leave a
 * switch behind (D66).
 */
'use strict'
const path = require('node:path')
const { waitForSkin, dismissOverlays } = require('./dsh-web.cjs')
const { openSkinSettings, SETTINGS_PAGE } = require('./settings-route.cjs')
const { sanitizePage } = require('../../scripts/shared/privacy.cjs')

const STYLE_ATTRIBUTE = 'data-dsh-deepcraft-chat-style'
/** The conversation tab's rows, in the order it keeps them now. */
const CONVERSATION_ROWS = [
  /^(聊天区滚动动画|Chat-area scrolling animation)$/,
  /^(状态行动画|Waiting-line animation)$/,
  /^(精确状态行|Precise status line)$/,
  /^(对话导航|Conversation navigator)$/,
  /^(对话统计信息位置|Conversation statistics position)$/,
  /^(重绘标签条|Chat \/ Trajectory tabs)$/,
  /^(标题进入顶栏|Header in the title bar)$/,
]
const STYLE_ROW = /对话样式|Conversation style/
const HOME_CHOICES = {
  float: /^(浮层|Floating)$/,
  classic: /^(经典|Classic)$/,
  studio: /^(工作台|Studio)$/,
}

async function openConversationTab(page) {
  await openSkinSettings(page)
  const settings = page.locator(SETTINGS_PAGE).first()
  await settings.getByRole('tab', { name: /^(通用|General)$/ }).click()
  const username = settings.locator('.dsh-deepcraft-settings-row').filter({ hasText: /用户名|Username/ }).locator('input')
  await username.fill('Demo')
  await username.press('Enter')
  await settings.getByRole('tab', { name: /^(对话|Conversation)$/ }).click()
  return settings
}

async function readConversationRows(settingsPage) {
  // The tab the page just left is still on show for its slide, as a copy
  // without the tabpanel role (settings.ts); the role names the open one alone.
  return settingsPage.evaluate((selector) => {
    const panel = document.querySelector(`${selector} [role="tabpanel"]`)
    return panel === null ? [] : [...panel.querySelectorAll('.dsh-deepcraft-settings-row-title')]
      .map((node) => node.textContent.replace(/\s+/g, ' ').trim())
  }, SETTINGS_PAGE)
}

async function chooseHome(settingsPage, target, layout) {
  await settingsPage.bringToFront()
  const settings = settingsPage.locator(SETTINGS_PAGE).first()
  await settings.getByRole('tab', { name: /^(外观|Appearance)$/ }).click()
  const row = settings.locator('.dsh-deepcraft-settings-row').filter({ hasText: /首页版面|Home layout/ })
  await row.getByRole('button', { name: HOME_CHOICES[layout] }).click()
  await target.bringToFront()
  await target.waitForFunction((wanted) => document.body.getAttribute('data-dsh-deepcraft-home-layout') === wanted,
    layout === 'classic' ? null : layout, { timeout: 15000 })
  await settingsPage.bringToFront()
  await settings.getByRole('tab', { name: /^(对话|Conversation)$/ }).click()
}

async function readStyle(page, host) {
  // A viewport change on a page in the background is laid out when it comes
  // forward; reading before that shows the previous size's boxes.
  await page.bringToFront()
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await page.waitForTimeout(150)
  return page.evaluate(({ host, attribute }) => {
    const find = (selector) => document.querySelector(selector)
    const box = (node) => {
      if (node === null) return null
      const rect = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      return {
        left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height,
        shown: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden',
        over: node.scrollWidth - node.clientWidth,
      }
    }
    const card = find(host.composerCard)
    const input = find(host.composer)
    const flow = find(host.flow)
    const row = card?.querySelector('[data-dsh-deepcraft-part~="row"]') ?? null
    const trailing = row?.querySelector('[data-dsh-deepcraft-part~="trailing"]') ?? null
    const seat = find('[data-composer-seat]')
    const stack = card?.closest('[data-dsh-deepcraft-part~="composer-stack"]') ?? null
    const meter = find('[data-dsh-deepcraft-context-meter]')
    const dock = meter?.closest('[data-dsh-deepcraft-part~="composer-dock"]') ?? null
    const hero = find('[data-phase="hero"] [data-dsh-deepcraft-part~="composer-hero"]')
    return {
      style: document.body.getAttribute(attribute),
      width: innerWidth, height: innerHeight,
      input: box(input), card: box(card), row: box(row), trailing: box(trailing), seat: box(seat), stack: box(stack), dock: box(dock), flow: box(flow), hero: box(hero),
      meterRoom: trailing === null ? null : getComputedStyle(trailing).getPropertyValue('--dsh-deepcraft-meter-room').trim(),
      trailingMargin: trailing === null ? null : getComputedStyle(trailing).marginRight,
      heroMaxWidth: hero === null ? null : getComputedStyle(hero).maxWidth,
      headline: box(hero?.querySelector('[data-dsh-deepcraft-part~="hero-headline"]') ?? null),
      homeDeck: box(find('.dsh-deepcraft-home-float')),
      homePanel: box(find('[data-dsh-deepcraft-home-panel]')),
      model: box(find('.dsh-deepcraft-model-btn')),
      permission: box(find('.dsh-deepcraft-perm-btn')),
      effort: box(find('.dsh-deepcraft-effort-btn')),
      meter: box(meter),
      cardWidth: seat === null ? null : getComputedStyle(seat).getPropertyValue('--dsh-composer-card-max-width').trim(),
      text: flow?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    }
  }, { host, attribute: STYLE_ATTRIBUTE })
}

async function capture(page, out, label) {
  const dark = await page.evaluate(() => document.body.hasAttribute('data-ds-dark-theme'))
  for (const scheme of ['light', 'dark']) {
    await page.evaluate((value) => document.body.toggleAttribute('data-ds-dark-theme', value), scheme === 'dark')
    await sanitizePage((expression) => page.evaluate(expression))
    await page.evaluate((value) => document.body.toggleAttribute('data-ds-dark-theme', value), scheme === 'dark')
    await page.screenshot({ path: path.join(out, `conversation-style-${label}-${scheme}.png`) })
  }
  await page.evaluate((value) => document.body.toggleAttribute('data-ds-dark-theme', value), dark)
}

function conversationStylesScenario({ check, HOST }, legacyStyle) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    profilePatch: ['- id: ui-skin-deepcraft', '  config:', `    chatStyle: ${legacyStyle}`],
    async beforeSend(context) {
      await context.page.waitForFunction((attribute) => document.body.hasAttribute(attribute), STYLE_ATTRIBUTE, { timeout: 15000 })
      const settingsPage = await context.session.context.newPage()
      await settingsPage.goto(context.url, { waitUntil: 'domcontentloaded' })
      await waitForSkin(settingsPage)
      await dismissOverlays(settingsPage)
      const settings = await openConversationTab(settingsPage)
      context.notes.readerLayout = {
        legacyStyle,
        attribute: await context.page.getAttribute('body', STYLE_ATTRIBUTE),
        rows: await readConversationRows(settingsPage),
      }
      const hero = await readStyle(context.page, HOST)
      if (process.env.DSH_CAPTURE_CONVERSATION_STYLES === '1') {
        await capture(context.page, context.out, `hero-${legacyStyle}`)
      }
      await context.page.setViewportSize({ width: 390, height: 844 })
      const mobileHero = await readStyle(context.page, HOST)
      await context.page.setViewportSize({ width: 1280, height: 900 })
      const homeLayouts = {}
      for (const layout of Object.keys(HOME_CHOICES)) {
        await chooseHome(settingsPage, context.page, layout)
        homeLayouts[layout] = await readStyle(context.page, HOST)
      }
      await chooseHome(settingsPage, context.page, 'float')
      context.styleSettings = { page: settingsPage }
      context.notes.conversationStyles = { hero, mobileHero, homeLayouts, desktop: {}, mobile: {}, tight: {} }
    },
    async afterTurn(context) {
      const { page, out, notes, styleSettings } = context
      const styles = notes.conversationStyles
      await page.locator('[data-dsh-deepcraft-context-meter]').first().waitFor({ state: 'visible', timeout: 15000 })
      styles.desktop = await readStyle(page, HOST)
      await page.setViewportSize({ width: 390, height: 844 })
      styles.mobile = await readStyle(page, HOST)
      await page.setViewportSize({ width: 330, height: 844 })
      styles.tight = await readStyle(page, HOST)
      await page.setViewportSize({ width: 1280, height: 900 })
      if (process.env.DSH_CAPTURE_CONVERSATION_STYLES === '1') {
        await capture(page, out, `conversation-${notes.readerLayout.legacyStyle}`)
      }
      await styleSettings.page.close()
    },
    async assert({ notes, session }) {
      const { hero, mobileHero, homeLayouts, desktop, mobile, tight } = notes.conversationStyles
      const layout = notes.readerLayout
      const inside = (item, width) => item !== null && item.shown && item.left >= -1 && item.right <= width + 1
      const withinCard = (control, card) => control !== null && control.shown && card !== null &&
        control.left >= card.left - 1 && control.right <= card.right + 1
      const ready = (item) => inside(item.input, item.width) && inside(item.card, item.width)
      const alignedEffort = (item) => item.effort === null || (withinCard(item.effort, item.card) &&
        Math.abs(item.effort.left - item.model.right - 2) <= 2 &&
        Math.abs((item.effort.top + item.effort.bottom) - (item.model.top + item.model.bottom)) <= 2 &&
        item.effort.right <= item.meter.left + 1)
      return [
        check(`旧配置中的 ${layout.legacyStyle} 仍使用阅读布局，对话设置没有样式行`,
          layout.attribute === 'reader' && layout.rows.length === CONVERSATION_ROWS.length &&
          layout.rows.every((title, index) => CONVERSATION_ROWS[index].test(title)) &&
          !layout.rows.some((title) => STYLE_ROW.test(title)), JSON.stringify(layout)),
        check('空会话使用阅读布局，狭窄的阅读栏与输入框都可见',
          hero.style === 'reader' && ready(hero) && Math.abs(hero.stack.width - 640) <= 1 &&
          hero.card.width <= 721,
          JSON.stringify({ hero, cardWidth: hero.cardWidth })),
        check('空会话把标题留在输入区上方，两块都在窗口内',
          hero.headline?.shown && hero.card?.shown && hero.headline.bottom <= hero.card.top &&
          hero.headline.top >= 0 && hero.card.bottom <= hero.height,
          JSON.stringify({ headline: hero.headline, card: hero.card })),
        check('手机空会话保留标题和阅读栏',
          mobileHero.style === 'reader' && ready(mobileHero) && mobileHero.headline?.shown &&
          mobileHero.headline.bottom <= mobileHero.card.top && mobileHero.card.top < mobileHero.height,
          JSON.stringify(mobileHero)),
        ...Object.entries(homeLayouts).map(([layoutName, item]) => check(`${layoutName} 首页保持阅读布局的标题、输入区与控件`,
          item.style === 'reader' && ready(item) && item.headline?.shown &&
            inside(item.model, item.width) && (layoutName !== 'float' || item.homeDeck?.shown) &&
            (layoutName !== 'studio' || (item.homePanel?.shown && item.heroMaxWidth === '720px')),
          JSON.stringify(item))),
        check('现有会话保留阅读栏、模型、权限和上下文控件',
          [desktop, mobile].every((item) => item.style === 'reader' && ready(item) &&
            [item.model, item.permission, item.meter].every((control) => withinCard(control, item.card)) && alignedEffort(item)),
          JSON.stringify({ desktop, mobile })),
        check('会话消息仍在页面里',
          desktop.text.includes('hello there') && desktop.text.includes('Hello'), desktop.text.slice(0, 120)),
        check('手机宽度保持输入区和控件可见',
          [mobile, tight].every((item) => ready(item) && item.row !== null && item.row.over <= 0 &&
            [item.model, item.permission, item.meter].every((control) => withinCard(control, item.card)) && alignedEffort(item)),
          JSON.stringify({ mobile, tight })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { conversationStylesScenario }
