# WebGPU image filter

[Preview online](https://quarksb.github.io/webgpu-image-filter/)

这是一个用来展示 webgpu 在图片处理方面应用的 demo，但由于 webgpu API 还不稳定，本地都需要经常修改 API 才能跟上 canary 的脚步，所以本项目的效果目前也还不稳定，目前仅供学习交流。

目前提供三个图片处理效果，分别是图片消融，图片模糊，图片扭曲，后续在 webgpu API 稳定之后会做成一个图像处理工具

本项目因为向 chrome [申请了 webgpu 测试](https://developer.chrome.com/origintrials/#/view_trial/118219490218475521)（通过页面 meta 信息申明），所以在 chrome 108(其他版本不保证不报错) 上也可以看到效果，
但实际上 chrome 预期在 115 版本才正式支持 webgpu(我刚关注的时候说是 101 版本，也就鸽了那么两年
:smile: .

如果你想查看更多 webgpu 相关的资料请查看 [awesome-webgpu](https://github.com/mikbry/awesome-webgpu)
