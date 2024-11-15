import { BasicRenderer } from "../src/webgpu";
import { InputBindingApi, Pane } from "tweakpane";
import { uploadFile, download, getImageBitmap } from "./utils";
import "./index.css";
import { getGpuDevice } from "../src/utils/utils";
import { ImageUrls } from "./assets";
import { NoiseFilterParam, WarpFilterParam, BlurFilterParam, FilterParam, BevelFilterParam } from "../src/utils/type";
import sdfImg from "/sdf.png";
import { BindingApi } from "@tweakpane/core";

const basicCanvas = <HTMLCanvasElement>document.getElementById("canvas")!;
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
    backgroundColor: "#88ddff",
    imageIndex: 0,
};

const pane = new Pane();
const bacInputs: BindingApi[] = [];
const f1 = pane.addFolder({ title: "background" });
bacInputs.push(f1.addBinding(PARAMS, "backgroundColor", { view: "color" }) );
const baseInputs: BindingApi[] = [];

const f2 = pane.addFolder({ title: "Ablation" });
const f3 = pane.addFolder({ title: "Blur" });
const f4 = pane.addFolder({ title: "Twist" });

baseInputs.push(f2.addBinding(PARAMS, "noise", { label: "strength", min: 0, max: 100 }));
baseInputs.push(f2.addBinding(PARAMS, "granularity", { label: "scale", min: 0, max: 100 }));
baseInputs.push(f2.addBinding(PARAMS, "seed", { label: "seed", min: 0, max: 1 }));
baseInputs.push(f3.addBinding(PARAMS, "blur", { label: "strength", min: 0, max: 300 }));
baseInputs.push(f4.addBinding(PARAMS, "warp", { label: "strength", min: -100, max: 100 }));
baseInputs.push(
    f4.addBinding(PARAMS, "center", {
        label: "center",
        picker: "inline",
        expanded: true,
        x: { step: 1, min: -100, max: 100 },
        y: { step: 1, min: -100, max: 100 },
    })
);

const imageInputs: InputBindingApi<any, any>[] = [];
pane.addBinding(PARAMS, "imageIndex", { label: "image", min: 0, max: ImageUrls.length - 1, step: 1 })
imageInputs.push();
const button1 = pane.addButton({ title: "upload image" });
const button2 = pane.addButton({ title: "download image" });

const ctx = basicCanvas.getContext("2d")!;
let imgBitmap: ImageBitmap;
let extraBitmap: ImageBitmap;

let url = ImageUrls[PARAMS.imageIndex];
const input: HTMLInputElement = document.createElement("input");
input.type = "file";
input.accept = "image/png";
input.style.display = "none";

input.addEventListener("change", async () => {
    const files = input.files;
    if (files && files.length) {
        const { url: currentUrl } = await uploadFile(files[0]);
        url = currentUrl;
        deepRender();
    }
});
button1.on("click", () => {
    input.click();
});
button2.on("click", () => {
    download(basicCanvas);
});
deepRender();

let device;
let renderer: BasicRenderer | null = null;

async function render() {
    if (!renderer) {
        device = (await getGpuDevice()).device;
        renderer = new BasicRenderer(device);
    }

    const { width, height } = imgBitmap;
    basicCanvas.width = width;
    basicCanvas.height = height;

    const noiseParam: NoiseFilterParam = {
        filterType: "noise",
        enable: true,
        properties: [
            { key: "intensity", value: 100 - PARAMS.noise },
            { key: "seed", value: PARAMS.seed },
            { key: "granularity", value: PARAMS.granularity },
        ],
    };

    const warpParam: WarpFilterParam = {
        filterType: "warp",
        enable: true,
        properties: [
            { key: "intensity", value: PARAMS.warp },
            { key: "center", value: [PARAMS.center.x * 0.01 + 0.5, PARAMS.center.y * 0.01 + 0.5] },
        ],
    };

    const blurParam: BlurFilterParam = {
        filterType: "blur",
        enable: true,
        properties: [{ key: "intensity", value: PARAMS.blur }],
    };

    const bevelParam: BevelFilterParam = {
        filterType: "bevel",
        enable: true,
        properties: [
            { key: "lightDir", value: [0.5, 0.5, 1] },
            { key: "lightColor", value: [1, 1, 1, 1] },
            { key: "shadowColor", value: [0, 0, 0, 1] },
            { key: "depth", value: [0.1, 0.1, 0.1] },
            { key: "size", value: 0.1 },
            { key: "soft", value: 0.1 },
            { key: "contour", value: PARAMS.shadow },
        ],
    };

    const dataArray: FilterParam[] = [
        bevelParam,
        noiseParam,
        warpParam,
        blurParam
    ];

    console.time("render");
    renderer.loadExtra(extraBitmap);
    const outCanvas = renderer.render(imgBitmap, dataArray, url);
    console.timeEnd("render");

    // copyImage(imgBitmap);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(outCanvas, 0, 0);
}

async function deepRender() {
    url = ImageUrls[PARAMS.imageIndex];
    imgBitmap = await getImageBitmap(url);
    extraBitmap = await getImageBitmap(sdfImg);
    render();
}
const body = document.querySelector("body")!;
bacInputs.forEach((input) => {
    input.on("change", () => {
        body.style.backgroundColor = PARAMS.backgroundColor;
    });
});

baseInputs.forEach((input) => {
    input.on("change", () => {
        render();
    });
});

imageInputs.forEach((input) => {
    input.on("change", () => {
        deepRender();
    });
});
