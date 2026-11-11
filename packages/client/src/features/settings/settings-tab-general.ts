import * as React from 'react'
import { AUTO_POPOVER_ACCOUNT, AUTO_POPOVER_ALL, AUTO_POPOVER_OFF, USERNAME_MAX } from '../../constants'
import type { Prefs } from '../../constants'
import type { SegmentOption, SettingsTab, SettingsView } from './settings-controls'
import { copy } from './copy'
import { copy as subagentCopy } from '../subagent-model/copy'

/**
 * The settings page's General tab: the username, the hover-open popovers and
 * the subagent model rows — the input area's own entry for the routes one
 * session delegates on, and the rule under it that makes an explicit
 * provider+model pair mandatory. The picker's lines come from the feature's
 * own copy; the rule's lines lived in the removed model feature's copy and
 * are kept in this page's.
 *
 * Each tab is a `{ id, label, rows(view) }` record: `rows` runs on every
 * render of the page (packages/client/src/features/settings/settings.ts) with the page's
 * view — the preferences, the write path, the controls and the username
 * field's state.
 */
export function createSettingsGeneralTab(): SettingsTab {
  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const controls = view.controls
    const autoPopoverOptions: SegmentOption<Prefs['autoPopover']>[] = [
      { value: AUTO_POPOVER_OFF, label: copy('autoPopoverOff') },
      { value: AUTO_POPOVER_ACCOUNT, label: copy('autoPopoverAccount') },
      { value: AUTO_POPOVER_ALL, label: copy('autoPopoverAll') },
    ]
    const username = view.username
    return [
      {
        rank: 20,
        node: controls.row(
          'username',
          copy('usernameTitle'),
          copy('usernameDesc'),
          React.createElement('input', {
            type: 'text',
            className: 'dsh-deepcraft-settings-input',
            value: username.value,
            maxLength: USERNAME_MAX,
            placeholder: copy('usernamePlaceholder'),
            spellCheck: false,
            autoComplete: 'off',
            onChange: username.onChange,
            onBlur: username.onBlur,
            onKeyDown: username.onKeyDown,
          }),
        ),
      },
      {
        rank: 40,
        node: controls.row(
          'autoPopover',
          copy('autoPopoverTitle'),
          null,
          controls.segment(autoPopoverOptions, prefs.autoPopover, value => { write({ autoPopover: value }) }),
        ),
      },
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
