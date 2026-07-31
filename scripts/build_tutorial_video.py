"""Build the authored Veil of Secrets tutorial film.

The film combines project-owned artwork, the selected Eldrin British-baritone
narration take, and an original procedural motion-graphics treatment. It emits
the phone-friendly H.264 video, poster, and WebVTT captions consumed by the
tutorial screen.
"""

from __future__ import annotations

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
            "Welcome to Blackthorn Manor. Every match changes the victim, culprit, method, location, motive, and evidence.",
            "Build a complete theory before midnight; do not merely guess.",
        ),
    ),
    Chapter(
        "Roll for movement",
        "A detective's turn",
        (
            "Detectives act in order.",
            "Roll the brass die to gain movement points.",
            "Follow connected marble corridors carefully, because unused movement is lost when your turn ends.",
        ),
    ),
    Chapter(
        "Walk the manor",
        "Rooms and routes",
        (
            "Tap a glowing hallway or doorway.",
            "Your illustrated detective walks every space, while friends and bots move visibly.",
            "Entering a room ends your route.",
        ),
    ),
    Chapter(
        "Search for evidence",
        "One search per turn",
        (
            "Search once inside each room.",
            "Clues confirm timelines, expose motives, identify methods, or clear locations.",
            "Evidence changes between cases, so memorized solutions cannot help.",
        ),
    ),
    Chapter(
        "Read your notebook",
        "Connect the facts",
        (
            "Discoveries enter your notebook automatically.",
            "Review evidence, witnesses, suspects, motives, and room notes.",
            "Even an untouched threshold can eliminate an impossible route.",
        ),
    ),
    Chapter(
        "Discuss and deceive",
        "Friend-table strategy",
        (
            "Compare findings with friends.",
            "Share everything, hide a detail, or bluff about a suspicion.",
            "The evidence is shared, but its meaning—and your strategy—remain yours.",
        ),
    ),
    Chapter(
        "Seal your accusation",
        "Solve the whole case",
        (
            "After four clues, accuse a suspect and choose the method, location, and motive.",
            "Wrong answers cost time, never elimination.",
            "Search widely, compare stories, and trust the trail.",
        ),
    ),
)

# Chapter cuts are the midpoints of the six authored [short pause] beats in
# the approved Eldrin take. Each cut is retimed independently so the voice and
# on-screen lesson remain locked together without changing pitch.
ELDRIN_SEGMENTS = (
    (0.000, 14.613),
    (14.613, 27.842),
    (27.842, 39.881),
    (39.881, 55.430),
    (55.430, 69.099),
    (69.099, 82.746),
    (82.746, 98.270),
)

# Speech windows measured from the pitch-preserving, chapter-retimed Eldrin
# stems. These drive both the burned-in narrator line and the WebVTT track.
# Keeping silence outside each window prevents captions from racing ahead
# during Eldrin's deliberate sentence pauses.
CAPTION_WINDOWS = (
    ((0.000, 7.284), (8.017, 11.396)),
    ((0.785, 2.335), (3.105, 5.335), (5.819, 11.429)),
    ((0.738, 2.709), (3.270, 8.482), (9.446, 11.292)),
    ((0.574, 2.075), (2.617, 7.246), (7.979, 11.506)),
    ((0.673, 2.889), (3.581, 7.374), (8.215, 11.445)),
    ((0.669, 2.186), (2.627, 6.237), (7.050, 11.451)),
    ((0.569, 4.884), (5.613, 8.359), (9.074, 12.100)),
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
    ("observatory", "OBSERVATORY", 1, 1, 4, 3, "#355d70", 3, 4),
    ("attic", "ATTIC", 6, 1, 3, 3, "#5d5148", 7, 4),
    ("library", "LIBRARY", 10, 1, 4, 3, "#75444c", 12, 4),
    ("study", "STUDY", 15, 1, 6, 3, "#5a4a76", 17, 4),
    ("masterBedroom", "MASTER BEDROOM", 1, 6, 4, 4, "#6d3444", 5, 7),
    ("ballroom", "BALLROOM", 6, 6, 3, 4, "#7a5b35", 9, 7),
    ("hall", "GRAND HALL", 10, 6, 4, 4, "#8a6938", 14, 7),
    ("guestSuite", "GUEST SUITE", 15, 6, 6, 4, "#4a5f72", 14, 7),
    ("dining", "DINING HALL", 1, 11, 4, 4, "#6d3b35", 5, 12),
    ("kitchen", "KITCHEN", 6, 11, 3, 4, "#6a503b", 9, 12),
    ("conservatory", "CONSERVATORY", 10, 11, 4, 4, "#3f6754", 14, 12),
    ("garden", "MOON GARDEN", 15, 11, 6, 4, "#2f654c", 14, 12),
    ("cellar", "WINE CELLAR", 1, 16, 4, 3, "#4e4041", 3, 15),
    ("basement", "BASEMENT", 6, 16, 3, 3, "#563b32", 7, 15),
    ("secretPassage", "SECRET PASSAGE", 10, 16, 4, 3, "#41364e", 12, 15),
)

