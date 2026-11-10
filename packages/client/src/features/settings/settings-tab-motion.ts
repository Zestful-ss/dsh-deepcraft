import * as React from 'react'
import { MOTION_FULL, MOTION_REDUCED, MOTION_SYSTEM } from '../../constants'
import type { Prefs } from '../../constants'
import type { SegmentOption, SettingsTab, SettingsView } from './settings-controls'
import { copy } from './copy'

/**
 * The settings page's Motion tab: the animation choice every motion reads and
 * the rows the features themselves place here (D72).
 */
export function createSettingsMotionTab(): SettingsTab {

  function rows(view: SettingsView) {
    const prefs = view.prefs
    const write = view.write
    const motionOptions: SegmentOption<Prefs['motion']>[] = [
      { value: MOTION_SYSTEM, label: copy('motionSystem') },
      { value: MOTION_REDUCED, label: copy('motionReduced') },
      { value: MOTION_FULL, label: copy('motionFull') },
    ]
    return [
      {
        rank: 5,
        node: view.controls.row(
          'motion',
          copy('motionTitle'),
          null,
          view.controls.segment(motionOptions, prefs.motion, value => { write({ motion: value }) }),
        ),
      },
    ]
  }
  return { id: 'motion', label: () => copy('tabMotion'), rows }
}
