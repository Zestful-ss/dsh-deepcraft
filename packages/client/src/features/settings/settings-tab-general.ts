import type { SettingsTab, SettingsView } from './settings-controls'
import { copy } from './copy'
import { copy as subagentCopy } from '../subagent-model/copy'

/**
 * The settings page's General tab: the subagent model rows — the input area's
 * own entry for the routes one session delegates on, and the rule under it
 * that makes an explicit provider+model pair mandatory. The picker's lines
 * come from the feature's own copy; the rule's lines lived in the removed
 * model feature's copy and are kept in this page's.
 *
 * Each tab is a `{ id, label, rows(view) }` record: `rows` runs on every
 * render of the page (packages/client/src/features/settings/settings.ts) with the page's view.
 */
export function createSettingsGeneralTab(): SettingsTab {
  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    return [
      {
        rank: 50,
        node: controls.row(
          'subagentModelPicker',
          subagentCopy('pickerTitle'),
          subagentCopy('pickerDesc'),
          controls.toggle(prefs.subagentModelPicker !== false, value => { write({ subagentModelPicker: value }) }),
        ),
      },
      {
        rank: 60,
        node: controls.subRow(
          'subagentModelChoice',
          copy('subagentModelChoiceTitle'),
          copy('subagentModelChoiceDesc'),
          controls.toggle(prefs.subagentModelChoice !== false, value => { write({ subagentModelChoice: value }) }),
          prefs.subagentModelPicker !== false,
        ),
      },
    ]
  }
  return { id: 'general', label: () => copy('tabGeneral'), rows }
}
