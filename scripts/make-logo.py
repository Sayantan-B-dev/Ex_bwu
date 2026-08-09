"""Generate BWU logo in multiple sizes using Pillow."""
from PIL import Image, ImageDraw, ImageFont
import os

OUT = os.path.join(os.path.dirname(__file__), "..", "public")
os.makedirs(OUT, exist_ok=True)

# Colors matching the neumorphic dark theme
BG = (28, 28, 32)       # --bg
ACCENT = (96, 165, 250)  # --accent (blue)
GREEN = (74, 222, 128)   # --green
TEXT = (232, 232, 236)   # --text


def find_font(size: int):
    """Try common monospace/sans fonts."""
    candidates = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/calibri.ttf",
        "C:/Windows/Fonts/tahoma.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def draw_rounded_rect(draw, xy, radius, fill):
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def make_logo(size: int, with_text: bool = True) -> Image.Image:
    """Create the BWU logo at the given size."""
    h = size
    if with_text:
        w = int(size * 3.2)
    else:
        w = size

    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw the icon: a rounded hexagon-ish shape
    icon_size = int(h * 0.75)
    pad = (h - icon_size) // 2
    ix, iy = pad, pad

    # Outer glow ring
    draw.rounded_rectangle(
        [ix, iy, ix + icon_size, iy + icon_size],
        radius=int(icon_size * 0.28),
        fill=None,
        outline=ACCENT,
        width=max(2, int(icon_size * 0.06)),
    )

    # Inner filled shape
    inner = int(icon_size * 0.78)
    inner_pad = (icon_size - inner) // 2
    draw.rounded_rectangle(
        [ix + inner_pad, iy + inner_pad, ix + inner_pad + inner, iy + inner_pad + inner],
        radius=int(inner * 0.22),
        fill=ACCENT,
    )

    # Draw "B" letter inside
    font_size = int(inner * 0.65)
    font = find_font(font_size)
    bbox = font.getbbox("B")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = ix + inner_pad + (inner - tw) // 2
    ty = iy + inner_pad + (inner - th) // 2 - bbox[1]
    draw.text((tx, ty), "B", fill=BG, font=font)

    if with_text:
        # "WU" text next to the icon
        text_size = int(h * 0.35)
        text_font = find_font(text_size)
        text_x = ix + icon_size + int(h * 0.12)
        text_y = (h - text_size) // 2
        draw.text((text_x, text_y), "WU", fill=TEXT, font=text_font)

    return img


def make_favicon(size: int) -> Image.Image:
    """Create a small favicon (just the icon, no text)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    icon_size = size
    pad = 0

    # Outer ring
    draw.rounded_rectangle(
        [pad, pad, pad + icon_size, pad + icon_size],
        radius=int(icon_size * 0.28),
        fill=None,
        outline=ACCENT,
        width=max(2, int(icon_size * 0.08)),
    )

    # Inner fill
    inner = int(icon_size * 0.78)
    inner_pad = (icon_size - inner) // 2
    draw.rounded_rectangle(
        [inner_pad, inner_pad, inner_pad + inner, inner_pad + inner],
        radius=int(inner * 0.22),
        fill=ACCENT,
    )

    # "B" letter
    font_size = int(inner * 0.65)
    font = find_font(font_size)
    bbox = font.getbbox("B")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = inner_pad + (inner - tw) // 2
    ty = inner_pad + (inner - th) // 2 - bbox[1]
    draw.text((tx, ty), "B", fill=BG, font=font)

    return img


def make_og_image() -> Image.Image:
    """Create a wide OG/social preview image."""
    w, h = 1200, 630
    img = Image.new("RGB", (w, h), BG)
    draw = ImageDraw.Draw(img)

    # Big logo centered
    logo = make_logo(int(h * 0.5), with_text=True)
    lx = (w - logo.width) // 2
    ly = (h - logo.height) // 2
    img.paste(logo, (lx, ly), logo)

    return img


if __name__ == "__main__":
    # Logo variants
    for sz in [120, 200, 400]:
        logo = make_logo(sz, with_text=True)
        path = os.path.join(OUT, f"logo-{sz}.png")
        logo.save(path, "PNG")
        print(f"Saved {path} ({logo.width}x{logo.height})")

    # Icon only (for favicon)
    for sz in [32, 180]:
        fav = make_favicon(sz)
        path = os.path.join(OUT, f"icon-{sz}.png")
        fav.save(path, "PNG")
        print(f"Saved {path} ({fav.width}x{fav.height})")

    # Favicon.ico
    fav32 = make_favicon(32)
    fav32.save(os.path.join(OUT, "favicon.ico"), format="ICO", sizes=[(32, 32)])
    print("Saved favicon.ico")

    # OG image
    og = make_og_image()
    og_path = os.path.join(OUT, "og-image.png")
    og.save(og_path, "PNG")
    print(f"Saved {og_path} ({og.width}x{og.height})")

    print("\nDone!")
