import { createHostResource } from '@dsh-deepcraft/engine/resource'
import type { HostAnswer } from '@dsh-deepcraft/engine/resource'

/**
 * Model & settings localized copy.
 *
 * The copy itself is NOT here. It ships as `model-descriptions.json` beside
 * the bundle, and the browser half fetches it at runtime (the host half
 * serves it under MODEL_COPY_ROUTE), so the model table grows without a
 * rebuild and no copy enters the bundle. The language comes from the shell's
 * own `locale` service — one line per row, in the language the rest of the
 * UI is in — never two languages stacked.
 */
const MODEL_COPY_ROUTE = '/dsh-deepcraft/model-descriptions.json'
const MODEL_COPY_FALLBACK_LOCALE = 'en'

/** One `{ locale: text }` pair of the copy document. */
export type CopyPair = Record<string, string>

/** A family or tier rule: a model-id pattern and the line every id it claims reads. */
export interface CopyRule {
  re: RegExp
  text?: CopyPair
}

/** The copy document, indexed for lookups (indexModelCopy). */
export interface ModelCopyIndex {
  fallback: string
  families: CopyRule[]
  tiers: CopyRule[]
  providerBrands: Record<string, string>
  brandRules: { re: RegExp, brand: string }[]
}

/**
 * The copy document the host half serves, indexed once. Both the model
 * surfaces and the settings section (packages/client/src/features/settings/settings.ts)
 * consume this copy, so the state lives in shared/.
 */
export let modelCopy: ModelCopyIndex | null = null

/**
 * The model copy document the host half serves. A document that does not
 * index is not adopted: the bundle's English constants stay.
 */
const modelCopyResource = createHostResource(MODEL_COPY_ROUTE, (doc) => {
  const indexed = indexModelCopy(doc)
  if (indexed === null) return undefined
  modelCopy = indexed
  return modelCopy
})

export function onModelCopyLoaded(listener: (copy: ModelCopyIndex) => void) {
  return modelCopyResource.onLoaded(listener)
}

/**
 * Fetch the model copy document the host half serves.
 */
export function loadModelCopy() {
  modelCopyResource.load()
}

/**
 * Compile a copy document into the shape lookups want: the rule lists with
 * their regexps built once.
 * @param doc - parsed document, as validated by the build.
 * @returns the index, or null when the document is unusable.
 */
function indexModelCopy(doc: HostAnswer): ModelCopyIndex | null {
  if (!doc || typeof doc !== 'object') return null
  // The build validated the document's shape before it shipped (D5); a block
  // that is missing reads as empty.
  const table = <T>(value: unknown) => (value && typeof value === 'object' ? value : {}) as Record<string, T>
  const brands = table<unknown>(doc.brands)
  const index: ModelCopyIndex = {
    fallback: typeof doc.fallback === 'string' && doc.fallback ? doc.fallback : MODEL_COPY_FALLBACK_LOCALE,
    families: [],
    tiers: [],
    providerBrands: table(brands.providers),
    brandRules: [],
  }
  const compile = (rules: unknown) => {
    const out: CopyRule[] = []
    const list = Array.isArray(rules) ? rules : []
    for (let i = 0; i < list.length; i++) {
      const rule = list[i]
      if (rule === null || typeof rule !== 'object' || !('match' in rule) || typeof rule.match !== 'string') continue
      // The build compiles every rule before it ships the document.
      out.push({ re: new RegExp(rule.match, 'i'), text: 'text' in rule ? rule.text as CopyPair | undefined : undefined })
    }
    return out
  }
  index.families = compile(doc.families)
  index.tiers = compile(doc.tiers)
  // Brand rules carry no copy, only the mark's id; the build has already
  // checked every id against the vendored marks.
  const brandRules: ModelCopyIndex['brandRules'] = []
  const models = Array.isArray(brands.models) ? brands.models : []
  for (let b = 0; b < models.length; b++) {
    const brandRule = models[b]
    if (brandRule === null || typeof brandRule !== 'object' || !('match' in brandRule) || !('brand' in brandRule)) continue
    if (typeof brandRule.match !== 'string' || typeof brandRule.brand !== 'string') continue
    brandRules.push({ re: new RegExp(brandRule.match, 'i'), brand: brandRule.brand })
  }
  index.brandRules = brandRules
  return index
}

/** Fold case and separators so `glm-5.3-flash` and `glm-5-3-flash` agree. */
export function normalizeModelId(id: unknown) {
  return String(id === undefined || id === null ? '' : id).toLowerCase().replace(/[^a-z0-9]/g, '')
}
