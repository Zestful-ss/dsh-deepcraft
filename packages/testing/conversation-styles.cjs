#!/usr/bin/env node
/**
 * conversation-styles.cjs — switch the conversation layouts through the real
 * settings page and read their hero, transcript and composer on the host (D66).
 */
'use strict'
const path = require('node:path')
const { waitForSkin, dismissOverlays } = require('./dsh-web.cjs')
const { openSkinSettings, SETTINGS_PAGE } = require('./settings-route.cjs')
const { sanitizePage } = require('../../scripts/shared/privacy.cjs')

const STYLE_ATTRIBUTE = 'data-dsh-deepcraft-chat-style'
const CHOICES = {
  reader: /^(阅读|Reader)$/,
  spine: /^(时间线|Spine)$/,
  console: /^(终端|Console)$/,
}
const HOME_CHOICES = {
  float: /^(浮层|Floating)$/,
  classic: /^(经典|Classic)$/,
  studio: /^(工作台|Studio)$/,
}

async function openChoices(page) {
  await openSkinSettings(page)
  const settings = page.locator(SETTINGS_PAGE).first()
  await settings.getByRole('tab', { name: /^(通用|General)$/ }).click()
  const username = settings.locator('.dsh-deepcraft-settings-row').filter({ hasText: /用户名|Username/ }).locator('input')
  await username.fill('Demo')
  await username.press('Enter')
  await settings.getByRole('tab', { name: /^(对话|Conversation)$/ }).click()
  return settings.locator('.dsh-deepcraft-settings-row').filter({ hasText: /对话样式|Conversation style/ })
}

async function chooseStyle(row, target, style) {
  await row.getByRole('button', { name: CHOICES[style] }).click()
  await target.waitForFunction(({ attribute, wanted }) => document.body.getAttribute(attribute) === wanted,
    { attribute: STYLE_ATTRIBUTE, wanted: style }, { timeout: 15000 })
  await target.waitForTimeout(200)
}

async function chooseHome(settingsPage, target, layout) {
  const settings = settingsPage.locator(SETTINGS_PAGE).first()
  await settings.getByRole('tab', { name: /^(外观|Appearance)$/ }).click()
  const row = settings.locator('.dsh-deepcraft-settings-row').filter({ hasText: /首页版面|Home layout/ })
  await row.getByRole('button', { name: HOME_CHOICES[layout] }).click()
  await target.waitForFunction((wanted) => document.body.getAttribute('data-dsh-deepcraft-home-layout') === wanted,
    layout === 'classic' ? null : layout, { timeout: 15000 })
  await settings.getByRole('tab', { name: /^(对话|Conversation)$/ }).click()
}

async function readStyle(page, host) {
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
    const pseudo = (node) => node === null ? null : getComputedStyle(node, '::before').content
    const card = find(host.composerCard)
    const input = find(host.composer)
    const scroll = card?.querySelector('[data-input-scroll]') ?? null
    const flow = find(host.flow)
    const row = card?.querySelector('[data-dsh-deepcraft-part~="row"]') ?? null
    const seat = find('[data-composer-seat]')
    const hero = find('[data-phase="hero"] [data-dsh-deepcraft-part~="composer-hero"]')
    const user = flow?.querySelector('[data-chat-flow-kind="user"]') ?? null
    const markerStyle = user === null ? null : getComputedStyle(user, '::before')
    const marker = markerStyle === null ? null : {
      content: markerStyle.content,
      center: user.getBoundingClientRect().left + parseFloat(markerStyle.left) + parseFloat(markerStyle.width) / 2,
      color: markerStyle.backgroundColor,
    }
    const heroMarkers = [...hero?.children ?? []]
      .filter((node) => node.matches('[data-dsh-deepcraft-holds~="hero-headline"], [data-dsh-deepcraft-holds~="composer-card"], [data-dsh-deepcraft-part~="hero-workspace-row"]'))
      .map((node) => {
        const style = getComputedStyle(node, '::before')
        return { content: style.content, center: node.getBoundingClientRect().left + parseFloat(style.left) + parseFloat(style.width) / 2 }
      })
    return {
      style: document.body.getAttribute(attribute),
      width: innerWidth, height: innerHeight,
      input: box(input), card: box(card), row: box(row), flow: box(flow), hero: box(hero),
      heroMaxWidth: hero === null ? null : getComputedStyle(hero).maxWidth,
      headline: box(hero?.querySelector('[data-dsh-deepcraft-part~="hero-headline"]') ?? null),
      homeDeck: box(find('.dsh-deepcraft-home-float')),
      homePanel: box(find('[data-dsh-deepcraft-home-panel]')),
      model: box(find('.dsh-deepcraft-model-btn')),
      permission: box(find('.dsh-deepcraft-perm-btn')),
      meter: box(find('[data-dsh-deepcraft-context-meter]')),
      prompt: pseudo(scroll), rail: pseudo(flow), marker, heroMarkers,
      cardWidth: seat === null ? null : getComputedStyle(seat).getPropertyValue('--dsh-composer-card-max-width').trim(),
      text: flow?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    }
  }, { host, attribute: STYLE_ATTRIBUTE })
}

