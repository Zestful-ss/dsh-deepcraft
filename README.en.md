<div align="center">

# DeepCraft

**Customizable branding, color palettes and interactions for the DeepSeek Harness Web GUI.**

> **Ocean blue by default, with Warm ember and Forest green beside it; the mark, name, accent and pet can all be your own.**

[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.en.md) [![简体中文](https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-red.svg)](README.md)

[![GitHub stars](https://img.shields.io/github/stars/Zestful-ss/dsh-deepcraft?style=flat&label=%E2%98%85&color=08C)](https://github.com/Zestful-ss/dsh-deepcraft)
[![license](https://img.shields.io/badge/license-MIT-2EA44F?style=flat)](LICENSE)

</div>

## Preview

The settings page switches between three palettes; light and dark follow the system. They share every layout, and switching changes colours alone — not the mark, the name or the pet. The Appearance tab also takes your own mark, wordmark, accent colour and pet.

### Ocean blue (default)

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/ocean-home-light.png" alt="Ocean blue, home — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/ocean-home-dark.png" alt="Ocean blue, home — dark" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/ocean-conversation-light.png" alt="Ocean blue, Markdown conversation — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/ocean-conversation-dark.png" alt="Ocean blue, Markdown conversation — dark" /></td>
  </tr>
</table>

### Warm ember

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/ember-home-light.png" alt="Warm ember, home — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/ember-home-dark.png" alt="Warm ember, home — dark" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/ember-conversation-light.png" alt="Warm ember, Markdown conversation — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/ember-conversation-dark.png" alt="Warm ember, Markdown conversation — dark" /></td>
  </tr>
</table>

### Forest green

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/forest-home-light.png" alt="Forest green, home — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/forest-home-dark.png" alt="Forest green, home — dark" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/forest-conversation-light.png" alt="Forest green, Markdown conversation — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/forest-conversation-dark.png" alt="Forest green, Markdown conversation — dark" /></td>
  </tr>
</table>

> Home above, Markdown conversation below; light on the left, dark on the right.

### Layout

- The conversation page keeps a centred reading column and a floating rounded composer; the host's message, tool and composer controls stay in place, and the host's connection, update and plugin controls in the sidebar footer stay visible and operable.
- The Appearance tab's "Page look" sets the page's shape: "Floating" lifts the conversation area into a rounded card, and the composer, the sidebar rows and the view tabs take pill shapes with it; "Flat" hands the page back to the host's own arrangement.
- The home layout's "Floating" form draws a deck under the composer: this week's usage with its trend, the conversation to continue, the one before it, the month's usage leading into the Studio panel, and the recent conversations.

### Pets

- The composer pet is one choice, changed by neither palette nor brand: Whaledou by default, or Crab Buddy, the original pixel crab or the pixel whale.
- "Chat pet package" in the settings page takes a complete package — a folder, a ZIP or a Petdex link holding `pet.json` and an atlas — keeping the original bytes. The pet art belongs to Petdex and each package's author and is not shipped with this plugin.

### Model selection

The model picker follows the control provided by the host composer and leaves the slot when a surface such as Research Workbench hides it. The model button remains available while a message is being sent. If the model directory is unavailable or fails to load, the menu explains the problem; close and reopen it to retry.

### Subagent models

After enabling the host's subagent model selection and creating a session, use the subagent icon beside the composer to choose models. The panel shows complete names, and the icon taking the accent marks a selection for the current session. Each picked route can also carry its own reasoning effort, which later subagent calls then pass along.

## Installation

`lib/` is build output and does not travel with the sources; the packaged release lives on the `dist` branch, so the address names that branch, or build the source checkout first:

```bash
dsh plugin --profile desktop add https://github.com/Zestful-ss/dsh-deepcraft#dist   # the built release branch
dsh plugin --profile desktop add <local path>                                       # source checkout, after npm install && npm run build
```

Keep one theme enabled at a time, and restart DeepSeek Harness afterwards. When the original `dsh-claude-style` is still installed, disable it in the plugin manager.

## Fonts

> The Anthropic fonts have no public release; this repository only offers [copies](https://github.com/Zestful-ss/dsh-deepcraft/tree/master/packages/assets/src/fonts/anthropic) for download and study.

To enable them, install the `.ttf` files on your system, or copy them into `$DSH_HOME/dsh-deepcraft/fonts/`.

## Documentation

| Document | Contents |
| --- | --- |
| [Design tokens](docs/STYLE.md) | The palette, typography, shape, motion and layer rules |
| [Architecture decisions](docs/adr/README.md) | One page per direction: background, decision, consequences, revisiting conditions |
| [Changelog](CHANGELOG.md) | Version history |
| [Contributing](CONTRIBUTING.md) | Building from `packages/client/src/`, commit conventions, and the screenshot and regression tooling |

## Acknowledgements

- The conversation navigator follows SherUnlocked-4869's [dsh-plugin-msg-nav](https://github.com/SherUnlocked-4869/dsh-plugin-msg-nav) (MIT).
- The animation frames of Deepy the pixel whale come from the Deepy whale theme pack drawn by calmly-eating-bugs ([@wp3171216237](https://github.com/wp3171216237)), and ship with the plugin by the author's permission; GIFs of all 20 animations are in [docs/gifs/](docs/gifs/).
- The enhanced animations in the chat area are modified from [dsh-chat-ux](https://github.com/alm-allen/dsh-chat-ux) (MIT).
- Clawd is a character of Anthropic. Its frames are not covered by the MIT license (see [LICENSE](LICENSE)). This plugin is an unofficial fan work, not affiliated with or endorsed by Anthropic.

## Related projects

> Running several themes at once? Try [dsh-skin-manager](https://github.com/xiaoyangcheng84-svg/dsh-skin-manager) — it switches between all installed themes from a single settings page.

> Want to import your Claude Code / Codex session history into DSH and keep the conversation going? Try the author's other plugin, [dsh-chat-import](https://github.com/Nwflower/dsh-chat-import).

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Zestful-ss/dsh-deepcraft&type=Date)](https://star-history.com/#Zestful-ss/dsh-deepcraft&Date)
