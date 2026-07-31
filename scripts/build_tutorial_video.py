"""Build the authored Veil of Secrets tutorial film.

The film uses only project-owned artwork, Windows speech synthesis, and an
original procedural motion-graphics treatment. It emits the phone-friendly
H.264 video, poster, and WebVTT captions consumed by the tutorial screen.
"""

from __future__ import annotations

import base64
import math
import os
import subprocess
import wave
from dataclasses import dataclass
from pathlib import Path

import imageio_ffmpeg
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
OUTPUT = PUBLIC / "tutorial"
BUILD = ROOT / "outputs" / "tutorial-build"
WIDTH, HEIGHT, FPS = 1280, 720, 20
CHAPTER_SECONDS = 12.5
INTRO_SECONDS = 1.0
OUTRO_SECONDS = 1.5

INK = "#080708"
PANEL = "#171113"
PAPER = "#f0e7d5"
MUTED = "#b5a99d"
GOLD = "#cba75a"
GOLD_BRIGHT = "#f0d991"
CRIMSON = "#9f2639"
CRIMSON_BRIGHT = "#d04459"
TEAL = "#75b8c8"


@dataclass(frozen=True)
class Chapter:
    title: str
    eyebrow: str
    captions: tuple[str, ...]

    @property
    def narration(self) -> str:
        return " ".join(self.captions)


CHAPTERS = (
    Chapter(
        "Welcome to Blackthorn",
        "Your objective",
        (
            "Welcome to Blackthorn Manor, where every match changes the victim, culprit, method, location, motive, and evidence.",
            "Do not merely guess.",
            "Build a complete theory before midnight.",
        ),
    ),
    Chapter(
        "Roll for movement",
        "A detective's turn",
        (
            "Detectives act in order.",
            "On your turn, roll the brass die; its result becomes movement points.",
            "Follow connected marble corridors, and remember that unused movement is lost.",
        ),
    ),
    Chapter(
        "Walk the manor",
        "Rooms and routes",
        (
            "Tap a glowing hallway or doorway and your illustrated character walks there, one space at a time.",
            "Friends and bots move visibly too.",
            "Entering a room ends your route, so choose carefully.",
        ),
    ),
    Chapter(
        "Search for evidence",
        "One search per turn",
        (
            "Inside a room, search once.",
            "A clue can confirm a timeline, expose a motive, identify a method, or clear a location.",
            "Evidence changes between cases, so old solutions will not help.",
        ),
    ),
    Chapter(
        "Read your notebook",
        "Connect the facts",
        (
            "Every discovery enters your notebook automatically.",
            "Review evidence, witnesses, suspects, motives, and room notes.",
            "Negative evidence matters because an untouched threshold can eliminate an impossible route.",
        ),
    ),
    Chapter(
        "Discuss and deceive",
        "Friend-table strategy",
        (
            "With a friend, compare what you found.",
            "You may share everything, hold back one detail, or bluff about a suspicion.",
            "Listen for contradictions: the evidence is shared, but interpretation is yours.",
        ),
    ),
    Chapter(
        "Seal your accusation",
        "Solve the whole case",
        (
            "After four clues, select the suspect, method, location, and motive, then submit your theory.",
            "A wrong answer costs time but never removes you.",
            "Search widely, compare stories, and trust the trail.",
        ),
    ),
)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    fonts = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts"
    return ImageFont.truetype(str(fonts / name), size=size)


DISPLAY = font("georgia.ttf", 62)
DISPLAY_SMALL = font("georgia.ttf", 42)
DISPLAY_BOLD = font("georgiab.ttf", 29)
BODY = font("segoeui.ttf", 25)
BODY_SMALL = font("segoeui.ttf", 19)
LABEL = font("bahnschrift.ttf", 18)
LABEL_SMALL = font("bahnschrift.ttf", 14)


def smooth(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3.0 - 2.0 * value)


def lerp(a: float, b: float, value: float) -> float:
    return a + (b - a) * smooth(value)


def wrapped(draw: ImageDraw.ImageDraw, text: str, font_obj: ImageFont.FreeTypeFont, width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    line = ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=font_obj) <= width:
            line = candidate
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def text_block(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    font_obj: ImageFont.FreeTypeFont,
    color: str,
    width: int,
    spacing: int = 7,
) -> int:
    x, y = xy
    for line in wrapped(draw, text, font_obj, width):
        draw.text((x, y), line, font=font_obj, fill=color)
        box = draw.textbbox((x, y), line, font=font_obj)
        y += box[3] - box[1] + spacing
    return y


