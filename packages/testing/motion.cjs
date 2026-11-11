#!/usr/bin/env node
/**
 * motion.cjs — the transitions.dev surfaces on the real page (D9, D66).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * Each surface is read where it moves, by the animation or the transition it
 * plays and the state it comes to rest in: the home greeting rising, a settings
 * switch that bounces only once pressed, a settings tab sliding in while a
 * still copy of the one it replaced slides out, and the overtime badge popping
 * onto the waiting line and playing its exit before it hides. The `process`
 * script keeps the model silent past the overtime mark, so the badge comes
 * and goes in one turn.
 */
'use strict'
const { waitForSkin } = require('./dsh-web.cjs')
const { recordUntil } = require('./lane.cjs')
const { openSkinSettings } = require('./remote-settings.cjs')

/** The host's page markers this scenario reads. */
const HOST = {
  brandMark: '[data-dsh-deepcraft-part~="hero-mark"]', // the hero's brand mark seat (theme/hero.css)
  greeting: '[data-dsh-deepcraft-part~="hero-mark"] + [data-dsh-deepcraft-part~="hero-title-group"]', // the hero's greeting beside it
}

/** The skin's own marks (the stylesheets and modules each names). */
const SKIN = {
  page: '.dsh-deepcraft-settings',
  switch: 'fieldset.dsh-deepcraft-settings-rows .dsh-deepcraft-settings-switch:not(:disabled)',
  tab: '.dsh-deepcraft-settings-tabs [role="tab"]',
  rows: '.dsh-deepcraft-settings-pages > fieldset.dsh-deepcraft-settings-rows',
  leaving: '.dsh-deepcraft-settings-leaving',
  badge: '.dsh-deepcraft-chat-wait-badge',
  badgeLeaving: 'data-dsh-deepcraft-wait-badge-leaving', // chat-wait.ts
}


/** The animation an element plays, its delay, and nothing when it is not there. */
const animationOf = (page, selector) => page.evaluate((target) => {
  const element = document.querySelector(target)
  if (element === null) return null
  const style = getComputedStyle(element)
  return { name: style.animationName, delay: style.animationDelay }
}, selector)

/*
 * Each surface is recorded on every frame from the press until its own motion
 * has landed: the settings page keeps preview cards moving on their own clocks,
 * so the page as a whole never comes to rest, and what is waited for is the
 * element under test (D66: the settle rule).
 */

/** The first settings switch's knob, read inside the page, with whether its own motion is still running. */
function knobInPage(marks) {
  const element = document.querySelector(marks.switch)
  const knob = element.querySelector('.dsh-deepcraft-settings-switch-knob')
  const style = getComputedStyle(knob)
  return {
    label: element.getAttribute('aria-label'),
    moved: element.hasAttribute('data-moved'),
    on: element.hasAttribute('data-on'),
    animation: style.animationName,
    running: knob.getAnimations().some((animation) => (animation.playState === 'running' || animation.playState === 'pending') && animation.effect?.getComputedTiming().iterations !== Infinity),
  }
}

/** A press's frames end once the motion it started has run and stopped. */
const motionLanded = (frames) => frames.some((frame) => frame.running) && !frames[frames.length - 1].running

/**
 * The settings switch: read at rest, recorded on every frame from a press
 * until its knob lands, and left with the value it had. The scenario's own
 * patch layer stands over the saved settings, so a written value can come back
 * to the one the layers resolve to; the switch is pressed again only when it
 * has not.
 */
async function readSwitch(page) {
  const control = page.locator(SKIN.switch).first()
  const before = await page.evaluate(knobInPage, SKIN)
  await control.click()
  const frames = await recordUntil(page, knobInPage, motionLanded, SKIN, 8000, 'the switch knob landing')
  let after = frames[frames.length - 1]
  if (after.on !== before.on) {
    await control.click()
    const back = await recordUntil(page, knobInPage, motionLanded, SKIN, 8000, 'the switch knob landing again')
    after = back[back.length - 1]
  }
  return { before, pressed: frames.filter((frame) => frame.animation !== 'none'), after }
}

/** The settings page's rows and the still copy of a tab leaving, read inside the page. */
function slideInPage(marks) {
  const rows = document.querySelector(marks.rows)
  const still = document.querySelector(`${marks.leaving} > *`)
  return {
    enter: rows === null ? null : rows.getAttribute('data-dsh-deepcraft-page-enter'),
    enterAnimation: rows === null ? null : getComputedStyle(rows).animationName,
    leave: still === null ? null : still.getAttribute('data-dsh-deepcraft-page-leave'),
    leaveAnimation: still === null ? null : getComputedStyle(still).animationName,
    hidden: still === null ? null : still.getAttribute('aria-hidden') === 'true' && still.hasAttribute('inert') && !still.hasAttribute('role'),
    leaving: document.querySelectorAll(`${marks.leaving} > *`).length,
    running: rows !== null && rows.getAnimations().some((animation) => (animation.playState === 'running' || animation.playState === 'pending') && animation.effect?.getComputedTiming().iterations !== Infinity),
  }
}