async function capture(page, out, style) {
  const dark = await page.evaluate(() => document.body.hasAttribute('data-ds-dark-theme'))
  for (const scheme of ['light', 'dark']) {
    await page.evaluate((value) => document.body.toggleAttribute('data-ds-dark-theme', value), scheme === 'dark')
    await sanitizePage((expression) => page.evaluate(expression))
    await page.evaluate((value) => document.body.toggleAttribute('data-ds-dark-theme', value), scheme === 'dark')
    await page.screenshot({ path: path.join(out, `conversation-style-${style}-${scheme}.png`) })
  }
  await page.evaluate((value) => document.body.toggleAttribute('data-ds-dark-theme', value), dark)
}

function conversationStylesScenario({ check, HOST }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend(context) {
      const settingsPage = await context.session.context.newPage()
      await settingsPage.goto(context.url, { waitUntil: 'domcontentloaded' })
      await waitForSkin(settingsPage)
      await dismissOverlays(settingsPage)
      const row = await openChoices(settingsPage)
      const hero = {}
      for (const style of Object.keys(CHOICES)) {
        await chooseStyle(row, context.page, style)
        hero[style] = await readStyle(context.page, HOST)
        if (process.env.DSH_CAPTURE_CONVERSATION_STYLES === '1') {
          await capture(context.page, context.out, `hero-${style}`)
        }
      }
      const mobileHero = {}
      await context.page.setViewportSize({ width: 390, height: 844 })
      for (const style of Object.keys(CHOICES)) {
        await chooseStyle(row, context.page, style)
        mobileHero[style] = await readStyle(context.page, HOST)
      }
      await context.page.setViewportSize({ width: 1280, height: 900 })
      const homeLayouts = {}
      for (const layout of Object.keys(HOME_CHOICES)) {
        await chooseHome(settingsPage, context.page, layout)
        homeLayouts[layout] = {}
        for (const style of Object.keys(CHOICES)) {
          await chooseStyle(row, context.page, style)
          homeLayouts[layout][style] = await readStyle(context.page, HOST)
        }
      }
      await chooseHome(settingsPage, context.page, 'float')
      await chooseStyle(row, context.page, 'reader')
      context.styleSettings = { page: settingsPage, row }
      context.notes.conversationStyles = { hero, mobileHero, homeLayouts, desktop: {}, mobile: {} }
    },
    async afterTurn(context) {
      const { page, out, notes, styleSettings } = context
      const { row } = styleSettings
      const styles = notes.conversationStyles
      await page.locator('[data-dsh-deepcraft-context-meter]').first().waitFor({ state: 'visible', timeout: 15000 })
      for (const style of Object.keys(CHOICES)) {
        await chooseStyle(row, page, style)
        styles.desktop[style] = await readStyle(page, HOST)
      }
      await page.setViewportSize({ width: 390, height: 844 })
      for (const style of Object.keys(CHOICES)) {
        await chooseStyle(row, page, style)
        styles.mobile[style] = await readStyle(page, HOST)
      }
      await page.setViewportSize({ width: 1280, height: 900 })
      if (process.env.DSH_CAPTURE_CONVERSATION_STYLES === '1') {
        for (const style of Object.keys(CHOICES)) {
          await chooseStyle(row, page, style)
          await capture(page, out, style)
        }
      }
      await chooseStyle(row, page, 'reader')
      await styleSettings.page.close()
    },
    async assert({ notes, session }) {
      const { hero, mobileHero, homeLayouts, desktop, mobile } = notes.conversationStyles
      const inside = (item, width) => item !== null && item.shown && item.left >= -1 && item.right <= width + 1
      const ready = (item) => inside(item.input, item.width) && inside(item.card, item.width)
      const heroMarkers = hero.spine.heroMarkers.filter((marker) => marker.content === '""' && Number.isFinite(marker.center))
      return [
        ...Object.keys(CHOICES).map((style) => check(`${style} 可在空会话和现有会话中切换，输入框可见`,
          hero[style].style === style && desktop[style].style === style && ready(hero[style]) && ready(desktop[style]),
          JSON.stringify({ hero: hero[style], desktop: desktop[style] }))),
        check('空会话将标题留在上方、输入区放在下方', Object.values(hero).every((item) =>
          item.headline?.shown && item.headline.top < item.height * 0.25 && item.card.top > item.height * 0.55 && item.card.bottom <= item.height),
        JSON.stringify(Object.fromEntries(Object.entries(hero).map(([style, item]) => [style, { headline: item.headline, card: item.card }])))),
        ...Object.keys(CHOICES).map((style) => check(`${style} 的手机空会话保留标题和输入区`,
          ready(mobileHero[style]) && mobileHero[style].headline?.shown &&
          mobileHero[style].headline.bottom <= mobileHero[style].card.top && mobileHero[style].card.top < mobileHero[style].height,
          JSON.stringify(mobileHero[style]))),
        ...Object.entries(homeLayouts).map(([layout, variants]) => check(`${layout} 首页兼容三种对话样式`,
          Object.entries(variants).every(([style, item]) => item.style === style && ready(item) && item.headline?.shown &&
            inside(item.model, item.width) && (layout !== 'float' || item.homeDeck?.shown) &&
            (layout !== 'studio' || (item.homePanel?.shown && item.heroMaxWidth === '720px'))), JSON.stringify(variants))),
        check('阅读栏比终端会话列窄', desktop.reader.flow !== null && desktop.console.flow !== null &&
          desktop.reader.flow.width < desktop.console.flow.width, JSON.stringify({ reader: desktop.reader.flow, console: desktop.console.flow })),
        check('时间线标记贴合轨道，终端在输入和消息前显示提示符',
          desktop.spine.rail === '""' && desktop.spine.marker?.content === '""' &&
          Math.abs(desktop.spine.marker.center - (desktop.spine.flow.left + 7)) <= 2 &&
          heroMarkers.length === 1 && Math.abs(heroMarkers[0].center - (hero.spine.hero.left + 7)) <= 2 &&
          (desktop.console.prompt ?? '').includes('❯') && (desktop.console.marker?.content ?? '').includes('❯'),
          JSON.stringify({ flow: desktop.spine.flow, marker: desktop.spine.marker, hero: hero.spine.hero, heroMarkers, prompt: desktop.console.prompt, user: desktop.console.marker })),
        ...Object.keys(CHOICES).map((style) => check(`${style} 保留模型、权限和上下文控件`,
          [desktop[style], mobile[style]].every((item) => [item.model, item.permission, item.meter].every((control) => inside(control, item.width))),
          JSON.stringify({ desktop: desktop[style], mobile: mobile[style] }))),
        check('切换样式保留会话消息', Object.values(desktop).every((item) => item.text.includes('hello there') && item.text.includes('Hello')),
          JSON.stringify(Object.fromEntries(Object.entries(desktop).map(([style, item]) => [style, item.text.slice(0, 80)])))),
        ...Object.keys(CHOICES).map((style) => check(`${style} 在手机宽度保持输入区和控件可见`,
          ready(mobile[style]) && (mobile[style].row === null || mobile[style].row.over <= 0) &&
          [mobile[style].model, mobile[style].permission, mobile[style].meter].every((control) => control === null || inside(control, mobile[style].width)),
          JSON.stringify(mobile[style]))),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { conversationStylesScenario }
