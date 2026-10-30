<div align="center">

# DeepCraft

**为 DeepSeek Harness 提供 Claude 与 DeepSeek 双主题的外观与交互插件。**

> **同一套界面，在 Claude Code Desktop 与 DeepSeek 两种气质之间切换。**

[![简体中文](https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-red.svg)](README.md) [![English](https://img.shields.io/badge/lang-English-blue.svg)](README.en.md)

[![GitHub stars](https://img.shields.io/github/stars/Zestful-ss/dsh-deepcraft?style=flat&label=%E2%98%85&color=08C)](https://github.com/Zestful-ss/dsh-deepcraft)
[![license](https://img.shields.io/badge/license-MIT-2EA44F?style=flat)](LICENSE)

</div>

## 预览

两套主题在插件设置里切换，亮暗跟随系统。两套主题共用布局，并分别搭配强调色、辅助色与中性色；Claude 选用暖灰底色、灰蓝正文链接与余烬橙强调色，DeepSeek 选用冷灰底色、群青链接与长春花蓝强调色；图表分类保留多种易区分的辅助色。

### Claude

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-light.png" alt="Claude 档工作台首页 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-home-dark.png" alt="Claude 档工作台首页 —— 暗色" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-light.png" alt="Claude 档 Markdown 对话 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/claude-conversation-dark.png" alt="Claude 档 Markdown 对话 —— 暗色" /></td>
  </tr>
</table>

> 工作台首页（上），对话界面（下）；浅色在左，深色在右。

### DeepSeek

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-light.png" alt="DeepSeek 档工作台首页 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-home-dark.png" alt="DeepSeek 档工作台首页 —— 暗色" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-light.png" alt="DeepSeek 档 Markdown 对话 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/deepseek-conversation-dark.png" alt="DeepSeek 档 Markdown 对话 —— 暗色" /></td>
  </tr>
</table>

> 输入框上沿站着 Whaledou；原版像素小鲸鱼 Deepy 仍可手动选择，八个状态：

<table>
  <tr>
    <td align="center" width="25%"><img src="./docs/gifs/idle.gif" width="120" alt="空闲" /><br />空闲</td>
    <td align="center" width="25%"><img src="./docs/gifs/thinking.gif" width="120" alt="思考" /><br />思考</td>
    <td align="center" width="25%"><img src="./docs/gifs/typing.gif" width="120" alt="写回答、调用工具" /><br />写回答、调用工具</td>
    <td align="center" width="25%"><img src="./docs/gifs/conducting.gif" width="120" alt="指挥子代理" /><br />指挥子代理</td>
  </tr>
  <tr>
    <td align="center" width="25%"><img src="./docs/gifs/notification.gif" width="120" alt="等你操作" /><br />等你操作</td>
    <td align="center" width="25%"><img src="./docs/gifs/error.gif" width="120" alt="失败" /><br />失败</td>
    <td align="center" width="25%"><img src="./docs/gifs/happy.gif" width="120" alt="完成" /><br />完成</td>
    <td align="center" width="25%"><img src="./docs/gifs/sleeping.gif" width="120" alt="睡着" /><br />睡着</td>
  </tr>
</table>

### 宠物

- 聊天框右上角的宠物按主题分别选择：Claude 默认 Crab Buddy，DeepSeek 默认 Whaledou；原有的像素螃蟹与像素鲸鱼仍在同一行里可选。
- 设置页的「导入宠物包」接受包含 `pet.json` 与图集的文件夹、ZIP 或 Petdex 链接，原文件字节不改动。宠物原画由 Petdex 与各包作者提供，不随本插件发布。

### 子代理模型

启用官方「允许 Agent 为子智能体选择模型」并创建会话后，点击输入框右侧的子代理图标可选择模型。面板会显示完整名称；图标变成主题色表示当前会话已有选择。已选的路由还能各自设思考强度，后续子代理调用会带上同一档位。

## 安装

`lib/` 是构建产物，不随源码提交；发版时打包好的产物放在 `dist` 分支，安装地址写明该分支，或构建本地源码后再加入：

```bash
dsh plugin --profile desktop add https://github.com/Zestful-ss/dsh-deepcraft#dist   # 已构建的发布分支
dsh plugin --profile desktop add <本地目录>                                          # 本地源码，先 npm install && npm run build
```

同一时刻只启用一个主题，装好后重启 DeepSeek Harness。原版 `dsh-claude-style` 仍在时，在插件管理里停用它。

## 字体

> Anthropic 没有公开发行这三款字体；本仓库只提供下载与研究的[副本](https://github.com/Zestful-ss/dsh-deepcraft/tree/master/packages/assets/src/fonts/anthropic)。


启用时二选一：装进系统，或把 `.ttf` 复制到 `$DSH_HOME/dsh-deepcraft/fonts/`。

## 文档

| 文档 | 说明 |
| --- | --- |
| [设计令牌](docs/STYLE.md) | 配色、字体、形状、动效与层级 |
| [架构决策](docs/adr/README.md) | 每条方向一页：背景、决定、后果与重审条件 |
| [更新日志](CHANGELOG.md) | 版本历史 |
| [贡献指南](CONTRIBUTING.md) | 构建、提交规范与回归工具 |

## 鸣谢

- 对话导航参考 SherUnlocked-4869 的 [dsh-plugin-msg-nav](https://github.com/SherUnlocked-4869/dsh-plugin-msg-nav)（MIT）。
- Deepy 的动画帧图来自 calmly-eating-bugs（[@wp3171216237](https://github.com/wp3171216237)）绘制的 Deepy 小鲸鱼主题包。
- 聊天区的增强动效改自 [dsh-chat-ux](https://github.com/alm-allen/dsh-chat-ux)（MIT）。
- Clawd是 Anthropic 的角色形象。帧图不适用 MIT 许可（见 [LICENSE](LICENSE)）。本插件是非官方爱好者作品，与 Anthropic 没有关联。

## 友链

> 想把 Claude Code / Codex 等外部代理的会话历史导入 DSH 接着聊？推荐作者的另一个插件 [dsh-chat-import](https://github.com/Nwflower/dsh-chat-import)。

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Zestful-ss/dsh-deepcraft&type=Date)](https://star-history.com/#Zestful-ss/dsh-deepcraft&Date)