/** A slide's frames end once its still copy is gone and the arriving rows have landed. */
const slideLanded = (frames) => frames.some((frame) => frame.leaving > 0) && frames[frames.length - 1].leaving === 0 && !frames[frames.length - 1].running

/** A tab change: every frame of the slide, from the press until it has landed. */
async function readTabSlide(page, tab) {
  await page.locator(SKIN.tab).nth(tab).click()
  const frames = await recordUntil(page, slideInPage, slideLanded, SKIN, 8000, 'the settings tab slide landing')
  return { during: frames.filter((frame) => frame.leaving > 0), after: frames[frames.length - 1].leaving }
}


function motionScenario({ check }) {
  return {
    script: 'process',
    prompt: 'take your time, then answer',
    viewport: { width: 1280, height: 900 },
    /** The home page before the turn: the greeting and the settings page. */
    async beforeSend(context) {
      const { page, notes } = context
      await waitForSkin(page)
      notes.mark = await animationOf(page, HOST.brandMark)
      notes.greeting = await animationOf(page, HOST.greeting)
      await openSkinSettings(page)
      notes.slide = await readTabSlide(page, 1)
      await readTabSlide(page, 2)
      notes.switch = await readSwitch(page)
      await page.keyboard.press('Escape')
      await page.locator(SKIN.page).first().waitFor({ state: 'detached', timeout: 10000 }).catch(() => {})
    },
    /** The overtime badge: out once the silence runs over, then its exit before it hides. */
    async duringTurn(context) {
      const { page, notes } = context
      await page.waitForSelector(`${SKIN.badge}:not([hidden])`, { timeout: 20000 })
      notes.badgeIn = await animationOf(page, `${SKIN.badge}:not([hidden])`)
      // The exit lasts one exit duration, shorter than a poll can be trusted to
      // see: the page records the leaving mark itself, and whether the badge was
      // still laid out when it arrived.
      await page.evaluate((marks) => {
        const badge = document.querySelector(marks.badge)
        window.__motionBadge = []
        new MutationObserver(() => {
          window.__motionBadge.push({ leaving: badge.hasAttribute(marks.badgeLeaving), hidden: badge.hidden })
        }).observe(badge, { attributes: true, attributeFilter: [marks.badgeLeaving, 'hidden'] })
      }, SKIN)
      await page.waitForFunction((marks) => document.querySelector(marks.badge).hidden, SKIN, { timeout: 30000 })
      notes.badgeSteps = await page.evaluate(() => window.__motionBadge)
    },
    async assert({ session, notes }) {
      const sw = notes.switch ?? {}
      const slide = notes.slide ?? {}
      return [
        check('首页标题的标志与问候语错开升起',
          notes.mark?.name === 'dsh-deepcraft-hero-rise' && notes.greeting?.name === 'dsh-deepcraft-hero-rise' && notes.greeting?.delay !== '0s' && notes.mark?.delay === '0s',
          JSON.stringify({ mark: notes.mark, greeting: notes.greeting })),
        check('开关打开页面时静止，按下的那一刻才弹跳着过去，最后留下原来的值',
          sw.before?.moved === false && sw.before?.animation === 'none' &&
            sw.pressed?.[0]?.moved === true && sw.pressed[0].on !== sw.before?.on &&
            sw.pressed[0].animation === (sw.pressed[0].on ? 'dsh-deepcraft-switch-on' : 'dsh-deepcraft-switch-off') &&
            sw.after?.on === sw.before?.on,
          JSON.stringify(sw)),
        check('切到右侧的标签时新页从右侧滑入，旧页的静止副本向左滑出、不进入读屏与 Tab 顺序，播完即移除',
          (slide.during ?? []).length > 0 && slide.during.every((frame) => frame.enter === 'forward' && frame.enterAnimation === 'dsh-deepcraft-page-in' &&
            frame.leave === 'forward' && frame.leaveAnimation === 'dsh-deepcraft-page-out' && frame.hidden === true) && slide.after === 0,
          JSON.stringify({ during: (slide.during ?? []).slice(0, 2), frames: (slide.during ?? []).length, after: slide.after })),
        check('超时徽标弹出时滑入，离开时先播完退出再隐藏',
          notes.badgeIn?.name === 'dsh-deepcraft-wait-badge-in' &&
            JSON.stringify(notes.badgeSteps) === JSON.stringify([{ leaving: true, hidden: false }, { leaving: false, hidden: true }]),
          JSON.stringify({ in: notes.badgeIn, steps: notes.badgeSteps })),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { motionScenario }
