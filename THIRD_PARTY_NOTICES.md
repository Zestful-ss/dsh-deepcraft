# Third-Party Notices

This package includes material from the projects below. Each keeps its own license; the MIT license of this package does not relicense it.

## Petdex

Pet packages are downloaded at runtime or imported by the reader; their art belongs to Petdex and each package's author and is not shipped by this package.

Source: <https://github.com/crafter-station/petdex>

```
MIT License

Copyright (c) 2026 Crafter Station

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Lobe Icons

The vendor lockups the model picker draws (`packages/assets/src/icons/combine/`, inlined into `lib/client.js`) are composed by `scripts/fetch-lobe-combines.py`: most from Lobe Icons (`@lobehub/icons-static-svg` ships each vendor's mono mark, colour mark and wordmark, and `@lobehub/icons` carries each vendor's brand colour and which artwork variants exist), the rest — OpenAI's and Reflection's — from artwork the repository carries under `packages/assets/src/icons/`. Brand names and logos remain trademarks of their respective owners.

Source: <https://github.com/lobehub/lobe-icons>

The DeepSeek whale and wordmark in `packages/assets/src/brand/` are the host product's own
marks, carried here so the skin can paint its brand area; they remain DeepSeek's trademarks.

```
MIT License

Copyright (c) 2023 LobeHub

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Bundled fonts

The package ships these Latin faces under the SIL Open Font License 1.1:
Inter, Geist Sans, Geist Mono, Fixel Text, Atkinson Hyperlegible Next, Noto
Serif, Source Serif 4, Literata, JetBrains Mono, Fira Code and Commit Mono.
The copyright notices and the full licence travel beside each file as
`packages/assets/src/fonts/OFL-*.txt`; the Anthropic faces are not shipped and a
user's own copies remain subject to Anthropic's terms.

Sources: MacPaw's Fixel release and the Fontsource distributions of Inter, Geist, Geist Mono, Atkinson
Hyperlegible Next, Noto Serif, Source Serif 4, Literata, JetBrains Mono, Fira
Code and Commit Mono; Fixel Text from MacPaw's Fixel release.

## transitions.dev

Three of the transitions this skin carries are ported, each into this package's
own classes, attributes and motion tokens, with the snippet's
`prefers-reduced-motion` guard answered by the skin's animation choice: "Menu
dropdown" (the popover cards in `packages/client/src/shared/popover.css` — its
pre-open and closing scales and its curve, the closing state carried by the
separate `scale` property instead of a class), "Page side-by-side" (the settings
tabs, `packages/client/src/features/settings/` — the page leaving is a still copy
of its rows), and "Toggle" (the settings switch's knob and its bounce,
`packages/client/src/features/settings/settings.css`).

Source: <https://transitions.dev/detail.html?t=menu-dropdown> · <https://transitions.dev/detail.html?t=page-side-by-side> · <https://transitions.dev/detail.html?t=toggle> · <https://github.com/Jakubantalik/transitions.dev>

```
Transitions.dev License
Copyright (c) 2026 Jakub Antalik / Transitions.dev

Summary: you (and any coding agent working for you) may use the transitions
and skills in this repository in unlimited personal and commercial projects,
modify them freely, and ship them to your users. The tooling is MIT. The one
restriction is that you may not redistribute the transitions library itself
as a competing product.

Permission is granted, free of charge, to any person or automated agent
obtaining these transitions to:

  - use them in unlimited personal and commercial projects;
  - copy, paste, and modify them freely;
  - ship them to end users as part of your own product or website;
  - install and run the skills in any coding agent (Claude Code, Cursor,
    GitHub Copilot, Codex, Gemini CLI, and others) to apply the transitions
    to your code.

Restriction: you may not redistribute the library itself. You may not
repackage, resell, or publish the collection (or a substantial part of it) as
a competing transitions library, motion pack, or animation kit. Use the
transitions in your products, not as a product of their own.

Full terms: https://transitions.dev/terms.html
```
