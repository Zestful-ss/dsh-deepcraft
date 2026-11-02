#!/usr/bin/env node
/** The model picker follows the host's real model slot as its control comes and goes. */
'use strict'

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
    async afterTurn({ page, notes }) {
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
    },
    async assert({ notes, session }) {
      const before = notes.modelSlotBefore
      const empty = notes.modelSlotEmpty
      const restored = notes.modelSlotRestored
      return [
        check('普通会话的模型菜单可以打开', before.host && before.trigger && before.open, JSON.stringify(before)),
        check('宿主移除模型控件后按钮和弹层消失', !empty.host && !empty.trigger && empty.popovers === 0, JSON.stringify(empty)),
        check('宿主恢复模型控件后菜单可以重新打开', restored.host && restored.trigger && restored.open, JSON.stringify(restored)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { modelSlotScenario }
