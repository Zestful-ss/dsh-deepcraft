<div align="center">

# DeepCraft

**为 DeepSeek Harness 提供可自定义品牌、多套配色与界面交互的外观插件。**

> **默认深海蓝，另有暖橙与森林绿；标志、名称、强调色与宠物都可以换成你自己的。**

[![简体中文](https://img.shields.io/badge/lang-%E7%AE%80%E4%BD%93%E4%B8%AD%E6%96%87-red.svg)](README.md) [![English](https://img.shields.io/badge/lang-English-blue.svg)](README.en.md)

[![GitHub stars](https://img.shields.io/github/stars/Zestful-ss/dsh-deepcraft?style=flat&label=%E2%98%85&color=08C)](https://github.com/Zestful-ss/dsh-deepcraft)
[![license](https://img.shields.io/badge/license-MIT-2EA44F?style=flat)](LICENSE)

</div>

## 预览

三套配色在插件设置里切换，亮暗跟随系统。三套共用同一套版面，切换配色只换颜色，不改标志、名称与宠物；外观页还可以换上自己的标志、文字标志、强调色和宠物。

### 深海蓝（默认）

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/ocean-home-light.png" alt="深海蓝首页 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/ocean-home-dark.png" alt="深海蓝首页 —— 暗色" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/ocean-conversation-light.png" alt="深海蓝 Markdown 对话 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/ocean-conversation-dark.png" alt="深海蓝 Markdown 对话 —— 暗色" /></td>
  </tr>
</table>

### 暖橙

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/ember-home-light.png" alt="暖橙首页 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/ember-home-dark.png" alt="暖橙首页 —— 暗色" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/ember-conversation-light.png" alt="暖橙 Markdown 对话 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/ember-conversation-dark.png" alt="暖橙 Markdown 对话 —— 暗色" /></td>
  </tr>
</table>

### 森林绿

<table>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/forest-home-light.png" alt="森林绿首页 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/forest-home-dark.png" alt="森林绿首页 —— 暗色" /></td>
  </tr>
  <tr>
    <td align="center" width="50%"><img src="./docs/screenshots/forest-conversation-light.png" alt="森林绿 Markdown 对话 —— 亮色" /></td>
    <td align="center" width="50%"><img src="./docs/screenshots/forest-conversation-dark.png" alt="森林绿 Markdown 对话 —— 暗色" /></td>
  </tr>
</table>

> 首页（上），对话界面（下）；浅色在左，深色在右。

### 版面

- 对话页固定使用居中的阅读栏与悬浮圆角输入框；宿主的消息、工具调用和输入框控件保持原位，侧栏页脚里宿主提供的断线提示、更新提示与插件入口照常显示和操作。
- 外观页的「界面层次」决定页面的形状：「浮层」把主对话区抬成一张圆角卡片，输入框、侧栏行与视图标签页随之采用胶囊造型；「平铺」交回宿主的原版排布。
- 首页版面的「浮层」在输入框下方给出浮卡清单：本周用量与走势、继续上次的对话、回到上一条对话、查看本月用量并进入工作台面板，以及最近对话。

### 宠物

- 聊天框右上角的宠物只有一项选择，不随配色或标识变化：默认 Whaledou，也可以选 Crab Buddy、原有的像素螃蟹或像素鲸鱼。
- 设置页的「聊天框宠物包」接受包含 `pet.json` 与图集的文件夹、ZIP 或 Petdex 链接，原文件字节不改动。宠物原画由 Petdex 与各包作者提供，不随本插件发布。

### 模型选择

模型选择器跟随宿主输入框提供的控件；科研工作台等界面隐藏宿主控件时，选择器也会收起。发送消息期间模型选择按钮保持可用。模型目录暂不可用或加载失败时，菜单会给出提示，关闭后重新打开可以重试。

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
