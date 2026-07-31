"""Build synchronized tutorial films for the alternate narrator cast.

Each ElevenLabs production take is cut at its six authored chapter pauses,
pitch-preserving retimed into the same 12.5-second lesson windows as the
original Eldrin film, and mixed with the project's dice and manor ambience.
The resulting MP4 files can use native mobile video controls without a second
audio element drifting out of sync.
"""

from __future__ import annotations

import subprocess
import wave
from pathlib import Path

import imageio_ffmpeg


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
TUTORIAL = PUBLIC / "tutorial"
SOURCE_AUDIO = ROOT / "assets" / "tutorial-narrators"
BUILD = ROOT / "outputs" / "tutorial-narrators"
SILENT_VIDEO = ROOT / "outputs" / "tutorial-build" / "tutorial-silent.mp4"

CHAPTER_SECONDS = 12.5
TARGET_VOICE_SECONDS = CHAPTER_SECONDS - 0.4
INTRO_SECONDS = 1.0
OUTRO_SECONDS = 1.5
FILM_SECONDS = INTRO_SECONDS + (7 * CHAPTER_SECONDS) + OUTRO_SECONDS

# Midpoints of the six intentional [short pause] beats in each approved take.
# The final value is the complete source duration measured by ffmpeg.
NARRATORS = {
    "rowan-black": {
        "source": "rowan-black-narration.mp3",
        "cuts": (0.0, 12.181, 23.263, 34.141, 48.161, 60.079, 77.585, 85.000),
    },
    "mara-ashford": {
        "source": "mara-ashford-narration.mp3",
        "cuts": (0.0, 13.590, 26.019, 37.772, 52.587, 65.661, 78.193, 93.150),
    },
    "beatrice-vale": {
        "source": "beatrice-vale-narration.mp3",
        "cuts": (0.0, 15.592, 29.663, 42.421, 58.509, 72.707, 86.766, 103.310),
    },
}


def retime_chapters(slug: str, source: Path, cuts: tuple[float, ...]) -> Path:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    narrator_build = BUILD / slug
    narrator_build.mkdir(parents=True, exist_ok=True)
    chapter_files: list[Path] = []
    chapter_durations: list[float] = []

    for index, (start, end) in enumerate(zip(cuts, cuts[1:])):
        source_duration = end - start
        tempo = max(1.0, source_duration / TARGET_VOICE_SECONDS)
        chapter = narrator_build / f"chapter-{index + 1:02d}.wav"
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-ss",
                f"{start:.3f}",
                "-t",
                f"{source_duration:.3f}",
                "-i",
                str(source),
                "-af",
                f"atempo={tempo:.6f},aresample=44100,aformat=sample_fmts=s16:channel_layouts=mono",
                "-c:a",
                "pcm_s16le",
                str(chapter),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        with wave.open(str(chapter), "rb") as track:
            duration = track.getnframes() / track.getframerate()
        if duration > CHAPTER_SECONDS - 0.15:
            raise RuntimeError(f"{slug} chapter {index + 1} exceeds its film window")
        chapter_files.append(chapter)
        chapter_durations.append(duration)

    narration = narrator_build / f"{slug}-timeline.wav"
    with wave.open(str(chapter_files[0]), "rb") as first:
        params = first.getparams()
    with wave.open(str(narration), "wb") as destination:
        destination.setparams(params)
        bytes_per_frame = params.sampwidth * params.nchannels

        def silence(seconds: float) -> None:
            frames = int(seconds * params.framerate)
            destination.writeframes(b"\x00" * frames * bytes_per_frame)

        silence(INTRO_SECONDS)
        for chapter, duration in zip(chapter_files, chapter_durations):
            with wave.open(str(chapter), "rb") as track:
                destination.writeframes(track.readframes(track.getnframes()))
            silence(CHAPTER_SECONDS - duration)
        silence(OUTRO_SECONDS)
    return narration


def mix_film(slug: str, narration: Path) -> Path:
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    dice = PUBLIC / "audio" / "dice-roll-wood.mp3"
    output = TUTORIAL / f"veil-of-secrets-tutorial-{slug}.mp4"
    dice_delay = int((INTRO_SECONDS + CHAPTER_SECONDS + 3.2) * 1000)
    filters = (
        "[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.88[voice];"
        f"[2:a]adelay=delays={dice_delay}:all=1,volume=0.56[dice];"
        f"anoisesrc=color=pink:amplitude=0.0065:sample_rate=44100:d={FILM_SECONDS:.3f},"
        "highpass=f=140,lowpass=f=1500[amb];"
        f"sine=frequency=55:sample_rate=44100:duration={FILM_SECONDS:.3f},volume=0.014[drone];"
        "[voice][dice][amb][drone]amix=inputs=4:duration=longest:dropout_transition=2:normalize=0,"
        "alimiter=limit=0.93[a]"
    )
    subprocess.run(
        [
            ffmpeg,
            "-y",
            "-i",
            str(SILENT_VIDEO),
            "-i",
            str(narration),
            "-i",
            str(dice),
            "-filter_complex",
            filters,
            "-map",
            "0:v:0",
            "-map",
            "[a]",
            "-c:v",
            "copy",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-t",
            f"{FILM_SECONDS:.3f}",
            "-movflags",
            "+faststart",
            str(output),
        ],
        check=True,
    )
    return output


def main() -> None:
    if not SILENT_VIDEO.exists():
        raise RuntimeError("Build the main tutorial film before alternate narrators")
    BUILD.mkdir(parents=True, exist_ok=True)
    for slug, config in NARRATORS.items():
        source = SOURCE_AUDIO / str(config["source"])
        if not source.exists():
            raise RuntimeError(f"Missing approved narration take: {source}")
        narration = retime_chapters(slug, source, tuple(config["cuts"]))
        result = mix_film(slug, narration)
        print(f"{slug}: {result}")


if __name__ == "__main__":
    main()
