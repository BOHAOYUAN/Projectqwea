"""Prepare supplied platform logos for use on dark and light cards.

The source files retain their original brands; this only removes surrounding
white canvas and standardizes transparent square PNG outputs.
"""

from collections import deque
from pathlib import Path

from PIL import Image

SOURCES = {
    "instagram-official.png": (Path(r"C:\Users\Asus\AppData\Local\Temp\codex-clipboard-96eb4098-132b-4064-8ca8-f26b402bc985.png"), "all-white"),
    "yelp-official.png": (Path(r"C:\Users\Asus\AppData\Local\Temp\codex-clipboard-de671ccd-d000-4e41-adf1-16110d946c8d.png"), "border-light"),
    "xiaohongshu-official.png": (Path(r"C:\Users\Asus\AppData\Local\Temp\codex-clipboard-ed401806-fc0c-4488-b17b-6f9875dfcf60.png"), "preserve"),
    "google-official.png": (Path(r"C:\Users\Asus\AppData\Local\Temp\codex-clipboard-4d28ed36-ce57-4935-9da0-bef20989cd2e.png"), "all-white"),
    "tiktok-official.png": (Path(r"C:\Users\Asus\AppData\Local\Temp\codex-clipboard-8beb869d-0532-4c44-9c78-93b88902d8ba.jpg"), "border-light"),
}
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "platforms"


def light_pixel(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a > 0 and r >= 210 and g >= 210 and b >= 210


def remove_border_light(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    queue: deque[tuple[int, int]] = deque()
    seen: set[tuple[int, int]] = set()

    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(height):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or not light_pixel(pixels[x, y]):
            continue
        seen.add((x, y))
        pixels[x, y] = (*pixels[x, y][:3], 0)
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1), (x - 1, y - 1), (x + 1, y + 1), (x - 1, y + 1), (x + 1, y - 1)):
            if 0 <= nx < width and 0 <= ny < height:
                queue.append((nx, ny))
    return image


def remove_all_white(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if a > 0 and r >= 242 and g >= 242 and b >= 242:
                pixels[x, y] = (r, g, b, 0)
    return image


def square_canvas(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox:
        image = image.crop(bbox)
    image.thumbnail((460, 460), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    x = (512 - image.width) // 2
    y = (512 - image.height) // 2
    canvas.alpha_composite(image, (x, y))
    return canvas


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name, (source, strategy) in SOURCES.items():
        if not source.exists():
            raise FileNotFoundError(source)
        image = Image.open(source).convert("RGBA")
        if strategy == "all-white":
            image = remove_all_white(image)
        elif strategy == "border-light":
            image = remove_border_light(image)
        square_canvas(image).save(OUTPUT / name, "PNG", optimize=True)


if __name__ == "__main__":
    main()
