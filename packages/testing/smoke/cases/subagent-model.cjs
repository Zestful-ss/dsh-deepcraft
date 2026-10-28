'use strict'
const { check } = require('./_shared.cjs')

module.exports = {
  /**
   * The composer's subagent model entry, as the host's right seat renders it:
   * the label before and after a pick, the rows the card draws from the allowed
   * list, the check the picked row carries, the count with two picks, and the
   * clear row that puts the entry back. The page answers the entry's own route,
   * so what the entry asked the host for is read off the writes it made.
   */
  'subagent-model'(r) {
    const entry = r.subagentModel || {}
    check('入口在宿主右侧座位里注册并渲染出一个控件',
      entry.present === true && typeof entry.firstText === 'string' && entry.firstText !== '',
      JSON.stringify({ present: entry.present, text: entry.firstText }))
    check('没有选择时入口说的是入口自己的名字',
      entry.state === 'empty' && entry.label === entry.firstText,
      JSON.stringify({ state: entry.state, label: entry.label, text: entry.firstText }))
    check('按下入口后弹层打开，行上带的是勾选语义',
      entry.cardOpen === true && entry.expandedAfterPress === 'true' &&
        entry.rows.length === 3 && entry.rows.every((row) => row.role === 'menuitemcheckbox'),
      JSON.stringify({ open: entry.cardOpen, expanded: entry.expandedAfterPress, rows: entry.rows }))
    check('每行先写模型的目录名，再写所属 provider，目录里没有的模型读作它自己的 id',
      entry.rows[0] !== undefined && entry.rows[0].text === 'DeepSeek-V4.1-Flash' && entry.rows[0].desc === 'DeepSeek' &&
        entry.rows[2] !== undefined && entry.rows[2].text === 'model-the-catalog-lacks' && entry.rows[2].desc === 'other-provider',
      JSON.stringify(entry.rows))
    check('选中一条后入口就显示这一条，那一行带勾、其余不带',
      entry.pickedState === 'chosen' && entry.pickedText === 'DeepSeek-V4.1-Flash' &&
        entry.pickedRows[0].checked === 'true' && entry.pickedRows[1].checked === 'false',
      JSON.stringify({ state: entry.pickedState, text: entry.pickedText, rows: entry.pickedRows }))
    check('选第二条后入口显示数量，无障碍名说的是同一条',
      typeof entry.manyText === 'string' && entry.manyText.indexOf('2') !== -1 && entry.manyLabel === entry.manyText,
      JSON.stringify({ text: entry.manyText, label: entry.manyLabel }))
    check('每次选择都以整份选择写给宿主，会话就是当前这一条',
      entry.writes.length === 3 &&
        JSON.stringify(entry.writes[0]) === JSON.stringify({ session: 'smoke-session', routes: ['deepseek-official/deepseek-flash'] }) &&
        JSON.stringify(entry.writes[1].routes) === JSON.stringify(['deepseek-official/deepseek-flash', 'deepseek-official/deepseek-v4-pro']),
      JSON.stringify(entry.writes))
    check('清除行只在有选择时出现，按下后入口回到未选状态，宿主也不再留下选择',
      entry.hasClear === true && entry.clearedState === 'empty' && entry.stored === 0 &&
        JSON.stringify(entry.writes[entry.writes.length - 1]) === JSON.stringify({ session: 'smoke-session', routes: [] }),
      JSON.stringify({ hasClear: entry.hasClear, state: entry.clearedState, stored: entry.stored, writes: entry.writes }))
  },
}