BOARD_LEFT, BOARD_TOP, BOARD_RIGHT, BOARD_BOTTOM = 50, 112, 984, 562
CELL_WIDTH = (BOARD_RIGHT - BOARD_LEFT) / 20
CELL_HEIGHT = (BOARD_BOTTOM - BOARD_TOP) / 18


def grid_center(column: int, row: int) -> tuple[float, float]:
    return (
        BOARD_LEFT + (column - 0.5) * CELL_WIDTH,
        BOARD_TOP + (row - 0.5) * CELL_HEIGHT,
    )


def room_center(room_id: str) -> tuple[float, float]:
    room = next(room for room in ROOMS if room[0] == room_id)
    _, _, column, row, width, height, _, _, _ = room
    return (
        BOARD_LEFT + (column - 1 + width / 2) * CELL_WIDTH,
        BOARD_TOP + (row - 1 + height / 2) * CELL_HEIGHT,
    )


def board_base() -> Image.Image:
    image = gradient_background()
    draw = ImageDraw.Draw(image, "RGBA")
    draw.rounded_rectangle((37, 102, 997, 570), radius=8, fill="#0b0808", outline="#755e34", width=2)
    draw.rounded_rectangle((44, 108, 990, 565), radius=4, outline=(203, 167, 90, 75), width=1)

    # Match the playable board: three marble cross-corridors on the same
    # 20-column by 18-row floor-plan grid used by the React game.
    corridor_spaces = {
        *((column, row) for row in (4, 10, 15) for column in range(1, 21)),
        *((column, row) for column in (5, 9, 14) for row in range(1, 19)),
    }
    for column, row in sorted(corridor_spaces, key=lambda item: (item[1], item[0])):
        cx, cy = grid_center(column, row)
        x1 = cx - CELL_WIDTH * 0.43
        x2 = cx + CELL_WIDTH * 0.43
        y1 = cy - CELL_HEIGHT * 0.39
        y2 = cy + CELL_HEIGHT * 0.39
        draw.rounded_rectangle((x1 + 2, y1 + 3, x2 + 2, y2 + 3), radius=2, fill=(0, 0, 0, 125))
        draw.rounded_rectangle((x1, y1, x2, y2), radius=2, fill="#b9b3a7", outline="#635f58", width=1)
        draw.line((x1 + 4, y1 + 3, x2 - 4, y2 - 3), fill=(255, 255, 255, 38), width=1)
        draw.line((x1 + 5, y2 - 3, x2 - 3, y1 + 4), fill=(55, 51, 48, 30), width=1)

    for room_number, room in enumerate(ROOMS, start=1):
        room_id, name, column, row, width, height, hue, door_column, door_row = room
        x1 = BOARD_LEFT + (column - 1) * CELL_WIDTH + 2
        y1 = BOARD_TOP + (row - 1) * CELL_HEIGHT + 2
        x2 = BOARD_LEFT + (column - 1 + width) * CELL_WIDTH - 2
        y2 = BOARD_TOP + (row - 1 + height) * CELL_HEIGHT - 2
        draw.rounded_rectangle((x1 + 3, y1 + 5, x2 + 3, y2 + 5), radius=5, fill=(0, 0, 0, 155))
        draw.rounded_rectangle((x1, y1, x2, y2), radius=5, fill="#100d0e", outline=hue, width=3)
        draw.rounded_rectangle((x1 + 5, y1 + 5, x2 - 5, y2 - 5), radius=3, fill=hue + "42", outline=(255, 255, 255, 23), width=1)

        # Subtle furniture plans echo the actual board without competing with
        # the room names at phone size.
        furniture_y = y1 + (y2 - y1) * 0.57
        draw.ellipse((x1 + 18, furniture_y, x2 - 18, min(y2 - 10, furniture_y + 20)), outline=(230, 218, 190, 35), width=2)
        for offset in range(3):
            shelf_y = y1 + 34 + offset * 13
            if shelf_y < y2 - 17:
                draw.line((x1 + 14, shelf_y, x2 - 14, shelf_y), fill=(255, 255, 255, 17), width=1)

        label_lines = wrapped(draw, name, LABEL_SMALL, max(48, int(x2 - x1 - 23)))[:2]
        label_y = y1 + 9
        for label_line in label_lines:
            draw.text((x1 + 10, label_y), label_line, font=LABEL_SMALL, fill=PAPER)
            label_y += 16
        draw.text((x2 - 27, y2 - 18), f"{room_number:02d}", font=LABEL_SMALL, fill=(255, 255, 255, 50))

        # Brass doorway notch placed at the exact gameplay entrance.
        dcx, dcy = grid_center(door_column, door_row)
        target_x = min(max(dcx, x1), x2)
        target_y = min(max(dcy, y1), y2)
        draw.line((target_x - 8, target_y, target_x + 8, target_y), fill=GOLD_BRIGHT, width=3)

    # The fold marks make the map read as a physical tabletop board.
    draw.line(((BOARD_LEFT + BOARD_RIGHT) / 2, BOARD_TOP, (BOARD_LEFT + BOARD_RIGHT) / 2, BOARD_BOTTOM), fill=(0, 0, 0, 60), width=2)
    draw.line((BOARD_LEFT, (BOARD_TOP + BOARD_BOTTOM) / 2, BOARD_RIGHT, (BOARD_TOP + BOARD_BOTTOM) / 2), fill=(0, 0, 0, 55), width=2)
    draw.text((1016, 142), "BLACKTHORN", font=LABEL_SMALL, fill=GOLD)
    draw.text((1016, 162), "MANOR BOARD", font=LABEL_SMALL, fill=PAPER)
    draw.text((1016, 190), "15 rooms", font=BODY_SMALL, fill=MUTED)
    draw.text((1016, 216), "Shared routes", font=BODY_SMALL, fill=MUTED)
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


