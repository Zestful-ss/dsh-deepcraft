'use strict'
const { check } = require('./_shared.cjs')

module.exports = {
  /**
   * The composer's subagent model entry: the available rows, their selection
   * state, the accessible name and the clear action.
   */
  'subagent-model'(r) {
    const entry = r.subagentModel || {}
    check('按下入口后弹层打开，行上带的是勾选语义',
      entry.cardOpen === true && entry.expandedAfterPress === 'true' &&
        entry.rows.length === 3 && entry.rows.every((row) => row.role === 'menuitemcheckbox'),
      JSON.stringify({ open: entry.cardOpen, expanded: entry.expandedAfterPress, rows: entry.rows }))
    check('每行先写模型的目录名，再写所属 provider，目录里没有的模型读作它自己的 id',
      entry.rows[0] !== undefined && entry.rows[0].text === 'DeepSeek-V4.1-Flash' && entry.rows[0].desc === 'DeepSeek' &&
        entry.rows[2] !== undefined && entry.rows[2].text === 'model-the-catalog-lacks' && entry.rows[2].desc === 'other-provider',
      JSON.stringify(entry.rows))
    check('选中一条后入口说明已选模型，那一行带勾、其余不带',
      entry.pickedState === 'chosen' && typeof entry.pickedLabel === 'string' && entry.pickedLabel.includes('DeepSeek-V4.1-Flash') &&
        entry.pickedRows[0].checked === 'true' && entry.pickedRows[1].checked === 'false',
      JSON.stringify({ state: entry.pickedState, label: entry.pickedLabel, rows: entry.pickedRows }))
    check('选中带档位的路由后展开思考强度列表，先列「不指定」再按强度列出模型声明的档位',
      Array.isArray(entry.effortOptions) && entry.effortOptions.length === 3 &&
        entry.effortOptions[0].inForce === true && entry.effortOptions[0].text !== '' &&
        entry.effortOptions[1].text === 'Low' && entry.effortOptions[2].text === 'High',
      JSON.stringify(entry.effortOptions))
    check('按下某个档位后写入带 reasoningEffort 的路由，并声明新版写入契约',
      entry.effortWritten === 'high' && entry.effortContract === 2 &&
        Array.isArray(entry.effortAfterPick) && entry.effortAfterPick[2].inForce === true,
      JSON.stringify({ effortWritten: entry.effortWritten, contract: entry.effortContract, after: entry.effortAfterPick }))
    check('选第二条后入口的无障碍名说明选择数量',
      typeof entry.manyLabel === 'string' && entry.manyLabel.includes('2'),
      JSON.stringify({ label: entry.manyLabel }))
    check('清除行只在有选择时出现，按下后入口回到未选状态',
      entry.hasClear === true && entry.clearedState === 'empty',
      JSON.stringify({ hasClear: entry.hasClear, state: entry.clearedState }))
  },
}
