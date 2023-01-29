import { BasicRenderer } from '../src/webgpu';
import { InputBindingApi, Pane } from 'tweakpane';
import { uploadFile, download, getImageBitmap } from './utils';
import './index.css';
import { getGpuDevice } from '../src/utils/utils';
import { ImageUrls } from './assets';

const basicCanvas = <HTMLCanvasElement>document.getElementById('canvas')!;
const w = 1200;
const h = 675;

basicCanvas.width = w;
basicCanvas.height = h;

const PARAMS = {
    blur: 10,
    warp: 1,
    seed: 0,
    noise: 40,
    granularity: 10,
    shadow: 10,
    center: { x: 0, y: 0 },
    backgroundColor: '#88ddff',
    imageIndex: 0,
};

const pane = new Pane();
const bacInputs: InputBindingApi<any, any>[] = [];
const f1 = pane.addFolder({ title: '背景' });
bacInputs.push(f1.addInput(PARAMS, 'backgroundColor', { label: '背景色', view: 'color' }));
const baseInputs: InputBindingApi<any, any>[] = [];

const f2 = pane.addFolder({ title: '消融' });
const f3 = pane.addFolder({ title: '模糊' });
const f4 = pane.addFolder({ title: '扭曲' });
baseInputs.push(f2.addInput(PARAMS, 'noise', { label: '消融强度', min: 0, max: 100 }));
baseInputs.push(f2.addInput(PARAMS, 'granularity', { label: '消融粒度', min: 0, max: 100 }));
baseInputs.push(f2.addInput(PARAMS, 'seed', { label: '消融种子', min: 0, max: 1 }));
baseInputs.push(f3.addInput(PARAMS, 'blur', { label: '模糊强度', min: 0, max: 300 }));
baseInputs.push(f4.addInput(PARAMS, 'warp', { label: '扭曲强度', min: -100, max: 100 }));
baseInputs.push(f4.addInput(PARAMS, 'center', {
    label: '扭曲中心',
    picker: 'inline',
    expanded: true,
    x: { step: 1, min: -100, max: 100 },
    y: { step: 1, min: -100, max: 100 },
}));

const imageInputs: InputBindingApi<any, any>[] = [];
imageInputs.push(pane.addInput(PARAMS, 'imageIndex', { label: '图片', min: 0, max: ImageUrls.length - 1, step: 1 }));
const button1 = pane.addButton({ title: '上传图片' });
const button2 = pane.addButton({ title: '下载图片' });

const ctx = basicCanvas.getContext('2d')!;
let imgBitmap: ImageBitmap;


let url = ImageUrls[PARAMS.imageIndex];
const input: HTMLInputElement = document.createElement('input');
input.type = 'file';
input.accept = "image/png";
input.style.display = "none";

input.addEventListener('change', async () => {
    const files = input.files;
    if (files && files.length) {
        const { url: currentUrl } = await uploadFile(files[0]);
        url = currentUrl;
        deepRender();
    }
})
button1.on('click', () => {
    input.click();
})
button2.on('click', () => {
    download(basicCanvas);
})
deepRender();

let device;
let renderer;

async function render() {

    if (!renderer) {
        device = (await getGpuDevice()).device;
        renderer = new BasicRenderer(device);
    }


    const { width, height } = imgBitmap;
    basicCanvas.width = width;
    basicCanvas.height = height;

    const datas = [
        {
            type: 'noise',
            enable: true,
            params: {
                value: 100 - PARAMS.noise,
                seed: PARAMS.seed,
                granularity: PARAMS.granularity,
            },
        },
        {
            type: 'blur',
            enable: true,
            params: {
                value: PARAMS.blur,
                k: 0,
            },
        },
        {
            type: 'warp',
            enable: true,
            params: {
                value: PARAMS.warp,
                center: PARAMS.center,
            },
        },
    ];

    console.time('render');
    const outCanvas = renderer.render(imgBitmap, datas, url);
    console.timeEnd('render');

    // copyImage(imgBitmap);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(outCanvas, 0, 0);
}

async function deepRender() {
    url = ImageUrls[PARAMS.imageIndex];
    imgBitmap = await getImageBitmap(url);
    render();
}
const body = document.querySelector('body')!;
bacInputs.forEach(input => {
    input.on('change', () => {
        body.style.backgroundColor = PARAMS.backgroundColor;
    });
});

baseInputs.forEach(input => {
    input.on('change', () => {
        render()
    });
});

imageInputs.forEach(input => {
    input.on('change', () => {
        deepRender()
    });
});



