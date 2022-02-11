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
        const url = URL.createObjectURL(blob);
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
