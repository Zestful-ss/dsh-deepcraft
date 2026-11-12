#!/usr/bin/env node
/**
 * ds-bot.cjs — the page given whole to ds-bot's real browser half (D81, D66).
 *
 * Registered in the lane's scenario table (packages/testing/scenarios.cjs).
 *
 * ds-bot paints its whole Bot surface over the shell, and the theme gives the
 * page way to it. The skin keeps no switch of its own: the way back is ds-bot's
 * own menu, and the way across is ds-bot's own footer button. What the theme
 * leans on is ds-bot's own markup — when its marks land, how its menu renders
 * — which only its published browser half has, so the scenario installs that
 * package from the registry into a home of its own and walks the two owners on
 * the assembled host:
 *
 *   - the page boots on the Code side and the theme has it;
 *   - ds-bot's own button hands the page over: the theme's sheet, marks and
 *     features leave, and no skin switch stands on either side;
 *   - a reload on the Bot side never shows the theme first;
 *   - the theme's return pill sits in ds-bot's sidebar footer, and one press
 *     writes the saved mode and reloads onto the Code side;
 *   - ds-bot's own Agent mode item takes the page back, with its menu never
 *     left open.
 */
'use strict'

/** The ds-bot release the lane checks against. */
const DS_BOT = 'ds-bot@0.1.5'

/**
 * Before the page's own scripts: the first load starts on the Code side
 * (ds-bot's saved mode), and every change of either owner's mark is logged,
 * so a later boot on the Bot side can be read for a theme frame.
 */
const INIT = `
try { if (!sessionStorage.getItem('dsBotSeeded')) { sessionStorage.setItem('dsBotSeeded', '1'); localStorage.setItem('ds-bot:surface', 'agent') } } catch {}
window.__surfaceLog = []
new MutationObserver(() => {
  const body = document.body
  if (body === null) return
  window.__surfaceLog.push({ theme: body.hasAttribute('data-dsh-deepcraft'), bot: body.hasAttribute('data-bt-motion') })
}).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-dsh-deepcraft', 'data-bt-motion'] })
`

/** The page as the two owners leave it, and the one return pill the theme keeps on the Bot side (D82). */
const read = (page) => page.evaluate(() => {
  const body = document.body
  const pill = document.querySelector('button.dsh-deepcraft-ds-bot-return')
  const stray = [...document.querySelectorAll('[class^="dsh-deepcraft-"], [class*=" dsh-deepcraft-"]')]
    .filter((element) => !pill || !pill.contains(element))
  return {
    theme: body.hasAttribute('data-dsh-deepcraft'),
    bot: body.hasAttribute('data-bt-motion'),
    saved: localStorage.getItem('ds-bot:surface'),
    themeSheet: document.getElementById('dsh-deepcraft-style') !== null,
    themeMarks: [...body.attributes].map((attribute) => attribute.name).filter((name) => name.startsWith('data-dsh-deepcraft')),
    themeNodes: stray.length,
    skinSwitch: document.querySelector('.dsh-deepcraft-surface-switch') !== null ||
      [...body.attributes].some((attribute) => attribute.name === 'data-dsh-deepcraft-surface'),
    menu: document.querySelector('.bt-account-menu') !== null,
    pill: pill === null ? null : {
      text: pill.textContent.trim(),
      hidden: pill.hidden,
      rect: pill.getBoundingClientRect().toJSON(),
      account: document.querySelector('.bt-account')?.getBoundingClientRect().toJSON() ?? null,
    },
  }
})

/** Wait for one side to hold the page: ds-bot's surface with the theme gone, or the reverse. */
const settle = (page, side) => page.waitForFunction((bot) => {
  const body = document.body
  return body.hasAttribute('data-bt-motion') === bot && body.hasAttribute('data-dsh-deepcraft') === !bot
}, side === 'bot', { timeout: 20000 })

function dsBotScenario({ check }) {
  return {
    script: 'greeting',
    prompt: 'hello there',
    plugins: [DS_BOT],
    initScript: { content: INIT },
    async afterTurn(context) {
      const { page, notes } = context
      await settle(page, 'code')
      notes.boot = await read(page)

      await page.locator('.bt-return').click()
      await settle(page, 'bot')
      notes.bot = await read(page)

      await page.evaluate(() => { window.__surfaceLog = [] })
      await page.reload({ waitUntil: 'domcontentloaded' })
      await settle(page, 'bot')
      // The boot's own last marks land after the page settles; the log is read once they have.
      await page.waitForTimeout(1500)
      notes.reload = { ...await read(page), log: await page.evaluate(() => window.__surfaceLog) }

      await page.locator('.dsh-deepcraft-ds-bot-return').click()
      await settle(page, 'code')
      await page.waitForTimeout(500)
      notes.return = await read(page)

      await page.locator('.bt-return').click()
      await settle(page, 'bot')
      await page.locator('.bt-account').click()
      await page.locator('.bt-account-menu > .bt-menu-sep:last-of-type ~ [role="menuitem"]').click()
      await settle(page, 'code')
      await page.waitForTimeout(500)
      notes.code = await read(page)
    },
    async assert(context) {
      const { notes, session } = context
      const { boot, bot, reload, return: returned, code } = notes
      const themed = (state) => state.theme && state.themeSheet && !state.bot
      const besideAccount = (pill) => pill !== null && !pill.hidden && pill.account !== null &&
        pill.rect.left >= pill.account.right && pill.rect.top < pill.account.bottom && pill.rect.bottom > pill.account.top
      return [
        check('以代码一侧启动时本主题拥有页面，页面上没有插件的切换', themed(boot) && !boot.skinSwitch, JSON.stringify(boot)),
        check('ds-bot 自己的按钮把页面交给它，记下的模式是 bot', bot.bot && bot.saved === 'bot' && !bot.theme, JSON.stringify(bot)),
        check('Bot 一侧本主题的样式表、body 标记与其余界面元素全部离开，插件不画切换',
          !bot.theme && !bot.themeSheet && bot.themeMarks.length === 0 && bot.themeNodes === 0 && !bot.skinSwitch,
          JSON.stringify(bot)),
        check('在 Bot 一侧刷新，本主题一帧也没有画出', reload.log.length > 0 && reload.log.every((entry) => !entry.theme) && !reload.theme && reload.bot,
          JSON.stringify(reload.log.slice(0, 12))),
        check('Bot 面唯一的返回入口紧挨账号头像，写着品牌名',
          besideAccount(reload.pill) && reload.pill.text.includes('DeepCraft'),
          JSON.stringify(reload.pill)),
        check('按下返回入口后写入 agent 模式并回到本主题的页面', themed(returned) && returned.saved === 'agent' && !returned.bot,
          JSON.stringify(returned)),
        check('用 ds-bot 自己的菜单项切到 Agent 模式，本主题拿回页面', themed(code) && code.saved === 'agent', JSON.stringify(code)),
        check('ds-bot 的账户菜单没有留在页面上，页面上没有插件的切换', !code.menu && !code.skinSwitch, JSON.stringify(code)),
        check('控制台没有异常', session.problems.length === 0, session.problems.slice(0, 3).join(' | ')),
      ]
    },
  }
}

module.exports = { dsBotScenario }
