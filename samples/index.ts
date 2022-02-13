import { warpImage, noiseImage, blurImage, copyImage } from '../src';
import { Pane } from 'tweakpane';
import { uploadFile, download } from './utils';
import './index.css';

const FuncSet = {
    'blur': blurImage,
    'noise': noiseImage,
    'warp': warpImage,
};

const basicCanvas = <HTMLCanvasElement>document.getElementById('canvas')!;
basicCanvas.style.maxWidth = '1200px';
const w = 1200;
const h = 675;

basicCanvas.width = w;
basicCanvas.height = h;

const PARAMS = {
    blur: 40,
    warp: 10,
    seed: 0,
    noise: 40,
    granularity: 10,
    center: { x: 0, y: 0 },
    backgroundColor: '#88ddff',
};

const pane = new Pane();
const bacInputs = [];
const f1 = pane.addFolder({ title: '背景' });
bacInputs.push(f1.addInput(PARAMS, 'backgroundColor', { label: '背景色', view: 'color' }));
const baseInputs = [];

const f2 = pane.addFolder({ title: '消融' });
const f3 = pane.addFolder({ title: '模糊' });
const f4 = pane.addFolder({ title: '扭曲' });
baseInputs.push(f2.addInput(PARAMS, 'noise', { label: '消融强度', min: 0, max: 100 }));
baseInputs.push(f2.addInput(PARAMS, 'granularity', { label: '消融粒度', min: 0, max: 100 }));
baseInputs.push(f2.addInput(PARAMS, 'seed', { label: '消融种子', min: 0, max: 1 }));
baseInputs.push(f3.addInput(PARAMS, 'blur', { label: '模糊强度', min: 0, max: 200 }));
baseInputs.push(f4.addInput(PARAMS, 'warp', { label: '扭曲强度', min: -100, max: 100 }));
baseInputs.push(f4.addInput(PARAMS, 'center', {
    label: '扭曲中心',
    picker: 'inline',
    expanded: true,
    x: { step: 1, min: -100, max: 100 },
    y: { step: 1, min: -100, max: 100 },
}));

const imageInputs = [];
const button1 = pane.addButton({ title: '上传图片' });
const button2 = pane.addButton({ title: '下载图片' });

const ctx = basicCanvas.getContext('2d');
let imgBitmap: ImageBitmap;
let url = 'https://st0.dancf.com/gaoding-material/0/images/223463/20191107-203725-leuLE.jpg';
const input: HTMLInputElement = document.createElement('input');
input.type = 'file';
input.accept = "image/png";
input.style.display = "none";

input.addEventListener('change', async () => {
    if (input.files.length) {
        const { url: currentUrl } = await uploadFile(input.files[0]);
        url = currentUrl;
        deepRender();
    }
})
document.body.appendChild(input);
button1.on('click', () => {
    input.click();
})
button2.on('click', () => {
    console.log(111);
    download(canvas);
})
deepRender();

async function render() {
    const { width, height } = imgBitmap;
    basicCanvas.width = width;
    basicCanvas.height = height;

    const datas = [
        {
            type: 'noise',
            enable: PARAMS.noise > 0,
            params: {
                value: 100 - PARAMS.noise,
                seed: PARAMS.seed,
                granularity: PARAMS.granularity,
            },
        },
        // {
        //     type: 'blur',
        //     enable: PARAMS.blur > 0,
        //     params: {
        //         value: PARAMS.blur,
        //         k: 0,
        //     },
        // },
        {
            type: 'warp',
            enable: PARAMS.warp > 0 || PARAMS.warp < 0,
            params: {
                value: PARAMS.warp,
                center: PARAMS.center,
            },
        },
    ];

    let currentImg: ImageBitmap | HTMLCanvasElement = imgBitmap;
    for (let i = 0; i < datas.length; i++) {
        const { type, enable, params } = datas[i];
        console.time(type);
        if (enable) {
            const func = FuncSet[type];
            if (func) {
                currentImg = await func(currentImg instanceof ImageBitmap ? currentImg : await createImageBitmap(currentImg), params);
            }
        }
        console.timeEnd(type);
    }

    // copyImage(imgBitmap);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(currentImg, 0, 0);
}

async function deepRender() {
    const response = await fetch(url);
    const bitmapSource = await response.blob();
    imgBitmap = await createImageBitmap(bitmapSource);
    render();
}
const body = document.querySelector('body');
bacInputs.forEach(input => {
    input.on('change', () => {
        body.style.backgroundColor = PARAMS.backgroundColor;
    });
});

baseInputs.forEach(input => {
    input.on('change', () => {
        render();
    });
});
