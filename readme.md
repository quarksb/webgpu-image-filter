# WebGPU image filter

[Preview online](https://quarksb.github.io/image-cooker/)

这是一个用来展示 webgpu 在图片处理方面应用的 demo，但由于 webgpu API 还不稳定，本地都需要经常修改 API 才能跟上金丝雀的脚步，所以本项目的效果目前也还不稳定，目前仅供学习交流。

目前提供三个图片处理效果，分别是图片消融，图片模糊，图片扭曲，后续在 webgpu API 稳定之后会做成一个图像处理工具

本项目因为向 chrome [申请了 webgpu 测试](https://developer.chrome.com/origintrials/#/view_trial/118219490218475521)（通过页面 meta 信息申明），所以在 chrome 98(其他版本不保证不报错) 上也可以看到效果，
但实际上 chrome 预期再 2022 年 5 月 18 才能正式上线 webgpu。 但是因为 chrome 和 chrome canary 目前 wgsl 语法版本相差较大，为了让更多的人能看到效果，采用了比较老版本的语法，在 canary 上会有许多的 warning.

说下总得使用感受，webGPU 比 webgl 更强大，但操作起来更费事，相比之下，webGPU 能做的事情更多，但我们需要了解得越更多，比如 webgpu 可是使用纯计算的 compute shader，这能加速大规模的数据运算， 但是同时你也需要自己去调度 gpu 的运算核，对于习惯使用自动档（webgl）的老司机而言，手动档汽车还是需要需要熟悉一下才能上路。

祝大家虎年身体健康虎虎生威！
如果你想查看更多 webgpu 相关的资料请查看 [awesome-webgpu](https://github.com/mikbry/awesome-webgpu)
