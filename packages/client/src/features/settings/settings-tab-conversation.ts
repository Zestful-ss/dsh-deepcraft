import type { SettingsRow, SettingsTab, SettingsView } from './settings-controls'
import { copy } from './copy'

/**
 * The settings page's Conversation tab: the chat-area switch, the waiting
 * line and its detail choice, the conversation navigator, the session
 * figures' position, the Chat / Trajectory tab strip and the Windows
 * title-bar band are feature switches placed here by their manifests (D72).
 */
export function createSettingsConversationTab(): SettingsTab {
  function rows(_view: SettingsView): SettingsRow[] {
    return []
  }
  return { id: 'conversation', label: () => copy('tabConversation'), rows }
}
