import type { SettingsRow, SettingsTab, SettingsView } from './settings-controls'
import { copy } from './copy'

/**
 * The settings page's Sidebar tab: the search box with its style and the
 * workspace pins' own rows, placed here by their manifests (D72); the tab
 * writes no rows itself.
 */
export function createSettingsSidebarTab(): SettingsTab {
  const rows = (_view: SettingsView): SettingsRow[] => {
    return []
  }
  return { id: 'sidebar', label: () => copy('tabSidebar'), rows }
}
