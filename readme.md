# 超快的图片后处理工具

## [Demo]()

## 安装

## 功能

### 模糊

```typescript
import { blurImage } from "@gaoding/s-context";

const image = new Image();
image.src =
  "https://st0.dancf.com/gaoding-material/0/images/223463/20191107-203725-leuLE.jpg";
image.onload = () => {
  const resultCanvas = blurImage(image, { value: 10 }); // value 为模糊值
  document.body.appendChild(resultCanvas);
};
```

| Options | Meaning | Range                                     |
| ------- | ------- | ----------------------------------------- |
| 'value' | 模糊值  | 0 ~ 100 模糊值过大会导致 GPU 运行时间过长 |

### 扭曲

```javascript
import { warpImage } from "@gaoding/s-context";

const image = new Image();
image.src =
  "https://st0.dancf.com/gaoding-material/0/images/223463/20191107-203725-leuLE.jpg";
image.onload = () => {
  const resultCanvas = warpImage(image, { value: 10, offset: [0, 0] }); // value 为模糊值
  document.body.appendChild(resultCanvas);
};
```

| Options  | Meaning  | Range                                     |
| -------- | -------- | ----------------------------------------- |
| 'value'  | 扭曲程度 | -100 ~ 100 实际没有上下限，这是推荐上下限 |
| 'offset' | 偏移程度 | [-100 ~ 100，-100~100]                    |

### 消融

```javascript
import { noiseImage } from "@gaoding/s-context";

const image = new Image();
image.src =
  "https://st0.dancf.com/gaoding-material/0/images/223463/20191107-203725-leuLE.jpg";
image.onload = () => {
  const resultCanvas = noiseImage(image, {
    value: 10,
    seed: 0,
    granularity: 50,
  }); // value 为模糊值
  document.body.appendChild(resultCanvas);
};
```

| Options       | Meaning                        | Range   |
| ------------- | ------------------------------ | ------- |
| 'value'       | 消融程度                       | 0 ~ 100 |
| 'seed'        | 随机数种子，用来生成不同的结果 | 0 ~ 1   |
| 'granularity' | 粒度                           | 0 ~ 200 |
