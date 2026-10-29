<div align="center">

# DeepCraft

**A Claude and DeepSeek dual-theme plugin for the DeepSeek Harness Web GUI.**

> **One interface, two temperaments: Claude Code Desktop and DeepSeek.**

[![English](https://img.shields.io/badge/lang-English-blue.svg)](README.en.md) [![简体中文](https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-red.svg)](README.md)

[![GitHub stars](https://img.shields.io/github/stars/Zestful-ss/dsh-deepcraft?style=flat&label=%E2%98%85&color=08C)](https://github.com/Zestful-ss/dsh-deepcraft)
[![license](https://img.shields.io/badge/license-MIT-2EA44F?style=flat)](LICENSE)

</div>

## Preview

The settings page switches between the two palettes; light and dark follow the system. Both themes share layouts with dedicated accent, auxiliary and neutral palettes: Claude pairs warm gray grounds with slate-blue prose links and ember orange accents, while DeepSeek pairs cool gray grounds with ultramarine links and periwinkle accents; categorical charts preserve multiple easily distinguishable auxiliary colors.

### Claude

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-light.png" alt="Claude brand, Studio home — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-dark.png" alt="Claude brand, Studio home — dark" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-light.png" alt="Claude brand, Markdown conversation — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-dark.png" alt="Claude brand, Markdown conversation — dark" /></td>
  </tr>
</table>

> Studio home above, Markdown conversation below; light on the left, dark on the right. Ivory canvas `#FCFCFB`, warm black `#141413`, ember orange `#D97757` for every action, and Claude Code's pixel crab on the composer.

### DeepSeek

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-light.png" alt="DeepSeek brand, Studio home — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-dark.png" alt="DeepSeek brand, Studio home — dark" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-light.png" alt="DeepSeek brand, Markdown conversation — light" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-dark.png" alt="DeepSeek brand, Markdown conversation — dark" /></td>
  </tr>
</table>

> Sky-blue canvas `#F7FAFF`, blue-black `#13161D`, DeepSeek blue `#4D6BFE`; Whaledou stands on the composer, with the original pixel whale Deepy still selectable, in eight states:

<table>
  <tr>
    <td align="center" width="25%"><img src="./docs/gifs/idle.gif" width="120" alt="Idle" /><br />Idle</td>
    <td align="center" width="25%"><img src="./docs/gifs/thinking.gif" width="120" alt="Thinking" /><br />Thinking</td>
    <td align="center" width="25%"><img src="./docs/gifs/typing.gif" width="120" alt="Answering and calling tools" /><br />Answering and calling tools</td>
    <td align="center" width="25%"><img src="./docs/gifs/conducting.gif" width="120" alt="Conducting subagents" /><br />Conducting subagents</td>
  </tr>
  <tr>
    <td align="center" width="25%"><img src="./docs/gifs/notification.gif" width="120" alt="Waiting on you" /><br />Waiting on you</td>
    <td align="center" width="25%"><img src="./docs/gifs/error.gif" width="120" alt="Failed" /><br />Failed</td>
    <td align="center" width="25%"><img src="./docs/gifs/happy.gif" width="120" alt="Finished" /><br />Finished</td>
    <td align="center" width="25%"><img src="./docs/gifs/sleeping.gif" width="120" alt="Asleep" /><br />Asleep</td>
  </tr>
</table>

> The workspaces, sessions, usage figures and nickname in the screenshots are sample data.

### Pets

- The composer pet is chosen per theme: Crab Buddy under Claude and Whaledou under DeepSeek, with the original pixel crab and whale still selectable in the same row.
- "Import a pet package" in the settings page takes a folder, a ZIP or a Petdex link holding `pet.json` and an atlas, keeping the original bytes. The pet art belongs to Petdex and each package's author and is not shipped with this plugin.

### Subagent models

After enabling the host's subagent model selection and creating a session, use the subagent icon beside the composer to choose models. The panel shows complete names, and a dot on the icon marks a selection for the current session. Each picked route can also carry its own reasoning effort, which later subagent calls then pass along.

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
