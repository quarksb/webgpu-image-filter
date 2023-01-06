import { BasicRenderer } from '../src/webgpu';
import { InputBindingApi, Pane } from 'tweakpane';
import { uploadFile, download } from './utils';
import { LRUMap } from 'lru_map';
import './index.css';
import { getCanvas, getGpuDevice } from '../src/utils/utils';

const basicCanvas = <HTMLCanvasElement>document.getElementById('canvas')!;
basicCanvas.style.maxWidth = '1200px';
const w = 1200;
const h = 675;

basicCanvas.width = w;
basicCanvas.height = h;

const PARAMS = {
    blur: 40,
    warp: 1,
    seed: 0,
    noise: 40,
    granularity: 10,
    shadow: 10,
    center: { x: 0, y: 0 },
    backgroundColor: '#88ddff',
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

const ctx = basicCanvas.getContext('2d')!;
let imgBitmap: ImageBitmap;
const ImageUrls = [
    'https://st0.dancf.com/gaoding-material/0/images/223463/20191107-203725-leuLE.jpg',
    'https://st0.dancf.com/gaoding-material/0/images/372765/20200428-184157-CC9C5C33-7193-54B7-8D32-FB0D309706DD.jpg',
    'https://st0.dancf.com/gaoding-material/0/images/354320/20200108-213408-ADZNv.jpg',
    'https://gd-filems.dancf.com/gaoding/gaoding/15004/88567b2b-9e8b-4e15-9347-03aef654e1d813604450.png',
    'https://gd-filems.dancf.com/gaoding/gaoding/15004/0aef368c-7fb8-4d97-98db-abb053b69a9313604467.png',
    'https://gd-filems-fat.my-static.dancf.com/saas/40eds5/43368/76512881-9bf9-4f95-9355-23cdee5f032d4184.png',
    'https://gd-filems.dancf.com/saas/xi19e5/2269/f9b57bad-de39-4a10-ae93-93ab27428cab17679446.jpg',
    'https://gd-filems.dancf.com/gaoding/gaoding/2269/d1275156-5a66-44a0-8109-4a639c77ac3d92.jpeg',
    'https://gd-filems.dancf.com/gaoding/gaoding/2269/5b043889-248a-487d-82db-54f07f5d472a3294867.jpeg',
];

let url = ImageUrls[0];
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
document.body.appendChild(input);
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
    const response = await fetch(url);
    const bitmapSource = await response.blob();
    imgBitmap = await createImageBitmap(bitmapSource);
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

const ImageBitmapCache: LRUMap<string, ImageBitmap> = new LRUMap(100);

async function getImageBitmap(url: string): Promise<ImageBitmap> {
    const image = new Image();
    image.crossOrigin = '';
    image.src = url;
    return new Promise(resolve => {
        image.onload = () => {
            let imageBitmap = ImageBitmapCache.get(url);
            if (!imageBitmap) {
                createImageBitmap(image).then(bitmap => {
                    imageBitmap = bitmap;
                    ImageBitmapCache.set(url, imageBitmap);
                    resolve(imageBitmap);
                }).catch(err => {
                    console.error(err);
                });
            }
            else {
                resolve(imageBitmap);
            }
        };
    },
    );
}

const urls = [
    'https://st0.dancf.com/gaoding-material/0/images/223463/20191107-203725-leuLE.jpg',
    'https://st0.dancf.com/gaoding-material/0/images/372765/20200428-184157-CC9C5C33-7193-54B7-8D32-FB0D309706DD.jpg',
    'https://st0.dancf.com/gaoding-material/0/images/354320/20200108-213408-ADZNv.jpg',
    'https://gd-filems.dancf.com/gaoding/gaoding/15004/88567b2b-9e8b-4e15-9347-03aef654e1d813604450.png',
    'https://gd-filems.dancf.com/gaoding/gaoding/15004/0aef368c-7fb8-4d97-98db-abb053b69a9313604467.png',
    'https://gd-filems-fat.my-static.dancf.com/saas/40eds5/43368/76512881-9bf9-4f95-9355-23cdee5f032d4184.png',
    'https://gd-filems.dancf.com/saas/xi19e5/2269/f9b57bad-de39-4a10-ae93-93ab27428cab17679446.jpg',
    'https://gd-filems.dancf.com/gaoding/gaoding/2269/d1275156-5a66-44a0-8109-4a639c77ac3d92.jpeg',
    'https://gd-filems.dancf.com/gaoding/gaoding/2269/5b043889-248a-487d-82db-54f07f5d472a3294867.jpeg',
];

// function test() {
//     // console.time('init');
//     Promise.all(urls.map(url => getImageBitmap(url))).then(images => {
//         console.time('render');
//         Promise.all(images.map(async (image, index) => {
//             let canvas = (document.getElementById(`${index}`) as HTMLCanvasElement | null);
//             if (!canvas) {
//                 canvas = getCanvas(image.width, image.height, true);
//                 canvas.id = `${index}`;
//                 document.body.appendChild(canvas);
//             }
//             const ctx = (canvas as HTMLCanvasElement).getContext('2d')!;
//             ctx.clearRect(0, 0, image.width, image.height);
//             const resultCanvas = await noiseImage(image, { value: PARAMS.blur }, `${index}`);
//             // const resultCanvas = noiseImage(image, { value: PARAMS.noise, seed: PARAMS.seed, granularity: PARAMS.granularity });
//             ctx.drawImage(resultCanvas, 0, image.height - resultCanvas.height);
//         })).then(() => { console.timeEnd('render'); })
//     });
// }
// test();

