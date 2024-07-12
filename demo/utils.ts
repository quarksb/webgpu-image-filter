import { LRUMap } from "lru_map";

const array = [
    "自强不息",
    "厚德载物",
    "精益求精",
    "上善若水"
]

export async function download(canvas: HTMLCanvasElement) {
    if (!canvas) return;
    const link = document.createElement("a");
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob!);
        link.download = `夸克${array[Math.floor(Math.random() * array.length)]}.png`;
        link.href = url;
        link.click();
    });
}

export function uploadFile(file): Promise<{ url: string }> {
    return new Promise((resolve) => {
        // 使用 FileReader 读取文件对象
        const reader = new FileReader();
        // 把文件对象作为一个 dataURL 读入
        reader.readAsDataURL(file);
        reader.onload = (event: ProgressEvent<FileReader>) => {
            const url = event?.target?.result as string;
            resolve({ url });
        };
    });
}

const ImageBitmapCache: LRUMap<string, ImageBitmap> = new LRUMap(100);

export async function getImageBitmap(url: string): Promise<ImageBitmap> {
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
