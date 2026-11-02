#!/usr/bin/env node
/** The model picker follows the host's real model slot as its control comes and goes. */
'use strict'

const { SKIN } = require('./lane.cjs')

const SLOT = '[data-slot="conversation.input.model"]'
const TRIGGER = '.dsh-deepcraft-model-btn'
const POPOVER = '.dsh-deepcraft-model-popover'
const OPEN_POPOVER = `${POPOVER}:not(.dsh-deepcraft-model-popover-sub)[data-open="true"]`

async function modelSlotScenarioState(page) {
  return page.evaluate(({ slot, trigger, popover, open }) => ({
    host: [...(document.querySelector(slot)?.children ?? [])].some((node) => !node.classList.contains('dsh-deepcraft-model-btn')),
    trigger: document.querySelector(trigger) !== null,
    popovers: document.querySelectorAll(popover).length,
    open: document.querySelector(open) !== null,
  }), { slot: SLOT, trigger: TRIGGER, popover: POPOVER, open: OPEN_POPOVER })
}

function modelSlotScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    async beforeSend({ page }) {
      await page.evaluate(({ trigger, ghost }) => {
        const state = { evidence: { ghostSeen: false, maximum: 0 }, held: [], observer: null }
        state.observer = new MutationObserver(() => {
          const copy = document.querySelector(ghost)
          if (copy === null) return
          if (!state.evidence.ghostSeen) {
            state.held = copy.getAnimations({ subtree: true })
            for (const animation of state.held) animation.pause()
          }
          state.evidence.ghostSeen = true
          state.evidence.maximum = Math.max(state.evidence.maximum, document.querySelectorAll(trigger).length)
        })
        state.observer.observe(document.body, { childList: true, subtree: true })
        window.__modelFlightEvidence = state
      }, { trigger: TRIGGER, ghost: SKIN.sendGhost })
    },
    async duringTurn({ page, notes }) {
      await page.waitForSelector(SKIN.sendGhost, { state: 'attached' })
      await page.locator(TRIGGER).click()
      await page.waitForSelector(OPEN_POPOVER)
      notes.modelFlightOpen = await modelSlotScenarioState(page)
      notes.modelFlightEmpty = await page.evaluate(async ({ slot: selector, ghost, trigger, popover }) => {
        const copy = document.querySelector(ghost)
        const slot = [...document.querySelectorAll(selector)].find((node) => !copy.contains(node))
        if (slot === undefined) throw new Error('model slot disappeared before the flight')
        const parent = slot.parentNode
        const next = slot.nextSibling
        slot.remove()
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        const result = { ghost: copy.isConnected, triggers: document.querySelectorAll(trigger).length, popovers: document.querySelectorAll(popover).length }
        if (!parent.isConnected) throw new Error('model slot parent disappeared during the flight')
        parent.insertBefore(slot, next && next.parentNode === parent ? next : null)
        return result
      }, { slot: SLOT, ghost: SKIN.sendGhost, trigger: TRIGGER, popover: POPOVER })
      await page.waitForSelector(TRIGGER)
      notes.modelFlightRestored = await modelSlotScenarioState(page)
      await page.evaluate(() => {
        for (const animation of window.__modelFlightEvidence.held) animation.play()
      })
    },
    async afterTurn({ page, notes }) {
      notes.modelFlight = await page.evaluate(() => {
        const { evidence, observer } = window.__modelFlightEvidence
        observer.disconnect()
        delete window.__modelFlightEvidence
        return evidence
      })
      await page.waitForSelector(TRIGGER)
      await page.locator(TRIGGER).click()
      await page.waitForSelector(OPEN_POPOVER)
      notes.modelSlotBefore = await modelSlotScenarioState(page)

      await page.evaluate((selector) => {
        const slot = document.querySelector(selector)
        const host = [...slot.children].find((node) => !node.classList.contains('dsh-deepcraft-model-btn'))
        if (host === undefined) throw new Error('model slot has no host control')
        window.__modelSlotHost = host
        host.remove()
      }, SLOT)
      await page.waitForFunction(({ trigger, popover }) => !document.querySelector(trigger) && !document.querySelector(popover), { trigger: TRIGGER, popover: POPOVER })
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
      notes.modelSlotEmpty = await modelSlotScenarioState(page)

      await page.evaluate((selector) => {
        const slot = document.querySelector(selector)
        if (!slot || !window.__modelSlotHost) throw new Error('model slot or host control disappeared')
        slot.appendChild(window.__modelSlotHost)
        delete window.__modelSlotHost
      }, SLOT)
      await page.waitForSelector(TRIGGER)
      await page.locator(TRIGGER).click()
      await page.waitForSelector(OPEN_POPOVER)
      notes.modelSlotRestored = await modelSlotScenarioState(page)
      notes.modelInertTransition = await page.evaluate(async (selector) => {
        const slot = document.querySelector(selector)
        const container = slot.parentElement
        const count = () => document.querySelectorAll('.dsh-deepcraft-model-btn').length
        const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        const before = count()
        container.setAttribute('inert', '')
        const marker = document.createElement('i')
        document.body.appendChild(marker)
        marker.remove()
        await frames()
        const inactive = count()
        container.removeAttribute('inert')
        await frames()
        return { before, inactive, after: count() }
      }, SLOT)
    },
    async assert({ notes, session }) {
      const before = notes.modelSlotBefore
      const empty = notes.modelSlotEmpty
      const restored = notes.modelSlotRestored
      return [
        check('发送动画期间模型按钮保持唯一', notes.modelFlight.ghostSeen && notes.modelFlight.maximum === 1, JSON.stringify(notes.modelFlight)),
        check('发送动画期间模型菜单可以打开', notes.modelFlightOpen.host && notes.modelFlightOpen.trigger && notes.modelFlightOpen.open, JSON.stringify(notes.modelFlightOpen)),
        check('发送动画期间宿主插槽移除后按钮和弹层消失', notes.modelFlightEmpty.ghost && notes.modelFlightEmpty.triggers === 0 && notes.modelFlightEmpty.popovers === 0, JSON.stringify(notes.modelFlightEmpty)),
        check('发送动画期间宿主插槽恢复后按钮重新出现', notes.modelFlightRestored.host && notes.modelFlightRestored.trigger, JSON.stringify(notes.modelFlightRestored)),
        check('普通会话的模型菜单可以打开', before.host && before.trigger && before.open, JSON.stringify(before)),
        check('宿主移除模型控件后按钮和弹层消失', !empty.host && !empty.trigger && empty.popovers === 0, JSON.stringify(empty)),
        check('宿主恢复模型控件后菜单可以重新打开', restored.host && restored.trigger && restored.open, JSON.stringify(restored)),
        check('输入区域恢复交互后模型按钮重新出现', notes.modelInertTransition.before === 1 && notes.modelInertTransition.inactive === 0 && notes.modelInertTransition.after === 1, JSON.stringify(notes.modelInertTransition)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { modelSlotScenario }