def gradient_background() -> Image.Image:
    y = np.linspace(0, 1, HEIGHT, dtype=np.float32)[:, None]
    top = np.array([11, 8, 11], dtype=np.float32)
    bottom = np.array([29, 13, 17], dtype=np.float32)
    row = top * (1 - y[..., None]) + bottom * y[..., None]
    image = np.repeat(row, WIDTH, axis=1).astype(np.uint8)
    return Image.fromarray(image, "RGB").convert("RGBA")


def load_portraits() -> list[Image.Image]:
    sheet = Image.open(PUBLIC / "characters" / "blackthorn-cast-sheet.png").convert("RGB")
    portraits: list[Image.Image] = []
    for index in range(10):
        column, row = index % 5, index // 5
        left = round(column * sheet.width / 5)
        right = round((column + 1) * sheet.width / 5)
        top = round(row * sheet.height / 2)
        bottom = round((row + 1) * sheet.height / 2)
        portraits.append(sheet.crop((left, top, right, bottom)))
    return portraits


PORTRAITS = load_portraits()
CREST = Image.open(PUBLIC / "branding" / "veil-sigil-v2.png").convert("RGBA")


def portrait_card(index: int, width: int = 110, height: int = 142) -> Image.Image:
    portrait = ImageOps.fit(PORTRAITS[index], (width, height), method=Image.Resampling.LANCZOS)
    mask = Image.new("L", (width, height), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((1, 1, width - 2, height - 2), radius=width // 2, fill=255)
    md.rectangle((1, width // 2, width - 2, height - 2), fill=255)
    card = Image.new("RGBA", (width + 10, height + 16), (0, 0, 0, 0))
    shadow = Image.new("RGBA", card.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((6, 7, width + 4, height + 7), radius=28, fill=(0, 0, 0, 175))
    shadow = shadow.filter(ImageFilter.GaussianBlur(5))
    card.alpha_composite(shadow)
    card.paste(portrait.convert("RGBA"), (5, 3), mask)
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((5, 3, width + 4, height + 2), radius=width // 2, outline=GOLD_BRIGHT, width=2)
    d.ellipse((width // 2 - 19, height - 1, width // 2 + 29, height + 14), fill="#241417", outline=GOLD, width=2)
    return card


CARDS = [portrait_card(index) for index in range(10)]


ROOMS = (
    ("LIBRARY", (82, 150, 322, 318), "#5b2430"),
    ("STUDY", (370, 138, 584, 274), "#253c48"),
    ("BALLROOM", (640, 138, 958, 286), "#513453"),
    ("OBSERVATORY", (1000, 138, 1190, 285), "#263f51"),
    ("KITCHEN", (82, 390, 330, 535), "#4e3a2c"),
    ("GRAND HALL", (410, 360, 734, 536), "#5b4928"),
    ("GARDEN", (802, 370, 1190, 536), "#304c38"),
)


def board_base() -> Image.Image:
    image = gradient_background()
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((48, 110, 1232, 565), radius=16, fill="#0c090a", outline="#755e34", width=2)
    for name, (x1, y1, x2, y2), hue in ROOMS:
        draw.rounded_rectangle((x1, y1, x2, y2), radius=8, fill=hue, outline=GOLD, width=2)
        draw.rectangle((x1 + 7, y1 + 7, x2 - 7, y2 - 7), outline="#1a1113", width=2)
        draw.text((x1 + 15, y1 + 13), name, font=LABEL_SMALL, fill=PAPER)
        for offset in range(36, y2 - y1 - 8, 27):
            draw.line((x1 + 12, y1 + offset, x2 - 12, y1 + offset), fill="#ffffff13", width=1)
    corridors = (
        (322, 225, 370, 225), (584, 210, 640, 210), (958, 210, 1000, 210),
        (204, 318, 204, 390), (494, 274, 494, 360), (850, 286, 850, 370),
        (330, 462, 410, 462), (734, 462, 802, 462),
    )
    for line in corridors:
        draw.line(line, fill="#d8cfbd", width=24)
        draw.line(line, fill="#766f65", width=2)
        x1, y1, x2, y2 = line
        steps = max(1, int(math.dist((x1, y1), (x2, y2)) // 20))
        for step in range(steps + 1):
            p = step / max(1, steps)
            x, y = int(lerp(x1, x2, p)), int(lerp(y1, y2, p))
            draw.rectangle((x - 8, y - 8, x + 8, y + 8), outline="#9d9587", width=1)
    return image


BOARD = board_base()


def paste_standee(image: Image.Image, portrait: int, x: float, y: float, scale: float = 0.66, glow: bool = False) -> None:
    card = CARDS[portrait]
    size = (max(1, int(card.width * scale)), max(1, int(card.height * scale)))
    card = card.resize(size, Image.Resampling.LANCZOS)
    if glow:
        halo = Image.new("RGBA", (size[0] + 26, size[1] + 26), (0, 0, 0, 0))
        ImageDraw.Draw(halo).ellipse((8, size[1] - 12, size[0] + 18, size[1] + 18), fill=(117, 184, 200, 120))
        halo = halo.filter(ImageFilter.GaussianBlur(12))
        image.alpha_composite(halo, (int(x - halo.width / 2), int(y - size[1] + 2)))
    image.alpha_composite(card, (int(x - size[0] / 2), int(y - size[1])))


def path_position(points: tuple[tuple[float, float], ...], progress: float) -> tuple[float, float]:
    if len(points) == 1:
        return points[0]
    scaled = max(0.0, min(0.99999, progress)) * (len(points) - 1)
    index = int(scaled)
    local = scaled - index
    return (
        lerp(points[index][0], points[index + 1][0], local),
        lerp(points[index][1], points[index + 1][1], local),
    )


def rain_overlay(image: Image.Image, frame_index: int) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    for index in range(34):
        x = (index * 149 + frame_index * (2 + index % 3)) % WIDTH
        y = (index * 71 + frame_index * 7) % 590
        draw.line((x, y, x - 8, y + 28), fill=(135, 170, 190, 18), width=1)


def draw_chrome(image: Image.Image, chapter_index: int, total_progress: float, caption: str) -> None:
    draw = ImageDraw.Draw(image, "RGBA")
    chapter = CHAPTERS[chapter_index]
    draw.rectangle((0, 0, WIDTH, 106), fill=(5, 4, 5, 210))
    draw.line((48, 105, WIDTH - 48, 105), fill=GOLD, width=1)
    draw.text((54, 22), f"LESSON {chapter_index + 1:02d}  /  {len(CHAPTERS):02d}", font=LABEL_SMALL, fill=GOLD)
    draw.text((54, 48), chapter.title, font=DISPLAY_SMALL, fill=PAPER)
    label_width = int(draw.textlength(chapter.eyebrow.upper(), font=LABEL_SMALL))
    draw.rounded_rectangle((WIDTH - label_width - 88, 34, WIDTH - 48, 71), radius=18, fill=(136, 31, 47, 140), outline=(203, 167, 90, 100))
    draw.text((WIDTH - label_width - 68, 44), chapter.eyebrow.upper(), font=LABEL_SMALL, fill=GOLD_BRIGHT)

    draw.rounded_rectangle((42, 575, WIDTH - 42, 701), radius=15, fill=(4, 4, 5, 226), outline=(203, 167, 90, 95), width=1)
    draw.rectangle((42, 575, 49, 701), fill=CRIMSON)
    draw.text((70, 595), "NARRATOR", font=LABEL_SMALL, fill=GOLD)
    text_block(draw, (70, 621), caption, BODY, PAPER, WIDTH - 140, 4)
    draw.rectangle((42, 708, WIDTH - 42, 713), fill="#2a2022")
    draw.rectangle((42, 708, int(42 + (WIDTH - 84) * total_progress), 713), fill=GOLD_BRIGHT)


def draw_die(draw: ImageDraw.ImageDraw, center: tuple[int, int], face: int, angle: float) -> None:
    cx, cy = center
    size = 122 + int(math.sin(angle) * 8)
    draw.rounded_rectangle((cx - size // 2 + 8, cy - size // 2 + 12, cx + size // 2 + 8, cy + size // 2 + 12), radius=22, fill="#00000088")
    draw.rounded_rectangle((cx - size // 2, cy - size // 2, cx + size // 2, cy + size // 2), radius=22, fill="#d0a850", outline=GOLD_BRIGHT, width=4)
    pip_positions = {
        1: ((0, 0),), 2: ((-1, -1), (1, 1)), 3: ((-1, -1), (0, 0), (1, 1)),
        4: ((-1, -1), (1, -1), (-1, 1), (1, 1)),
        5: ((-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)),
        6: ((-1, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (1, 1)),
    }
    for px, py in pip_positions[face]:
        x, y = cx + px * 31, cy + py * 31
        draw.ellipse((x - 9, y - 9, x + 9, y + 9), fill="#2a1713")


def caption_for(chapter: Chapter, local: float) -> str:
    index = min(len(chapter.captions) - 1, int(local * len(chapter.captions)))
    return chapter.captions[index]


def render_scene(chapter_index: int, local: float, frame_index: int) -> Image.Image:
    if chapter_index in (1, 2):
        image = BOARD.copy()
    else:
        image = gradient_background()
    draw = ImageDraw.Draw(image, "RGBA")

    if chapter_index == 0:
        crest_size = int(285 * (0.9 + 0.03 * math.sin(local * math.tau)))
        crest = CREST.resize((crest_size, crest_size), Image.Resampling.LANCZOS)
        image.alpha_composite(crest, (WIDTH // 2 - crest_size // 2, 120))
        draw.text((70, 160), "EVERY CASE", font=LABEL, fill=GOLD)
        draw.text((70, 192), "changes the truth", font=DISPLAY_SMALL, fill=PAPER)
        for index, label in enumerate(("VICTIM", "CULPRIT", "METHOD", "MOTIVE")):
            x = 75 + index * 280
            y = 480 + int(math.sin(local * math.tau + index) * 3)
            draw.rounded_rectangle((x, y, x + 240, y + 58), radius=7, fill=(24, 17, 19, 230), outline=(203, 167, 90, 90))
            draw.text((x + 18, y + 19), label, font=LABEL, fill=GOLD_BRIGHT)

    elif chapter_index == 1:
        draw.rounded_rectangle((1020, 315, 1190, 532), radius=14, fill=(13, 9, 10, 235), outline=GOLD, width=2)
        face = 1 + int(local * 28) % 6 if local < 0.48 else 5
        draw_die(draw, (1105, 405), face, local * 28)
        draw.text((1067, 485), "ROLL 5", font=DISPLAY_BOLD, fill=PAPER)
        path = ((570, 510), (570, 462), (494, 462), (494, 405), (494, 350), (494, 300))
        progress = smooth(max(0, (local - 0.38) / 0.54))
        for point_index, point in enumerate(path):
            active = point_index <= int(progress * (len(path) - 1))
            draw.ellipse((point[0] - 11, point[1] - 11, point[0] + 11, point[1] + 11), fill=TEAL if active else "#5f5850", outline="#e4d5ad")
        x, y = path_position(path, progress)
        paste_standee(image, 0, x, y, 0.58, glow=True)

    elif chapter_index == 2:
        routes = (
            (0, ((570, 510), (494, 462), (494, 350), (475, 270), (475, 225))),
            (1, ((570, 500), (650, 462), (790, 462), (850, 395), (850, 340))),
            (2, ((570, 500), (420, 462), (330, 462), (204, 410), (204, 352))),
            (3, ((570, 500), (720, 462), (850, 462), (1000, 462), (1090, 430))),
        )
        for index, route in routes:
            delayed = max(0.0, min(1.0, local * 1.45 - index * 0.12))
            x, y = path_position(route, delayed)
            paste_standee(image, index, x, y, 0.5, glow=index == 0)
        draw.rounded_rectangle((62, 120, 412, 151), radius=14, fill=(4, 4, 5, 205))
        draw.text((80, 128), "ALL MOVEMENT STAYS VISIBLE", font=LABEL_SMALL, fill=GOLD_BRIGHT)

    elif chapter_index == 3:
        draw.rounded_rectangle((62, 128, 775, 555), radius=14, fill="#24171a", outline=GOLD, width=2)
        draw.text((95, 153), "THE LIBRARY", font=LABEL, fill=GOLD_BRIGHT)
        for shelf in range(5):
            x = 95 + shelf * 126
            draw.rounded_rectangle((x, 205, x + 100, 472), radius=5, fill="#130d0e", outline="#664e2a", width=2)
            for book in range(8):
                bx = x + 8 + (book % 4) * 22
                by = 220 + (book // 4) * 110
                draw.rectangle((bx, by, bx + 14, by + 86), fill=(80 + book * 7, 27, 38), outline="#a28145")
        character_x = lerp(155, 665, local * 1.25)
        paste_standee(image, 0, character_x, 520, 0.72, glow=True)
        reveal = smooth(max(0, (local - 0.34) / 0.42))
        card_x = int(900 - reveal * 70)
        draw.rounded_rectangle((card_x, 170, card_x + 315, 510), radius=15, fill=(239, 228, 207, int(245 * reveal)), outline=(203, 167, 90, int(255 * reveal)), width=3)
        if reveal > 0.1:
            draw.text((card_x + 26, 198), "EVIDENCE 04", font=LABEL_SMALL, fill="#7e2634")
            draw.text((card_x + 26, 235), "Burned ledger", font=DISPLAY_BOLD, fill="#24171a")
            text_block(draw, (card_x + 26, 286), "Ash hides a payment made after the victim's final confirmed sighting.", BODY_SMALL, "#554a44", 255, 6)
            draw.line((card_x + 26, 412, card_x + 285, 412), fill="#b08c48", width=1)
            draw.text((card_x + 26, 434), "+ NOTEBOOK", font=LABEL_SMALL, fill="#7e2634")

    elif chapter_index == 4:
        draw.rounded_rectangle((72, 125, 1208, 555), radius=18, fill="#e7dcc8", outline=GOLD, width=3)
        draw.line((640, 145, 640, 535), fill="#a88a52", width=3)
        draw.text((105, 155), "DETECTIVE NOTEBOOK", font=LABEL, fill="#792535")
        draw.text((675, 155), "TIMELINE", font=LABEL, fill="#792535")
        clues = (
            ("01", "Burned ledger", "Payment at 10:17"),
            ("02", "Unbroken wax", "Garden route cleared"),
            ("03", "Silver polish", "Kitchen visit confirmed"),
        )
        for index, (number, title, detail) in enumerate(clues):
            reveal = smooth(max(0, local * 1.7 - index * 0.24))
            y = 215 + index * 96
            x = int(112 - 30 * (1 - reveal))
            draw.rounded_rectangle((x, y, x + 465, y + 74), radius=8, fill=(255, 250, 237, int(245 * reveal)), outline=(151, 118, 61, int(190 * reveal)))
            if reveal > 0.05:
                draw.text((x + 15, y + 14), number, font=LABEL, fill="#9f2639")
                draw.text((x + 65, y + 10), title, font=DISPLAY_BOLD, fill="#24171a")
                draw.text((x + 65, y + 43), detail, font=BODY_SMALL, fill="#625750")
        timeline = ((735, 235, "10:05", "Victim enters library"), (735, 332, "10:17", "Ledger payment"), (735, 429, "10:24", "West clock stops"))
        for index, (x, y, clock, detail) in enumerate(timeline):
            active = local > 0.18 + index * 0.18
            draw.line((699, y + 16, 699, y + 110), fill="#a88a52", width=2)
            draw.ellipse((687, y + 4, 711, y + 28), fill=CRIMSON if active else "#877d70", outline="#f6e8be")
            draw.text((x, y), clock, font=DISPLAY_BOLD, fill="#24171a")
            draw.text((x, y + 37), detail, font=BODY_SMALL, fill="#625750")

    elif chapter_index == 5:
        draw.ellipse((265, 182, 1015, 560), fill="#2a1719", outline=GOLD, width=4)
        draw.ellipse((320, 220, 960, 520), fill="#120c0e", outline="#543a28", width=2)
        positions = ((330, 355), (510, 195), (775, 200), (970, 355))
        for index, (x, y) in enumerate(positions):
            paste_standee(image, index, x, y + math.sin(local * math.tau + index) * 5, 0.72, glow=index == int(local * 7) % 4)
        statements = ("The ledger was altered.", "I found an intact seal.", "That clock is eight minutes slow.")
        statement_index = min(2, int(local * 3))
        bubble_x = (440, 520, 665)[statement_index]
        draw.rounded_rectangle((bubble_x, 325, bubble_x + 300, 410), radius=14, fill=(239, 231, 213, 242), outline=GOLD, width=2)
        draw.polygon(((bubble_x + 30, 410), (bubble_x + 62, 410), (bubble_x + 48, 436)), fill="#efe7d5")
        text_block(draw, (bubble_x + 20, 346), statements[statement_index], BODY_SMALL, "#24171a", 260, 4)
        for index in range(3):
            x = 505 + index * 118
            y = 455 + int(math.sin(local * math.tau + index) * 5)
            draw.rounded_rectangle((x, y, x + 100, y + 62), radius=6, fill="#dfd1b8", outline=CRIMSON, width=2)
            draw.text((x + 14, y + 19), f"CLUE {index + 1}", font=LABEL_SMALL, fill="#68212d")

    else:
        draw.rounded_rectangle((75, 130, 785, 550), radius=16, fill=(17, 12, 14, 245), outline=GOLD, width=2)
        draw.text((110, 160), "FINAL ACCUSATION", font=LABEL, fill=GOLD_BRIGHT)
        choices = (("SUSPECT", "Celia Harrow"), ("METHOD", "Silver letter opener"), ("LOCATION", "Library"), ("MOTIVE", "Conceal stolen funds"))
        for index, (label, value) in enumerate(choices):
            y = 215 + index * 72
            active = local > 0.1 + index * 0.13
            draw.rounded_rectangle((110, y, 742, y + 54), radius=7, fill="#21171a", outline=TEAL if active else "#574749", width=2)
            draw.text((130, y + 17), label, font=LABEL_SMALL, fill=GOLD)
            draw.text((310, y + 12), value if active else "Choose...", font=BODY, fill=PAPER if active else MUTED)
            if active:
                draw.ellipse((690, y + 15, 714, y + 39), fill="#426e55", outline="#a6d9b5")
                draw.line((696, y + 28, 702, y + 34), fill="#f4ffe9", width=2)
                draw.line((702, y + 34, 710, y + 21), fill="#f4ffe9", width=2)
        for index in range(4):
            paste_standee(image, index, 865 + index * 90, 525, 0.56, glow=index == 0)
        if local > 0.72:
            reveal = smooth((local - 0.72) / 0.24)
            draw.rounded_rectangle((825, 155, 1195, 385), radius=16, fill=(117, 184, 200, int(36 + 160 * reveal)), outline=(240, 217, 145, int(255 * reveal)), width=3)
            draw.text((872, 188), "TRUTH", font=LABEL, fill=GOLD_BRIGHT)
            draw.text((872, 228), "ESTABLISHED", font=DISPLAY_BOLD, fill=PAPER)
            text_block(draw, (872, 285), "Complete theory\n+ evidence trail", BODY_SMALL, PAPER, 260, 6)

    rain_overlay(image, frame_index)
    return image


def timecode(seconds: float) -> str:
    milliseconds = int(round(seconds * 1000))
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    whole, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02d}:{minutes:02d}:{whole:02d}.{milliseconds:03d}"


def synthesize_narration() -> tuple[Path, list[float], float]:
    BUILD.mkdir(parents=True, exist_ok=True)
    segment_paths: list[Path] = []
    durations: list[float] = []
    voice_script = ROOT / "scripts" / "synthesize_tutorial_voice.ps1"
    for index, chapter in enumerate(CHAPTERS):
        target = BUILD / f"voice-{index:02d}.wav"
        encoded = base64.b64encode(chapter.narration.encode("utf-8")).decode("ascii")
        subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(voice_script),
                "-TextBase64",
                encoded,
                "-OutFile",
                str(target),
            ],
            check=True,
        )
        with wave.open(str(target), "rb") as source:
            duration = source.getnframes() / source.getframerate()
        if duration > CHAPTER_SECONDS - 0.15:
            raise RuntimeError(f"Narration for chapter {index + 1} is {duration:.2f}s; shorten it below {CHAPTER_SECONDS:.2f}s")
        segment_paths.append(target)
        durations.append(duration)

    output = BUILD / "tutorial-narration.wav"
    with wave.open(str(segment_paths[0]), "rb") as first:
        params = first.getparams()
    starts: list[float] = []
    with wave.open(str(output), "wb") as destination:
        destination.setparams(params)
        bytes_per_frame = params.sampwidth * params.nchannels

        def silence(seconds: float) -> None:
            destination.writeframes(b"\x00" * int(seconds * params.framerate) * bytes_per_frame)

        silence(INTRO_SECONDS)
        cursor = INTRO_SECONDS
        for segment, duration in zip(segment_paths, durations):
            starts.append(cursor)
            with wave.open(str(segment), "rb") as source:
                destination.writeframes(source.readframes(source.getnframes()))
            silence(CHAPTER_SECONDS - duration)
            cursor += CHAPTER_SECONDS
        silence(OUTRO_SECONDS)
    return output, starts, INTRO_SECONDS + len(CHAPTERS) * CHAPTER_SECONDS + OUTRO_SECONDS


def write_captions(starts: list[float]) -> Path:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / "veil-of-secrets-tutorial.vtt"
    lines = ["WEBVTT", ""]
    cue = 1
    for chapter, start in zip(CHAPTERS, starts):
        slot = CHAPTER_SECONDS / len(chapter.captions)
        for index, caption in enumerate(chapter.captions):
            cue_start = start + index * slot
            cue_end = start + (index + 1) * slot - 0.12
            lines.extend((str(cue), f"{timecode(cue_start)} --> {timecode(cue_end)}", caption, ""))
            cue += 1
    target.write_text("\n".join(lines), encoding="utf-8")
    return target


def render_video(starts: list[float], duration: float) -> tuple[Path, Path]:
    BUILD.mkdir(parents=True, exist_ok=True)
    silent_video = BUILD / "tutorial-silent.mp4"
    poster = OUTPUT / "veil-of-secrets-tutorial-poster.jpg"
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [
        ffmpeg, "-y", "-f", "rawvideo", "-vcodec", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS), "-i", "-", "-an",
        "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(silent_video),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    total_frames = math.ceil(duration * FPS)
    try:
        for frame_index in range(total_frames):
            time = frame_index / FPS
            if time < starts[0]:
                chapter_index, local = 0, 0.0
            else:
                chapter_index = min(len(CHAPTERS) - 1, int((time - starts[0]) // CHAPTER_SECONDS))
                chapter_start = starts[chapter_index]
                local = max(0.0, min(0.999, (time - chapter_start) / CHAPTER_SECONDS))
            frame = render_scene(chapter_index, local, frame_index)
            caption = caption_for(CHAPTERS[chapter_index], local)
            draw_chrome(frame, chapter_index, time / duration, caption)
            if frame_index == FPS:
                frame.convert("RGB").save(poster, quality=91, optimize=True)
            assert process.stdin is not None
            process.stdin.write(frame.convert("RGB").tobytes())
    finally:
        if process.stdin:
            process.stdin.close()
        process.wait()
    if process.returncode:
        raise RuntimeError(f"ffmpeg video render failed with code {process.returncode}")
    return silent_video, poster


def mix_audio(silent_video: Path, narration: Path, starts: list[float], duration: float) -> Path:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    final = OUTPUT / "veil-of-secrets-tutorial.mp4"
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    dice = PUBLIC / "audio" / "dice-roll-wood.mp3"
    dice_delay = int((starts[1] + 3.2) * 1000)
    filter_graph = (
        f"[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.35[voice];"
        f"[2:a]adelay=delays={dice_delay}:all=1,volume=0.62[dice];"
        f"anoisesrc=color=pink:amplitude=0.008:sample_rate=44100:d={duration:.3f},"
        "highpass=f=140,lowpass=f=1500[amb];"
        f"sine=frequency=55:sample_rate=44100:duration={duration:.3f},volume=0.018[drone];"
        "[voice][dice][amb][drone]amix=inputs=4:duration=longest:dropout_transition=2,"
        "alimiter=limit=0.93[a]"
    )
    subprocess.run(
        [
            ffmpeg, "-y", "-i", str(silent_video), "-i", str(narration), "-i", str(dice),
            "-filter_complex", filter_graph, "-map", "0:v:0", "-map", "[a]", "-c:v", "copy",
            "-c:a", "aac", "-b:a", "128k", "-t", f"{duration:.3f}", "-movflags", "+faststart", str(final),
        ],
        check=True,
    )
    return final


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    narration, starts, duration = synthesize_narration()
    write_captions(starts)
    silent_video, poster = render_video(starts, duration)
    final = mix_audio(silent_video, narration, starts, duration)
    print(f"Tutorial: {final}")
    print(f"Poster: {poster}")
    print(f"Duration: {duration:.1f}s")


if __name__ == "__main__":
    main()
