import {
  FONT_CODE_ANTHROPIC,
  FONT_CODE_COMMIT,
  FONT_CODE_FIRA,
  FONT_CODE_GEIST,
  FONT_CODE_JETBRAINS,
  FONT_CUSTOM,
  FONT_FOLLOW,
  FONT_HOST,
  FONT_PROSE_ANTHROPIC,
  FONT_PROSE_LITERATA,
  FONT_PROSE_NOTO,
  FONT_PROSE_SOURCE,
  FONT_UI_ANTHROPIC,
  FONT_UI_ATKINSON,
  FONT_UI_FIXEL,
  FONT_UI_GEIST,
  FONT_UI_INTER,
} from '@dsh-deepcraft/contracts/prefs'

/**
 * The font catalogue: every face the package ships, and the family stack each
 * role choice resolves to. The build reads this table to write the
 * `@font-face` registrations and the role rules; the settings page reads the
 * same choices through contracts/prefs.ts. Metrics stay the host's (D81).
 */

/** One bundled face. `weight` is a CSS range on a variable file or one weight on a static cut. */
export interface FontFaceSpec {
  family: string
  file: string
  weight: string
  style?: 'normal' | 'italic'
  format?: 'truetype' | 'truetype-variations' | 'woff2'
}

/** The families every file in the package is registered under. */
export const FONT_FACES: readonly FontFaceSpec[] = [
  { family: 'Anthropic Sans Web Text', file: 'AnthropicSansWebText.ttf', weight: '400', format: 'truetype' },
  { family: 'Anthropic Serif Web Text', file: 'AnthropicSerifWebText.ttf', weight: '400', format: 'truetype' },
  { family: 'Anthropic Mono Web', file: 'AnthropicMonoWeb.ttf', weight: '400', format: 'truetype' },
  { family: 'DeepCraft Inter', file: 'InterVariable.woff2', weight: '100 900' },
  { family: 'DeepCraft Noto Serif', file: 'NotoSerifVariable.woff2', weight: '100 900' },
  { family: 'JetBrains Mono', file: 'JetBrainsMonoVariable.ttf', weight: '100 800', format: 'truetype-variations' },
  { family: 'JetBrains Mono', file: 'JetBrainsMonoItalicVariable.ttf', weight: '100 800', style: 'italic', format: 'truetype-variations' },
  { family: 'DeepCraft Geist Sans', file: 'GeistSansVariable.woff2', weight: '100 900' },
  { family: 'DeepCraft Fixel Text', file: 'FixelText-Regular.woff2', weight: '400' },
  { family: 'DeepCraft Fixel Text', file: 'FixelText-Medium.woff2', weight: '500' },
  { family: 'DeepCraft Fixel Text', file: 'FixelText-SemiBold.woff2', weight: '600' },
  { family: 'DeepCraft Atkinson Hyperlegible', file: 'AtkinsonHyperlegibleNextVariable.woff2', weight: '200 800' },
  { family: 'DeepCraft Source Serif 4', file: 'SourceSerif4Variable.woff2', weight: '200 900' },
  { family: 'DeepCraft Source Serif 4', file: 'SourceSerif4Variable-Italic.woff2', weight: '200 900', style: 'italic' },
  { family: 'DeepCraft Literata', file: 'LiterataVariable.woff2', weight: '200 900' },
  { family: 'DeepCraft Literata', file: 'LiterataVariable-Italic.woff2', weight: '200 900', style: 'italic' },
  { family: 'DeepCraft Geist Mono', file: 'GeistMonoVariable.woff2', weight: '100 900' },
  { family: 'DeepCraft Geist Mono', file: 'GeistMonoVariable-Italic.woff2', weight: '100 900', style: 'italic' },
  { family: 'DeepCraft Fira Code', file: 'FiraCodeVariable.woff2', weight: '300 700' },
  { family: 'DeepCraft Commit Mono', file: 'CommitMono-Regular.woff2', weight: '400' },
  { family: 'DeepCraft Commit Mono', file: 'CommitMono-Italic.woff2', weight: '400', style: 'italic' },
]

