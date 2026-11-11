import { installScheduler as installEngineScheduler } from '@dsh-deepcraft/engine/scheduler'
import type { FeatureHandle, SchedulerCalls } from '@dsh-deepcraft/engine/scheduler'
import { onModelCopyLoaded } from '../shared/model-copy'
import { loadPrefs, refreshMotionAttribute, subscribePrefs } from './prefs'
import type { HostContext } from '@dsh-deepcraft/engine/host'

/**
 * Every feature's handle, under the name it registers on `ui` (its manifest's
 * `handle`, or its `id`). A feature that other features read publishes a
 * handle type of its own; the others are plain scheduler hooks.
 */
export interface Handles {
  brand: FeatureHandle
  mascot: FeatureHandle
  subagentModel: FeatureHandle
  workspacePins: FeatureHandle
  settingsNav: FeatureHandle
}

export type HandleName = keyof Handles

/** The two calls on `ui` that are no feature's: entry.ts and the scheduler put them there. */
export interface UiCalls {
  /** Ask for a pass on the next frame (installScheduler). */
  schedule?: () => void
  /** Switch one feature off for the rest of this generation (entry.ts). */
  retire: (name: string) => void
}

/**
 * The whole registry, as entry.ts and the scheduler hold it: each installed
 * feature's handle under its handle name. A feature sees only its own part of
 * it (FeatureUi in core/feature.ts): its handle and the ones its manifest
 * `reads`.
 */
export type Ui = SchedulerCalls & { [K in HandleName]?: Handles[K] }

/** Run the engine's scheduler over this skin's features, listening to the sources that change what they show. */
export function installScheduler(ctx: HostContext, ui: Ui, features: HandleName[]) {
  return installEngineScheduler<HandleName>(ctx, ui, features, {
    copyChange: [subscribePrefs, onModelCopyLoaded],
    start: loadPrefs,
    systemMotionChanged: refreshMotionAttribute,
  })
}