def caption_for(chapter_index: int, local: float) -> str:
    local_seconds = local * CHAPTER_SECONDS
    chapter = CHAPTERS[chapter_index]
    for caption, (start, end) in zip(chapter.captions, CAPTION_WINDOWS[chapter_index]):
        if start <= local_seconds <= end:
            return caption
    return ""


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
        draw.rounded_rectangle((1016, 288, 1210, 535), radius=14, fill=(13, 9, 10, 235), outline=GOLD, width=2)
        face = 1 + int(local * 28) % 6 if local < 0.48 else 5
        draw_die(draw, (1113, 390), face, local * 28)
        draw.text((1075, 475), "ROLL 5", font=DISPLAY_BOLD, fill=PAPER)
        path = (
            room_center("hall"),
            grid_center(14, 7),
            grid_center(14, 6),
            grid_center(14, 5),
            grid_center(14, 4),
            grid_center(13, 4),
        )
        progress = smooth(max(0, (local - 0.38) / 0.54))
        for point_index, point in enumerate(path):
            active = point_index <= int(progress * (len(path) - 1))
            draw.ellipse((point[0] - 11, point[1] - 11, point[0] + 11, point[1] + 11), fill=TEAL if active else "#5f5850", outline="#e4d5ad")
        x, y = path_position(path, progress)
        paste_standee(image, 0, x, y, 0.58, glow=True)

    elif chapter_index == 2:
        routes = (
            (0, (
                room_center("hall"),
                *(grid_center(14, row) for row in range(7, 3, -1)),
                *(grid_center(column, 4) for column in range(13, 11, -1)),
                room_center("library"),
            )),
            (1, (
                room_center("observatory"),
                *(grid_center(column, 4) for column in range(3, 8)),
                room_center("attic"),
            )),
            (2, (
                room_center("kitchen"),
                *(grid_center(9, row) for row in range(12, 9, -1)),
                *(grid_center(column, 10) for column in range(10, 15)),
                *(grid_center(14, row) for row in range(11, 13)),
                room_center("conservatory"),
            )),
            (3, (
                room_center("conservatory"),
                grid_center(14, 12),
                room_center("garden"),
            )),
        )
        for index, route in routes:
            delayed = max(0.0, min(1.0, local * 1.45 - index * 0.12))
            x, y = path_position(route, delayed)
            paste_standee(image, index, x, y, 0.5, glow=index == 0)
        draw.rounded_rectangle((62, 120, 420, 151), radius=14, fill=(4, 4, 5, 205))
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
    narration_source = OUTPUT / "eldrin-narration.mp3"
    if not narration_source.exists():
        raise RuntimeError(
            "The approved Eldrin narration take is missing from public/tutorial."
        )

    segment_paths: list[Path] = []
    durations: list[float] = []
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    target_voice_seconds = CHAPTER_SECONDS - 0.4
    for index, (start, end) in enumerate(ELDRIN_SEGMENTS):
        target = BUILD / f"voice-{index:02d}.wav"
        source_duration = end - start
        tempo = max(1.0, source_duration / target_voice_seconds)
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-ss",
                f"{start:.3f}",
                "-t",
                f"{source_duration:.3f}",
                "-i",
                str(narration_source),
                "-af",
                f"atempo={tempo:.6f},aresample=44100,aformat=sample_fmts=s16:channel_layouts=mono",
                "-c:a",
                "pcm_s16le",
                str(target),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
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
    for chapter_index, (chapter, start) in enumerate(zip(CHAPTERS, starts)):
        for caption, (local_start, local_end) in zip(
            chapter.captions, CAPTION_WINDOWS[chapter_index]
        ):
            cue_start = start + local_start
            cue_end = start + local_end
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
    poster_frame = int((starts[1] + CHAPTER_SECONDS * 0.58) * FPS)
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
            caption = caption_for(chapter_index, local)
            draw_chrome(frame, chapter_index, time / duration, caption)
            if frame_index == poster_frame:
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
        f"[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.88[voice];"
        f"[2:a]adelay=delays={dice_delay}:all=1,volume=0.56[dice];"
        f"anoisesrc=color=pink:amplitude=0.0065:sample_rate=44100:d={duration:.3f},"
        "highpass=f=140,lowpass=f=1500[amb];"
        f"sine=frequency=55:sample_rate=44100:duration={duration:.3f},volume=0.014[drone];"
        "[voice][dice][amb][drone]amix=inputs=4:duration=longest:dropout_transition=2:normalize=0,"
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