/** The CJK and system families every role falls back through. */
export const UI_FALLBACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'
export const PROSE_FALLBACK = 'Georgia, "Times New Roman", "Noto Sans SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif'
export const CODE_FALLBACK = 'ui-monospace, "SF Mono", "Cascadia Mono", Consolas, "Liberation Mono", Menlo, Courier, "PingFang SC", "Microsoft YaHei", monospace'

const inter = `"DeepCraft Inter", ${UI_FALLBACK}`
const geist = `"DeepCraft Geist Sans", ${UI_FALLBACK}`
const fixel = `"DeepCraft Fixel Text", ${UI_FALLBACK}`
const atkinson = `"DeepCraft Atkinson Hyperlegible", ${UI_FALLBACK}`
const anthropicSans = `"Anthropic Sans Web Text", ${inter}`
const notoSerif = `"DeepCraft Noto Serif", ${PROSE_FALLBACK}`
const sourceSerif = `"DeepCraft Source Serif 4", ${PROSE_FALLBACK}`
const literata = `"DeepCraft Literata", ${PROSE_FALLBACK}`
const anthropicSerif = `"Anthropic Serif Web Text", ${notoSerif}`
const jetbrains = `"JetBrains Mono", ${CODE_FALLBACK}`
const geistMono = `"DeepCraft Geist Mono", ${CODE_FALLBACK}`
const firaCode = `"DeepCraft Fira Code", ${CODE_FALLBACK}`
const commitMono = `"DeepCraft Commit Mono", ${CODE_FALLBACK}`
const anthropicMono = `"Anthropic Mono Web", ${jetbrains}`

/** One role's document attribute, CSS property and the stack each choice writes. */
export interface FontRoleSpec {
  attr: string
  property: string
  /** A host token the role also writes, except when the role follows the host. */
  extraProperty?: string
  /** The choice that leaves the host token alone and only points the skin's own token at it. */
  hostChoice?: string
  customProperty: string
  fallback: string
  stacks: Readonly<Record<string, string>>
}

export const FONT_UI_ATTR = 'data-dsh-deepcraft-font-ui'
export const FONT_PROSE_ATTR = 'data-dsh-deepcraft-font-prose'
export const FONT_CODE_ATTR = 'data-dsh-deepcraft-font-code'

export const FONT_ROLES = {
  ui: {
    attr: FONT_UI_ATTR,
    property: '--dsw-font-family',
    customProperty: '--dsh-deepcraft-font-ui-custom',
    fallback: inter,
    stacks: {
      [FONT_UI_INTER]: inter,
      [FONT_UI_GEIST]: geist,
      [FONT_UI_FIXEL]: fixel,
      [FONT_UI_ATKINSON]: atkinson,
      [FONT_UI_ANTHROPIC]: anthropicSans,
      [FONT_CUSTOM]: `var(--dsh-deepcraft-font-ui-custom, ${inter})`,
    },
  },
  prose: {
    attr: FONT_PROSE_ATTR,
    property: '--dsh-deepcraft-font-prose',
    customProperty: '--dsh-deepcraft-font-prose-custom',
    fallback: notoSerif,
    stacks: {
      [FONT_FOLLOW]: 'var(--dsw-font-family)',
      [FONT_PROSE_NOTO]: notoSerif,
      [FONT_PROSE_SOURCE]: sourceSerif,
      [FONT_PROSE_LITERATA]: literata,
      [FONT_PROSE_ANTHROPIC]: anthropicSerif,
      [FONT_CUSTOM]: `var(--dsh-deepcraft-font-prose-custom, ${notoSerif})`,
    },
  },
  code: {
    attr: FONT_CODE_ATTR,
    property: '--dsh-deepcraft-font-code',
    extraProperty: '--ds-font-family-code',
    hostChoice: FONT_HOST,
    customProperty: '--dsh-deepcraft-font-code-custom',
    fallback: jetbrains,
    stacks: {
      [FONT_HOST]: 'var(--ds-font-family-code)',
      [FONT_CODE_JETBRAINS]: jetbrains,
      [FONT_CODE_GEIST]: geistMono,
      [FONT_CODE_FIRA]: firaCode,
      [FONT_CODE_COMMIT]: commitMono,
      [FONT_CODE_ANTHROPIC]: anthropicMono,
      [FONT_CUSTOM]: `var(--dsh-deepcraft-font-code-custom, ${jetbrains})`,
    },
  },
} as const satisfies Record<string, FontRoleSpec>
