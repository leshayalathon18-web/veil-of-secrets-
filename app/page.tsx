"use client";

import {
  Accessibility,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  CircleDot,
  Clock3,
  Dices,
  Eye,
  Feather,
  Flame,
  Footprints,
  Flag,
  Headphones,
  KeyRound,
  Library,
  LockKeyhole,
  MapPin,
  Menu,
  Mic,
  Search,
  Settings,
  ShieldCheck,
  Shuffle,
  Sparkles,
  UsersRound,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { type CSSProperties, useEffect, useMemo, useState } from "react";

type Scene = "opening" | "rules" | "case" | "verdict" | "menu";
type TurnPhase = "roll" | "move" | "search" | "end";
type RoomId =
  | "observatory"
  | "library"
  | "study"
  | "ballroom"
  | "hall"
  | "dining"
  | "conservatory"
  | "cellar"
  | "kitchen";

type Room = {
  id: RoomId;
  name: string;
  kicker: string;
  description: string;
  clue: string;
  note: string;
  icon: typeof Library;
  area: string;
  neighbors: RoomId[];
  hue: string;
  board: { column: number; row: number; width: number; height: number };
  doorway: string;
  doorSide: "top" | "bottom" | "left" | "right";
};

type EvidenceVariant = Pick<Room, "kicker" | "description" | "clue" | "note">;
type BoardNodeId = string;

const rooms: Room[] = [
  {
    id: "observatory",
    name: "Observatory",
    kicker: "The storm seen backwards",
    description:
      "The telescope lens is wet on its western edge, although the rain is driving from the east.",
    clue: "Reversed rain trace",
    note: "The east casement was opened from inside shortly after 10:17, creating a false escape route.",
    icon: Eye,
    area: "observatory",
    neighbors: ["library", "ballroom"],
    hue: "#355d70",
    board: { column: 1, row: 1, width: 4, height: 3 },
    doorway: "p-2-4",
    doorSide: "bottom",
  },
  {
    id: "library",
    name: "Library",
    kicker: "A fire that should be cold",
    description:
      "A page still glows beneath the grate. Someone tried to burn one name and left the rest of the ledger untouched.",
    clue: "Scorched ledger",
    note: "Edmund traced £8,000 in missing estate funds to an account signed C. Harrow.",
    icon: Library,
    area: "library",
    neighbors: ["observatory", "study", "hall"],
    hue: "#75444c",
    board: { column: 6, row: 1, width: 5, height: 3 },
    doorway: "p-8-4",
    doorSide: "bottom",
  },
  {
    id: "study",
    name: "Study",
    kicker: "A clock that contradicts",
    description:
      "Edmund's pocket watch is cracked beneath the writing desk, its hands fixed at the instant it struck marble.",
    clue: "Stopped pocket watch",
    note: "The watch stopped at 10:17. Celia claimed she heard Edmund alive at half past ten.",
    icon: Clock3,
    area: "study",
    neighbors: ["library", "dining"],
    hue: "#5a4a76",
    board: { column: 13, row: 1, width: 4, height: 3 },
    doorway: "p-15-4",
    doorSide: "bottom",
  },
  {
    id: "ballroom",
    name: "Ballroom",
    kicker: "Music with twelve witnesses",
    description:
      "The gramophone needle rests at the final groove while the guest book records a full audience.",
    clue: "Finished waltz record",
    note: "Mirelle was visible on the ballroom stage from 10:10 until the record ended at 10:24.",
    icon: Sparkles,
    area: "ballroom",
    neighbors: ["observatory", "hall", "conservatory"],
    hue: "#7a5b35",
    board: { column: 1, row: 5, width: 4, height: 4 },
    doorway: "p-3-9",
    doorSide: "bottom",
  },
  {
    id: "hall",
    name: "Grand Hall",
    kicker: "A quiet return upstairs",
    description:
      "One narrow, mud-dark print interrupts the polished marble beside the east staircase.",
    clue: "Narrow evening-shoe print",
    note: "The print is a narrow size seven. Elias Voss wears an eleven; Celia's dinner shoes are missing.",
    icon: MapPin,
    area: "hall",
    neighbors: ["library", "ballroom", "dining", "cellar"],
    hue: "#8a6938",
    board: { column: 7, row: 5, width: 4, height: 4 },
    doorway: "p-8-9",
    doorSide: "bottom",
  },
  {
    id: "dining",
    name: "Dining Hall",
    kicker: "A glass nobody drank",
    description:
      "Edmund's cordial remains untouched. A bitter scent comes from orange peel, not poison.",
    clue: "Untouched cordial",
    note: "The drink was staged to suggest poison. Edmund died before returning to the dining table.",
    icon: CircleDot,
    area: "dining",
    neighbors: ["study", "hall", "kitchen"],
    hue: "#6d3b35",
    board: { column: 13, row: 5, width: 4, height: 3 },
    doorway: "p-14-8",
    doorSide: "bottom",
  },
  {
    id: "conservatory",
    name: "Conservatory",
    kicker: "Rain where no window broke",
    description:
      "A single white camellia lies in a trail of rainwater. The garden door was locked from inside.",
    clue: "Rain-soaked camellia",
    note: "Celia wore a white camellia at dinner. Its stem was cut moments before the storm.",
    icon: Sparkles,
    area: "conservatory",
    neighbors: ["ballroom", "cellar"],
    hue: "#3f6754",
    board: { column: 13, row: 10, width: 4, height: 3 },
    doorway: "p-14-13",
    doorSide: "bottom",
  },
  {
    id: "cellar",
    name: "Wine Cellar",
    kicker: "A footprint too obvious",
    description:
      "A broad boot scrape ends beneath a sealed cask, surrounded by soil that never touched the garden path.",
    clue: "Planted boot scrape",
    note: "Someone copied Elias's size-eleven boot to manufacture an alibi against him.",
    icon: Footprints,
    area: "cellar",
    neighbors: ["conservatory", "hall", "kitchen"],
    hue: "#4e4041",
    board: { column: 1, row: 11, width: 5, height: 4 },
    doorway: "p-3-10",
    doorSide: "top",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    kicker: "Silver polish, freshly used",
    description:
      "A crimson wrapping cloth smells of metal polish. Its narrow fold fits a desk blade.",
    clue: "Polishing cloth",
    note: "The silver letter opener was wiped clean in the kitchen and returned to the library desk.",
    icon: Search,
    area: "kitchen",
    neighbors: ["dining", "cellar"],
    hue: "#6a503b",
    board: { column: 7, row: 11, width: 4, height: 4 },
    doorway: "p-8-10",
    doorSide: "top",
  },
];

const evidenceVariants: Record<RoomId, EvidenceVariant[]> = {
  observatory: [
    {
      kicker: "The storm seen backwards",
      description:
        "The telescope lens is wet on its western edge, although the rain is driving from the east.",
      clue: "Reversed rain trace",
      note: "The east casement was opened from inside shortly after 10:17, creating a false escape route.",
    },
    {
      kicker: "A lens wiped too carefully",
      description:
        "A clean crescent cuts through the fogged telescope glass. The cloth used on it carries a thread of crimson velvet.",
      clue: "Crimson lens thread",
      note: "Someone used the observatory to watch the library window, then wiped away a fingerprint with Celia's missing dinner wrap.",
    },
    {
      kicker: "Lightning caught on glass",
      description:
        "A photographic plate captured the east casement shut at 10:18, one minute after Edmund's watch stopped.",
      clue: "Storm-plate exposure",
      note: "The supposed escape through the observatory happened after the crime and was staged from inside the manor.",
    },
  ],
  library: [
    {
      kicker: "A fire that should be cold",
      description:
        "A page still glows beneath the grate. Someone tried to burn one name and left the rest of the ledger untouched.",
      clue: "Scorched ledger",
      note: "Edmund traced £8,000 in missing estate funds to an account signed C. Harrow.",
    },
    {
      kicker: "Pressure survives the flame",
      description:
        "The top ledger sheet is gone, but its transfer figures remain pressed into the page beneath it.",
      clue: "Indented bank transfer",
      note: "The recovered figures end beside the initials C.H. and match the exact amount missing from the estate account.",
    },
    {
      kicker: "Wax beneath the writing desk",
      description:
        "A snapped black wax seal lies beside the library desk, still holding one gold fiber from a solicitor's document ribbon.",
      clue: "Broken solicitor seal",
      note: "The seal belonged to Celia's private account packet. Edmund had opened it before the silver letter opener was taken.",
    },
  ],
  study: [
    {
      kicker: "A clock that contradicts",
      description:
        "Edmund's pocket watch is cracked beneath the writing desk, its hands fixed at the instant it struck marble.",
      clue: "Stopped pocket watch",
      note: "The watch stopped at 10:17. Celia claimed she heard Edmund alive at half past ten.",
    },
    {
      kicker: "A voice cylinder falls silent",
      description:
        "The dictation machine ends mid-sentence as the west clock sounds its quarter-hour and two softer chimes.",
      clue: "Interrupted dictation",
      note: "Edmund was recording at 10:17 and named an urgent meeting with his solicitor before the cylinder stopped.",
    },
    {
      kicker: "An appointment scraped away",
      description:
        "The evening diary has been rubbed nearly blank, but graphite dust reveals a 10:15 meeting marked C.H.",
      clue: "Erased appointment",
      note: "Celia's claim that she never met Edmund after dinner conflicts with his own appointment book.",
    },
  ],
  ballroom: [
    {
      kicker: "Music with twelve witnesses",
      description:
        "The gramophone needle rests at the final groove while the guest book records a full audience.",
      clue: "Finished waltz record",
      note: "Mirelle was visible on the ballroom stage from 10:10 until the record ended at 10:24.",
    },
    {
      kicker: "Applause written in ink",
      description:
        "Twelve guests signed the concert program beside the second waltz, each marking Mirelle's uninterrupted performance.",
      clue: "Signed concert program",
      note: "The signatures place Mirelle in the ballroom throughout the time Edmund died in the library.",
    },
    {
      kicker: "The metronome never stopped",
      description:
        "A spring metronome clicked through the entire final movement while three guests watched Mirelle at the piano.",
      clue: "Witnessed final movement",
      note: "Mirelle's public performance gives her no route to the library before 10:24.",
    },
  ],
  hall: [
    {
      kicker: "A quiet return upstairs",
      description:
        "One narrow, mud-dark print interrupts the polished marble beside the east staircase.",
      clue: "Narrow evening-shoe print",
      note: "The print is a narrow size seven. Elias Voss wears an eleven; Celia's dinner shoes are missing.",
    },
    {
      kicker: "Wax catches a narrow heel",
      description:
        "A fresh heel mark cuts through spilled candle wax beside the library corridor, carrying one white petal.",
      clue: "Camellia heel impression",
      note: "The narrow heel matches Celia's shoes, while the white camellia links the return path to her dinner corsage.",
    },
    {
      kicker: "A handprint on cold brass",
      description:
        "The stair rail holds a small polished handprint above a smear of silver-cleaning rouge.",
      clue: "Rouge-marked handprint",
      note: "The print is too small for Elias and carries the same silver rouge found on Celia's writing gloves.",
    },
  ],
  dining: [
    {
      kicker: "A glass nobody drank",
      description:
        "Edmund's cordial remains untouched. A bitter scent comes from orange peel, not poison.",
      clue: "Untouched cordial",
      note: "The drink was staged to suggest poison. Edmund died before returning to the dining table.",
    },
    {
      kicker: "A decanter still sealed",
      description:
        "The cordial decanter's paper seal is unbroken even though Celia warned the table that Edmund had been poisoned.",
      clue: "Sealed cordial decanter",
      note: "No poisoned drink was poured. Celia introduced that false explanation before anyone examined the glass.",
    },
    {
      kicker: "Bitterness from the garnish",
      description:
        "The supposed poison crystal dissolves into harmless candied peel beneath the dining lamp.",
      clue: "Harmless bitter crystal",
      note: "The dining-room poison story was manufactured to pull attention away from the missing library blade.",
    },
  ],
  conservatory: [
    {
      kicker: "Rain where no window broke",
      description:
        "A single white camellia lies in a trail of rainwater. The garden door was locked from inside.",
      clue: "Rain-soaked camellia",
      note: "Celia wore a white camellia at dinner. Its stem was cut moments before the storm.",
    },
    {
      kicker: "A stem cut after dinner",
      description:
        "Fresh sap shines on the pruning shears beside an empty space in the white camellia bed.",
      clue: "Freshly cut camellia",
      note: "A servant remembers Celia replacing her crushed corsage shortly before she crossed toward the library.",
    },
    {
      kicker: "Glasshouse grit on velvet",
      description:
        "Gold-flecked potting grit clings to a torn strip of crimson velvet beneath the conservatory bench.",
      clue: "Velvet and glasshouse grit",
      note: "The velvet matches Celia's wrap and traces her staged route from the conservatory back into the manor.",
    },
  ],
  cellar: [
    {
      kicker: "A footprint too obvious",
      description:
        "A broad boot scrape ends beneath a sealed cask, surrounded by soil that never touched the garden path.",
      clue: "Planted boot scrape",
      note: "Someone copied Elias's size-eleven boot to manufacture an alibi against him.",
    },
    {
      kicker: "A boot made from plaster",
      description:
        "White plaster crumbs line a broad footprint beneath the casks; the tread repeats too perfectly to be real.",
      clue: "Cast boot impression",
      note: "The false print was pressed from a mold of Elias's boot and planted after the cellar floor had dried.",
    },
    {
      kicker: "Garden soil in the wrong cellar",
      description:
        "The dirt beside the cask contains conservatory perlite, not the heavy clay from Elias's garden path.",
      clue: "Mismatched planted soil",
      note: "The cellar trail came from an indoor planter and was arranged to implicate the groundskeeper.",
    },
  ],
  kitchen: [
    {
      kicker: "Silver polish, freshly used",
      description:
        "A crimson wrapping cloth smells of metal polish. Its narrow fold fits a desk blade.",
      clue: "Polishing cloth",
      note: "The silver letter opener was wiped clean in the kitchen and returned to the library desk.",
    },
    {
      kicker: "Rouge left in the basin",
      description:
        "A crescent of silver-cleaning rouge remains in the washbasin beside one strand of gold document ribbon.",
      clue: "Silver rouge residue",
      note: "The residue matches the library opener and the ribbon from Celia's opened account packet.",
    },
    {
      kicker: "A servant remembers the request",
      description:
        "The kitchen order slate records silver polish delivered to C. Harrow at 10:05 and returned without its cloth.",
      clue: "Polish delivery record",
      note: "Celia had both the cleaning material and the opportunity to erase prints from the letter opener.",
    },
  ],
};

const caseVariations = [
  {
    title: "The Ashes in the Library",
    subtitle: "A burned ledger, a silent blade, and a lie told before midnight.",
  },
  {
    title: "The Solicitor's Midnight",
    subtitle: "An erased appointment exposes the path between the accounts and the library.",
  },
  {
    title: "The Camellia Account",
    subtitle: "White petals and silver rouge mark a carefully staged return through Blackthorn.",
  },
] as const;

const detectiveRoster = [
  { id: "you", name: "You", title: "The Lantern", initials: "YL", color: "#e3c878" },
  { id: "iris", name: "Iris Bell", title: "The Listener", initials: "IB", color: "#75b8c8" },
  { id: "theo", name: "Theo Wren", title: "The Archivist", initials: "TW", color: "#a98bd4" },
  { id: "nell", name: "Nell Fox", title: "The Skeptic", initials: "NF", color: "#d16d78" },
  { id: "mara", name: "Mara Vale", title: "The Cartographer", initials: "MV", color: "#77b78b" },
  { id: "gideon", name: "Gideon Pike", title: "The Locksmith", initials: "GP", color: "#d29a62" },
  { id: "sable", name: "Sable Quinn", title: "The Shadow", initials: "SQ", color: "#8c9fca" },
  { id: "rowan", name: "Rowan Chase", title: "The Analyst", initials: "RC", color: "#c47f9f" },
  { id: "ophelia", name: "Ophelia Reed", title: "The Medium", initials: "OR", color: "#9b83c5" },
  { id: "bram", name: "Bram Locke", title: "The Watchman", initials: "BL", color: "#a7a167" },
] as const;

type Detective = (typeof detectiveRoster)[number];

const initialDetectives = detectiveRoster.slice(0, 4);

function drawDetectives() {
  const companions = [...detectiveRoster.slice(1)];
  for (let index = companions.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [companions[index], companions[swapIndex]] = [companions[swapIndex], companions[index]];
  }
  return [detectiveRoster[0], ...companions.slice(0, 3)];
}

const coordinateKey = (column: number, row: number) => `p-${column}-${row}`;

const corridorCoordinates = (() => {
  const coordinates: Array<[number, number]> = [];
  for (let column = 1; column <= 16; column += 1) {
    coordinates.push([column, 4], [column, 9]);
  }
  for (let row = 1; row <= 10; row += 1) coordinates.push([5, row]);
  for (let row = 1; row <= 14; row += 1) {
    coordinates.push([11, row], [12, row]);
  }
  for (let column = 11; column <= 16; column += 1) coordinates.push([column, 13]);
  coordinates.push([14, 8], [3, 10], [8, 10]);

  return Array.from(
    new Map(
      coordinates.map(([column, row]) => [
        coordinateKey(column, row),
        { id: coordinateKey(column, row), column, row },
      ]),
    ).values(),
  );
})();

const boardGraph = (() => {
  const graph: Record<BoardNodeId, BoardNodeId[]> = {};
  const corridorIds = new Set(corridorCoordinates.map((space) => space.id));
  for (const space of corridorCoordinates) {
    graph[space.id] = [
      coordinateKey(space.column - 1, space.row),
      coordinateKey(space.column + 1, space.row),
      coordinateKey(space.column, space.row - 1),
      coordinateKey(space.column, space.row + 1),
    ].filter((id) => corridorIds.has(id));
  }
  for (const room of rooms) {
    graph[room.id] = [room.doorway];
    graph[room.doorway] = [...(graph[room.doorway] ?? []), room.id];
  }
  return graph;
})();

function placeDetectives(
  lineup: ReadonlyArray<Detective>,
) {
  const startingRooms: RoomId[] = ["observatory", "kitchen", "conservatory"];
  return lineup.reduce<Record<string, BoardNodeId>>((positions, detective, index) => {
    positions[detective.id] = index === 0 ? "hall" : startingRooms[index - 1];
    return positions;
  }, {});
}

const manorEvents = [
  {
    title: "A candle gutters out",
    text: "The east corridor goes dark. Every detective moves with care until the next roll.",
  },
  {
    title: "A floorboard answers",
    text: "A hollow knock reveals that someone crossed the hall twice after 10:17.",
  },
  {
    title: "Thunder over Blackthorn",
    text: "The room falls silent. Share one clue aloud before the next turn begins.",
  },
  {
    title: "A servant remembers",
    text: "Celia requested silver polish shortly before dinner. Mark the kitchen for inspection.",
  },
  {
    title: "The west clock chimes",
    text: "Advance the Veil track. At midnight, every detective must seal a theory.",
  },
];

const rules = [
  {
    number: "I",
    title: "Roll and roam",
    body: "Roll the brass die and move your detective through connected doorways on the Blackthorn board.",
    icon: Dices,
  },
  {
    number: "II",
    title: "Search and share",
    body: "Spend your turn searching a room. The clue enters your notebook—what you reveal at the table is your choice.",
    icon: BookOpen,
  },
  {
    number: "III",
    title: "Seal your theory",
    body: "Before midnight, name the culprit, method, location, and motive. Complete deductions earn the strongest score.",
    icon: Feather,
  },
];

const menuItems = [
  {
    label: "Enter Blackthorn",
    detail: "Play the interactive manor board",
    icon: KeyRound,
    action: "case",
  },
  {
    label: "How deduction works",
    detail: "Replay the visual rules",
    icon: BookOpen,
    action: "rules",
  },
  {
    label: "Accessibility",
    detail: "Text, motion, captions, and sound",
    icon: Accessibility,
    action: "settings",
  },
] as const;

const suspects = [
  {
    id: "celia",
    name: "Celia Harrow",
    role: "Estate solicitor",
    detail: "Controlled the manor accounts and wore a white camellia.",
    monogram: "CH",
  },
  {
    id: "elias",
    name: "Elias Voss",
    role: "Head groundskeeper",
    detail: "Knew every garden lock, but his boots do not match the hall print.",
    monogram: "EV",
  },
  {
    id: "mirelle",
    name: "Mirelle Ash",
    role: "Concert pianist",
    detail: "Argued with Edmund, then performed in front of twelve witnesses.",
    monogram: "MA",
  },
];

const methods = ["Silver letter opener", "Poisoned cordial", "Falling marble bust"];
const locations = ["The Library", "The Conservatory", "The Study"];
const motives = [
  "To conceal the stolen estate funds",
  "To inherit Blackthorn Manor",
  "To stop a private engagement",
];

const turnPhases: { id: TurnPhase; label: string; detail: string }[] = [
  { id: "roll", label: "Roll", detail: "Cast the movement die" },
  { id: "move", label: "Move", detail: "Follow connected corridors" },
  { id: "search", label: "Search", detail: "Draw evidence from your room" },
  { id: "end", label: "Pass", detail: "Reveal a manor event" },
];

const dicePips: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function playChime(enabled: boolean, success = false) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  const gain = ctx.createGain();
  const oscillator = ctx.createOscillator();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(success ? 523.25 : 293.66, ctx.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(
    success ? 783.99 : 369.99,
    ctx.currentTime + 0.18,
  );
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.26);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.28);
}

function playDiceRoll(enabled: boolean, reducedMotion: boolean) {
  if (!enabled || typeof window === "undefined") return;
  const audio = new Audio(
    new URL("./audio/dice-roll-wood.mp3", document.baseURI).toString(),
  );
  audio.volume = 0.82;
  audio.playbackRate = reducedMotion ? 1.2 : 1;
  void audio.play().catch(() => {
    // Browsers can reject audio before a user gesture; the roll still completes.
  });
}

function readPreference(key: string, fallback: boolean) {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem("veil-preferences");
    if (!saved) return fallback;
    const value = JSON.parse(saved)[key];
    return typeof value === "boolean" ? value : fallback;
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [scene, setScene] = useState<Scene>("opening");
  const [openingDeparting, setOpeningDeparting] = useState(false);
  const [ruleIndex, setRuleIndex] = useState(0);
  const [investigated, setInvestigated] = useState<RoomId[]>([]);
  const [activeRoom, setActiveRoom] = useState<RoomId | null>(null);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accusationOpen, setAccusationOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(() => readPreference("soundOn", true));
  const [largeText, setLargeText] = useState(() => readPreference("largeText", false));
  const [reducedMotion, setReducedMotion] = useState(() =>
    readPreference("reducedMotion", false),
  );
  const [captionsOn, setCaptionsOn] = useState(() =>
    readPreference("captionsOn", true),
  );
  const [selectedSuspect, setSelectedSuspect] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedMotive, setSelectedMotive] = useState("");
  const [wrongTheory, setWrongTheory] = useState(false);
  const [caseVariant, setCaseVariant] = useState(0);
  const [detectives, setDetectives] = useState<Detective[]>([...initialDetectives]);
  const [round, setRound] = useState(1);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [diceFace, setDiceFace] = useState(6);
  const [diceRolling, setDiceRolling] = useState(false);
  const [movesLeft, setMovesLeft] = useState(0);
  const [pathThisTurn, setPathThisTurn] = useState<BoardNodeId[]>(["hall"]);
  const [searchedThisTurn, setSearchedThisTurn] = useState(false);
  const [eventIndex, setEventIndex] = useState<number | null>(null);
  const [boardNotice, setBoardNotice] = useState(
    "Roll the brass die, then walk the glowing marble spaces into a room.",
  );
  const [pawnPositions, setPawnPositions] = useState<Record<string, BoardNodeId>>(
    placeDetectives(initialDetectives),
  );

  const evidenceCount = investigated.length;
  const canAccuse = evidenceCount >= 4;
  const currentCase = caseVariations[caseVariant];
  const caseRooms = useMemo(
    () =>
      rooms.map((room) => ({
        ...room,
        ...evidenceVariants[room.id][caseVariant],
      })),
    [caseVariant],
  );
  const activeRoomData = caseRooms.find((room) => room.id === activeRoom);
  const currentRoom = caseRooms.find((room) => room.id === pawnPositions.you);
  const currentLocationName = currentRoom?.name ?? "Manor corridor";
  const reachableNodes = boardGraph[pawnPositions.you] ?? [];
  const hasRolled = diceValue !== null;
  const turnPhase: TurnPhase = diceRolling
    ? "roll"
    : !hasRolled
      ? "roll"
      : movesLeft > 0 && !searchedThisTurn
        ? "move"
        : currentRoom && !searchedThisTurn
          ? "search"
          : "end";
  const turnPhaseIndex = turnPhases.findIndex((phase) => phase.id === turnPhase);
  const accusationComplete =
    selectedSuspect && selectedMethod && selectedLocation && selectedMotive;

  useEffect(() => {
    window.localStorage.setItem(
      "veil-preferences",
      JSON.stringify({ soundOn, largeText, reducedMotion, captionsOn }),
    );
  }, [soundOn, largeText, reducedMotion, captionsOn]);

  const clueProgress = useMemo(
    () => caseRooms.map((room) => investigated.includes(room.id)),
    [caseRooms, investigated],
  );

  const moveTo = (next: Scene) => {
    playChime(soundOn);
    setScene(next);
  };

  const enterManor = () => {
    if (openingDeparting) return;
    playChime(soundOn, true);
    if (reducedMotion) {
      setScene("rules");
      return;
    }
    setOpeningDeparting(true);
    window.setTimeout(() => {
      setScene("rules");
      setOpeningDeparting(false);
    }, 680);
  };

  const inspectRoom = (room: Room) => {
    setActiveRoom(room.id);
    if (!investigated.includes(room.id)) {
      setInvestigated((current) => [...current, room.id]);
      playChime(soundOn);
    }
  };

  const rollDice = () => {
    if (diceRolling || hasRolled) return;
    const value = Math.floor(Math.random() * 6) + 1;
    const rollDuration = reducedMotion ? 280 : 760;
    const faceSequence = [2, 5, 3, 6, 1, 4, value];
    setDiceRolling(true);
    setEventIndex(null);
    setPathThisTurn([pawnPositions.you]);
    setBoardNotice("The wooden die tumbles across the velvet-lined tray...");
    playDiceRoll(soundOn, reducedMotion);

    faceSequence.forEach((face, index) => {
      window.setTimeout(
        () => setDiceFace(face),
        Math.round((rollDuration / faceSequence.length) * index),
      );
    });
    window.setTimeout(() => {
      setDiceFace(value);
      setDiceValue(value);
      setMovesLeft(value);
      setDiceRolling(false);
      setBoardNotice(
        value === 1
          ? "You rolled 1. Walk to one glowing marble space."
          : `You rolled ${value}. Walk through up to ${value} connected spaces and enter a room.`,
      );
    }, rollDuration);
  };

  const movePawn = (nodeId: BoardNodeId) => {
    if (!hasRolled || movesLeft < 1 || !reachableNodes.includes(nodeId)) return;
    const enteredRoom = caseRooms.find((room) => room.id === nodeId);
    setPawnPositions((current) => ({ ...current, you: nodeId }));
    setPathThisTurn((current) => [...current, nodeId]);
    setMovesLeft((current) => current - 1);
    setSearchedThisTurn(false);
    setBoardNotice(
      enteredRoom
        ? investigated.includes(enteredRoom.id)
          ? `You walked into the ${enteredRoom.name}. Its strongest clue is already secured.`
          : `You walked into the ${enteredRoom.name}. Search it now, or leave through the doorway.`
        : "Your pawn advances across the marble corridor. Choose the next glowing space.",
    );
    playChime(soundOn);
  };

  const searchCurrentRoom = () => {
    if (!hasRolled || searchedThisTurn || !currentRoom) return;
    setSearchedThisTurn(true);
    setMovesLeft(0);
    inspectRoom(currentRoom);
    setBoardNotice(`${currentRoom.clue} was added to your private notebook.`);
  };

  const endBoardTurn = () => {
    const nextEvent = Math.floor(Math.random() * manorEvents.length);
    setEventIndex(nextEvent);
    setPawnPositions((current) => {
      const next = { ...current };
      for (const detective of detectives.slice(1)) {
        const currentNode = current[detective.id] ?? "hall";
        const choices = boardGraph[currentNode] ?? ["hall"];
        next[detective.id] = choices[Math.floor(Math.random() * choices.length)] ?? "hall";
      }
      return next;
    });
    setRound((current) => current + 1);
    setDiceValue(null);
    setDiceFace(6);
    setMovesLeft(0);
    setPathThisTurn([pawnPositions.you]);
    setSearchedThisTurn(false);
    setBoardNotice("The other detectives have moved. Your turn begins again.");
    playChime(soundOn);
  };

  const restartBoard = () => {
    const nextVariant = (caseVariant + 1 + Math.floor(Math.random() * 2)) % caseVariations.length;
    const nextDetectives = drawDetectives();
    setCaseVariant(nextVariant);
    setDetectives(nextDetectives);
    setRound(1);
    setDiceValue(null);
    setDiceFace(6);
    setMovesLeft(0);
    setPathThisTurn(["hall"]);
    setSearchedThisTurn(false);
    setEventIndex(null);
    setInvestigated([]);
    setActiveRoom(null);
    setNotebookOpen(false);
    setAccusationOpen(false);
    setSelectedSuspect("");
    setSelectedMethod("");
    setSelectedLocation("");
    setSelectedMotive("");
    setWrongTheory(false);
    setPawnPositions(placeDetectives(nextDetectives));
    setBoardNotice(
      "A new case, detective table, and evidence trail are ready. Roll to leave the Grand Hall.",
    );
    playChime(soundOn);
  };

  const submitTheory = () => {
    const correct =
      selectedSuspect === "celia" &&
      selectedMethod === "Silver letter opener" &&
      selectedLocation === "The Library" &&
      selectedMotive === "To conceal the stolen estate funds";

    if (correct) {
      playChime(soundOn, true);
      setWrongTheory(false);
      setAccusationOpen(false);
      setScene("verdict");
    } else {
      playChime(soundOn);
      setWrongTheory(true);
    }
  };

  return (
    <main
      className={`veil-app ${largeText ? "large-text" : ""} ${
        reducedMotion ? "reduced-motion" : ""
      }`}
    >
      <div className="atmosphere" aria-hidden="true">
        <div className="mist mist-one" />
        <div className="mist mist-two" />
        <span className="dust dust-one" />
        <span className="dust dust-two" />
        <span className="dust dust-three" />
        <span className="dust dust-four" />
      </div>

      {scene !== "opening" && (
        <header className="topbar">
          <button
            className="brand-lockup"
            onClick={() => moveTo("menu")}
            aria-label="Return to main menu"
          >
            <span className="brand-mark" aria-hidden="true">
              V
            </span>
            <span>
              <strong>Veil of Secrets</strong>
              <small>Blackthorn Manor</small>
            </span>
          </button>

          <div className="topbar-actions">
            {scene === "case" && (
              <div className="case-clock">
                <Clock3 size={15} aria-hidden="true" />
                <span>10:42 PM</span>
              </div>
            )}
            <button
              className="icon-button"
              onClick={() => setSoundOn((value) => !value)}
              aria-label={soundOn ? "Mute sound" : "Turn on sound"}
              aria-pressed={soundOn}
            >
              {soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
            <button
              className="icon-button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open accessibility settings"
            >
              <Settings size={19} />
            </button>
          </div>
        </header>
      )}

      {scene === "opening" && (
        <section
          className={`opening scene ${openingDeparting ? "opening-departing" : ""}`}
          aria-labelledby="opening-title"
        >
          <div className="opening-cinematic-bg" aria-hidden="true">
            <span className="opening-moon" />
            <span className="manor-silhouette">
              <i className="manor-roof" />
              <i className="manor-window window-one" />
              <i className="manor-window window-two" />
              <i className="manor-window window-three" />
            </span>
            <span className="lightning lightning-one" />
            <span className="lightning lightning-two" />
            <span className="opening-rain" />
          </div>

          <div className="velvet-curtain curtain-left" aria-hidden="true" />
          <div className="velvet-curtain curtain-right" aria-hidden="true" />

          <div className="opening-embers" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <i
                key={index}
                style={
                  {
                    "--ember-x": `${8 + ((index * 29) % 84)}%`,
                    "--ember-delay": `${index * -0.73}s`,
                    "--ember-duration": `${6.5 + index * 0.18}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className="opening-lockup">
            <p className="opening-kicker">
              <span />
              An original mystery experience
              <span />
            </p>

            <div className="veil-sigil" aria-hidden="true">
              <span className="sigil-aura" />
              <span className="sigil-diamond diamond-outer" />
              <span className="sigil-diamond diamond-inner" />
              <span className="sigil-crown">
                <i />
                <i />
                <i />
              </span>
              <span className="sigil-letter">V</span>
              <span className="sigil-eye-shell">
                <Eye size={35} strokeWidth={1.15} />
                <i />
              </span>
              <span className="sigil-keyhole" />
            </div>

            <h1 id="opening-title" aria-label="Veil of Secrets">
              <span className="title-veil">Veil</span>
              <em>of</em>
              <span className="title-secrets">Secrets</span>
            </h1>

            <p className="opening-copy">
              Every room remembers. Every witness edits the truth.
            </p>

            <div className="opening-promise">
              <Sparkles size={14} aria-hidden="true" />
              <span>New cast</span>
              <i />
              <span>New trail</span>
              <i />
              <span>Every case</span>
            </div>

            <div className="ornament" aria-hidden="true">
              <span />
              <i />
              <span />
            </div>

            <div className="opening-actions">
              <button
                className="primary-button opening-button"
                onClick={enterManor}
                disabled={openingDeparting}
              >
                <span>Enter Blackthorn Manor</span>
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button
                className="text-button"
                onClick={() => moveTo("menu")}
                disabled={openingDeparting}
              >
                Skip prologue
              </button>
            </div>
          </div>

          <div className="opening-caption">
            <span>
              <Headphones size={14} aria-hidden="true" />
              Headphones recommended
            </span>
            <span>
              <Flame size={14} aria-hidden="true" />
              A Blackthorn Manor mystery
            </span>
          </div>
        </section>
      )}

      {scene === "rules" && (
        <section className="rules scene" aria-labelledby="rules-title">
          <div className="scene-heading">
            <p className="eyebrow">The investigator&apos;s compact</p>
            <h2 id="rules-title">Truth has a pattern.</h2>
            <p>Learn it in three moves. You can return here from the menu at any time.</p>
          </div>

          <div className="rules-layout">
            <div className="rule-stage">
              <div className="rule-number">{rules[ruleIndex].number}</div>
              <div className="rule-icon-shell">
                {(() => {
                  const Icon = rules[ruleIndex].icon;
                  return <Icon size={42} strokeWidth={1.35} aria-hidden="true" />;
                })()}
              </div>
              <div className="rule-copy">
                <span>Principle {ruleIndex + 1} of 3</span>
                <h3>{rules[ruleIndex].title}</h3>
                <p>{rules[ruleIndex].body}</p>
              </div>
            </div>

            <div className="rule-navigation" aria-label="Rules progress">
              {rules.map((rule, index) => (
                <button
                  key={rule.title}
                  className={index === ruleIndex ? "active" : ""}
                  onClick={() => {
                    setRuleIndex(index);
                    playChime(soundOn);
                  }}
                  aria-label={`Show rule ${index + 1}: ${rule.title}`}
                  aria-current={index === ruleIndex ? "step" : undefined}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{rule.title}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="rules-footer">
            <button
              className="secondary-button"
              onClick={() => setRuleIndex((current) => Math.max(0, current - 1))}
              disabled={ruleIndex === 0}
            >
              <ChevronLeft size={17} /> Back
            </button>
            {ruleIndex < rules.length - 1 ? (
              <button
                className="primary-button"
                onClick={() => {
                  setRuleIndex((current) => current + 1);
                  playChime(soundOn);
                }}
              >
                Next principle <ArrowRight size={17} />
              </button>
            ) : (
              <button className="primary-button" onClick={() => moveTo("case")}>
                Begin practice case <ArrowRight size={17} />
              </button>
            )}
          </div>
        </section>
      )}

      {scene === "menu" && (
        <section className="menu-scene scene" aria-labelledby="menu-title">
          <div className="menu-copy">
            <p className="eyebrow">Blackthorn Manor · October 17, 1897</p>
            <h2 id="menu-title">
              Good evening,
              <span>Investigator.</span>
            </h2>
            <p>
              A storm has sealed the estate. Before dawn, one elegant lie will
              become the accepted truth—unless you break it first.
            </p>
            <div className="profile-strip">
              <div className="rank-seal">
                <ShieldCheck size={20} />
              </div>
              <div>
                <small>Current distinction</small>
                <strong>Guest Investigator</strong>
              </div>
              <span>0 / 1 cases closed</span>
            </div>
          </div>

          <nav className="menu-list" aria-label="Main menu">
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() =>
                    item.action === "settings"
                      ? setSettingsOpen(true)
                      : moveTo(item.action)
                  }
                >
                  <span className="menu-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="menu-icon">
                    <Icon size={22} strokeWidth={1.5} />
                  </span>
                  <span className="menu-label">
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <ArrowRight className="menu-arrow" size={20} />
                </button>
              );
            })}
            <div className="menu-status">
              <div className="live-dot" />
              <span>Blackthorn table ready</span>
              <small>You + 3 manor minds</small>
            </div>
          </nav>
        </section>
      )}

      {scene === "case" && (
        <section className="case-scene scene" aria-labelledby="case-title">
          <div className="tabletop-header">
            <div>
              <p className="eyebrow">
                Blackthorn table · Case {String(caseVariant + 1).padStart(3, "0")}
              </p>
              <h2 id="case-title">{currentCase.title}</h2>
              <p>{currentCase.subtitle}</p>
            </div>
            <div className="tabletop-header-actions">
              <button
                className="icon-button"
                onClick={restartBoard}
                aria-label="Start a new case with a new cast and clues"
                title="New case, cast, and clues"
              >
                <Shuffle size={18} />
              </button>
              <button className="notebook-button" onClick={() => setNotebookOpen(true)}>
                <BookOpen size={18} />
                <span>
                  Notebook
                  <small>{evidenceCount} of {caseRooms.length} clues</small>
                </span>
              </button>
            </div>
          </div>

          <div className="tabletop-status">
            <span><UsersRound size={15} /> Family table · You + 3 manor minds</span>
            <strong>Round {round}</strong>
            <div className="veil-pips" aria-label={`Veil track, round ${round} of 8`}>
              {Array.from({ length: 8 }).map((_, index) => (
                <i key={index} className={index < Math.min(round, 8) ? "filled" : ""} />
              ))}
            </div>
            <small>{round >= 8 ? "Midnight is here — seal a theory." : `${8 - round} rounds until midnight`}</small>
          </div>

          <ol className="turn-phase-rail" aria-label={`Turn phase: ${turnPhase}`}>
            {turnPhases.map((phase, index) => (
              <li
                key={phase.id}
                className={`${phase.id === turnPhase ? "active" : ""} ${
                  index < turnPhaseIndex ? "complete" : ""
                }`}
              >
                <span>{index < turnPhaseIndex ? <Check size={14} /> : index + 1}</span>
                <div>
                  <strong>{phase.label}</strong>
                  <small>{phase.detail}</small>
                </div>
              </li>
            ))}
          </ol>

          <div className="tabletop-layout">
            <aside className="turn-panel" aria-label="Detective turn order">
              <div className="panel-label">
                <span>Turn order</span>
                <Flag size={15} />
              </div>
              <div className="detective-stack">
                {detectives.map((detective, index) => (
                  <article className={index === 0 ? "active" : ""} key={detective.id}>
                    <div
                      className="detective-token"
                      style={{ "--player-color": detective.color } as CSSProperties}
                    >
                      {detective.initials}
                    </div>
                    <span>
                      <strong>{detective.name}</strong>
                      <small>{detective.title}</small>
                    </span>
                    {index === 0 ? <b>Your turn</b> : <i>{index + 1}</i>}
                  </article>
                ))}
              </div>

              <div className="evidence-meter">
                <div>
                  <span>Shared evidence</span>
                  <strong>{evidenceCount}/{caseRooms.length}</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${(evidenceCount / caseRooms.length) * 100}%` }} />
                </div>
                <small>{canAccuse ? "A complete theory is now possible." : "Find four clues to unlock accusations."}</small>
              </div>
            </aside>

            <div className="manor-board-wrap">
              <div className="board-ribbon">
                <span><CircleDot size={14} /> Your pawn is in the {currentLocationName}</span>
                <strong>{movesLeft > 0 ? `${movesLeft} moves left` : hasRolled ? "Choose an action" : "Awaiting roll"}</strong>
              </div>
              <div className="manor-board" aria-label="Interactive Blackthorn Manor board">
                <div className="board-atmosphere" aria-hidden="true" />
                {corridorCoordinates.map((space, spaceIndex) => {
                  const occupied = detectives.filter(
                    (detective) => pawnPositions[detective.id] === space.id,
                  );
                  const pathStep = pathThisTurn.lastIndexOf(space.id);
                  const reachable =
                    hasRolled && movesLeft > 0 && reachableNodes.includes(space.id);
                  const current = pawnPositions.you === space.id;
                  return (
                    <button
                      key={space.id}
                      className={`floor-space ${reachable ? "reachable" : ""} ${
                        current ? "current" : ""
                      } ${pathStep >= 0 ? "turn-path" : ""}`}
                      style={{
                        gridColumn: space.column,
                        gridRow: space.row,
                      }}
                      onClick={() => movePawn(space.id)}
                      disabled={!reachable}
                      aria-label={`Marble hallway space ${spaceIndex + 1}${
                        current ? ", your current position" : ""
                      }${reachable ? ", reachable" : ""}`}
                    >
                      <span className="floor-inlay" aria-hidden="true" />
                      <span className="pawn-cluster" aria-hidden="true">
                        {occupied.map((detective) => (
                          <i
                            key={detective.id}
                            title={detective.name}
                            style={{ "--player-color": detective.color } as CSSProperties}
                          >
                            <span className="pawn-head" />
                            <span className="pawn-body" />
                            <b>{detective.initials.slice(0, 1)}</b>
                          </i>
                        ))}
                      </span>
                      {pathStep > 0 && (
                        <span className="path-step" aria-hidden="true">{pathStep}</span>
                      )}
                    </button>
                  );
                })}
                {caseRooms.map((room, roomIndex) => {
                  const Icon = room.icon;
                  const found = investigated.includes(room.id);
                  const occupied = detectives.filter(
                    (detective) => pawnPositions[detective.id] === room.id,
                  );
                  const pathStep = pathThisTurn.lastIndexOf(room.id);
                  const reachable =
                    hasRolled && movesLeft > 0 && reachableNodes.includes(room.id);
                  const current = pawnPositions.you === room.id;
                  return (
                    <button
                      key={room.id}
                      className={`floor-room room-${room.id} ${found ? "discovered" : ""} ${
                        reachable ? "reachable" : ""
                      } ${current ? "current" : ""} ${
                        pathStep >= 0 ? "turn-path" : ""
                      }`}
                      style={{
                        gridColumn: `${room.board.column} / span ${room.board.width}`,
                        gridRow: `${room.board.row} / span ${room.board.height}`,
                        "--room-hue": room.hue,
                      } as CSSProperties}
                      onClick={() => movePawn(room.id)}
                      disabled={!reachable}
                      aria-label={`${room.name}${current ? ", your current room" : ""}${
                        reachable ? ", enter room" : ""
                      }`}
                    >
                      <span className={`room-door ${room.doorSide}`} aria-hidden="true" />
                      <span className={`room-furniture furniture-${room.id}`} aria-hidden="true">
                        <i /><i /><i />
                      </span>
                      <span className="room-tile-number" aria-hidden="true">
                        {String(roomIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="board-room-icon">
                        <Icon size={17} strokeWidth={1.5} />
                      </span>
                      <span className="board-room-copy">
                        <strong>{room.name}</strong>
                        <small>{found ? room.clue : current ? "Search this room" : "Enter through the door"}</small>
                      </span>
                      {found && <Check className="clue-check" size={14} />}
                      <span className="pawn-cluster" aria-hidden="true">
                        {occupied.map((detective) => (
                          <i
                            key={detective.id}
                            title={detective.name}
                            style={{ "--player-color": detective.color } as CSSProperties}
                          >
                            <span className="pawn-head" />
                            <span className="pawn-body" />
                            <b>{detective.initials.slice(0, 1)}</b>
                          </i>
                        ))}
                      </span>
                      {pathStep > 0 && (
                        <span className="path-step" aria-hidden="true">
                          {pathStep}
                        </span>
                      )}
                      {reachable && <span className="doorway-pulse" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
              <p className="board-notice" aria-live="polite">
                <Footprints size={15} />
                {boardNotice}
              </p>
              <div className="board-key" aria-label="Board key">
                <span><i className="key-pawn" /> Detective pawn</span>
                <span><i className="key-door" /> Walkable marble space</span>
                <span><i className="key-room" /> Enterable room</span>
                <span><i className="key-clue"><Check size={9} /></i> Clue secured</span>
              </div>
            </div>

            <aside className="action-console" aria-label="Turn actions">
              <div className="panel-label">
                <span>Action tray</span>
                <Dices size={15} />
              </div>
              <div className="dice-tray">
                <span className="tray-title">Movement tray</span>
                <button
                  className={`brass-die ${diceRolling ? "rolling" : ""}`}
                  onClick={rollDice}
                  disabled={hasRolled || diceRolling}
                  aria-label={hasRolled ? `Rolled ${diceValue}` : "Roll the six-sided movement die"}
                >
                  <span className="die-face" aria-hidden="true">
                    {Array.from({ length: 9 }).map((_, index) => (
                      <i
                        key={index}
                        className={dicePips[diceRolling ? diceFace : diceValue ?? 6].includes(index) ? "pip" : ""}
                      />
                    ))}
                  </span>
                </button>
                <strong className="roll-readout">
                  {diceRolling
                    ? "Rolling..."
                    : hasRolled
                      ? `${diceValue} corridor${diceValue === 1 ? "" : "s"}`
                      : "Tap the die"}
                </strong>
                <small>{soundOn ? "Recorded wooden-table roll on" : "Sound is muted"}</small>
              </div>

              <div className="turn-actions">
                <button
                  className="table-action search-action"
                  onClick={searchCurrentRoom}
                  disabled={!hasRolled || searchedThisTurn || !currentRoom}
                >
                  <Search size={18} />
                  <span>
                    <strong>Search room</strong>
                    <small>{currentRoom?.name ?? "Enter a room first"}</small>
                  </span>
                </button>
                <button
                  className="table-action"
                  onClick={endBoardTurn}
                  disabled={!hasRolled}
                >
                  <ArrowRight size={18} />
                  <span>
                    <strong>End turn</strong>
                    <small>Let rivals move</small>
                  </span>
                </button>
                <button
                  className="table-action accusation-action"
                  onClick={() => setAccusationOpen(true)}
                  disabled={!canAccuse && round < 8}
                >
                  <Feather size={18} />
                  <span>
                    <strong>Seal theory</strong>
                    <small>{canAccuse ? "Accusation ready" : "Needs four clues"}</small>
                  </span>
                </button>
              </div>

              <div className={`manor-card ${eventIndex !== null ? "revealed" : ""}`}>
                <div className="card-back">
                  <Eye size={24} />
                  <span>MANOR EVENT</span>
                </div>
                <div className="card-face">
                  <small>Manor event</small>
                  <strong>{eventIndex !== null ? manorEvents[eventIndex].title : "End a turn to draw"}</strong>
                  <p>{eventIndex !== null ? manorEvents[eventIndex].text : "The house changes between every round."}</p>
                </div>
              </div>
            </aside>
          </div>

          <aside className="witness-strip tabletop-talk">
            <div className="witness-icon">
              <Mic size={20} />
              <span />
            </div>
            <div>
              <small>Table talk · Celia Harrow&apos;s statement</small>
              <p>
                “At half past ten, I heard Edmund pacing in the library.”
                Decide together: memory, mistake, or deliberate misdirection?
              </p>
            </div>
            <span className="caption-badge">
              <Headphones size={14} />
              {captionsOn ? "Captioned" : "Audio available"}
            </span>
          </aside>
        </section>
      )}

      {scene === "verdict" && (
        <section className="verdict scene" aria-labelledby="verdict-title">
          <div className="verdict-seal" aria-hidden="true">
            <span />
            <Check size={42} strokeWidth={1.2} />
          </div>
          <p className="eyebrow">
            Case {String(caseVariant + 1).padStart(3, "0")} · Truth established
          </p>
          <h2 id="verdict-title">The veil is lifted.</h2>
          <p className="verdict-lead">
            Celia Harrow killed Edmund in the library with the silver letter
            opener, then burned the account page that exposed her embezzlement.
          </p>

          <div className="score-card">
            <div>
              <small>Deduction score</small>
              <strong>920</strong>
              <span>/ 1,000</span>
            </div>
            <ul>
              <li><Check size={15} /> Culprit identified</li>
              <li><Check size={15} /> Method reconstructed</li>
              <li><Check size={15} /> Motive proven</li>
            </ul>
          </div>

          <div className="truth-timeline">
            <div>
              <span>10:12</span>
              <p>Celia confronts Edmund over the missing funds.</p>
            </div>
            <div>
              <span>10:17</span>
              <p>The watch shatters as Edmund falls beside the desk.</p>
            </div>
            <div>
              <span>10:21</span>
              <p>Celia crosses the wet conservatory and burns the ledger page.</p>
            </div>
          </div>

          <button className="primary-button" onClick={() => moveTo("menu")}>
            Return to manor <ArrowRight size={17} />
          </button>
        </section>
      )}

      {activeRoomData && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="evidence-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-title"
          >
            <button
              className="modal-close"
              onClick={() => setActiveRoom(null)}
              aria-label="Close evidence"
            >
              <X size={19} />
            </button>
            <div className="evidence-visual" aria-hidden="true">
              <div className="evidence-ring" />
              {(() => {
                const Icon = activeRoomData.icon;
                return <Icon size={58} strokeWidth={1.05} />;
              })()}
              <span>Evidence {String(caseRooms.findIndex((room) => room.id === activeRoom) + 1).padStart(2, "0")}</span>
            </div>
            <div className="evidence-copy">
              <p className="eyebrow">{activeRoomData.name}</p>
              <h3 id="evidence-title">{activeRoomData.clue}</h3>
              <p>{activeRoomData.description}</p>
              <div className="deduction-note">
                <Eye size={18} />
                <span>
                  <small>Investigator&apos;s observation</small>
                  {activeRoomData.note}
                </span>
              </div>
              <button
                className="primary-button"
                onClick={() => setActiveRoom(null)}
              >
                <Check size={17} /> Add to notebook
              </button>
            </div>
          </section>
        </div>
      )}

      {notebookOpen && (
        <div className="modal-backdrop align-right" role="presentation">
          <aside
            className="notebook-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="notebook-title"
          >
            <div className="notebook-header">
              <div>
                <p className="eyebrow">Automatic case record</p>
                <h3 id="notebook-title">Detective Notebook</h3>
              </div>
              <button
                className="modal-close"
                onClick={() => setNotebookOpen(false)}
                aria-label="Close notebook"
              >
                <X size={19} />
              </button>
            </div>
            <div className="notebook-tabs">
              <span className="active">Evidence</span>
              <span>Timeline</span>
              <span>Suspects</span>
            </div>
            <div className="notebook-entries">
              {caseRooms.map((room, index) => (
                <article className={clueProgress[index] ? "found" : ""} key={room.id}>
                  <div>{clueProgress[index] ? <Check size={15} /> : <LockKeyhole size={15} />}</div>
                  <span>
                    <small>{room.name}</small>
                    <strong>{clueProgress[index] ? room.clue : "Evidence not yet found"}</strong>
                    {clueProgress[index] && <p>{room.note}</p>}
                  </span>
                </article>
              ))}
            </div>
            <button
              className="primary-button notebook-accuse"
              onClick={() => {
                setNotebookOpen(false);
                setAccusationOpen(true);
              }}
              disabled={!canAccuse}
            >
              Build final accusation <ArrowRight size={17} />
            </button>
          </aside>
        </div>
      )}

      {accusationOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="accusation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="accusation-title"
          >
            <div className="accusation-heading">
              <div>
                <p className="eyebrow">Final accusation</p>
                <h3 id="accusation-title">Name the whole truth.</h3>
                <p>Each part of your theory must be supported by the evidence.</p>
              </div>
              <button
                className="modal-close"
                onClick={() => setAccusationOpen(false)}
                aria-label="Close accusation"
              >
                <X size={19} />
              </button>
            </div>

            <div className="accusation-content">
              <fieldset>
                <legend>Who is responsible?</legend>
                <div className="suspect-options">
                  {suspects.map((suspect) => (
                    <label
                      key={suspect.id}
                      className={selectedSuspect === suspect.id ? "selected" : ""}
                    >
                      <input
                        type="radio"
                        name="suspect"
                        value={suspect.id}
                        checked={selectedSuspect === suspect.id}
                        onChange={(event) => setSelectedSuspect(event.target.value)}
                      />
                      <span className="suspect-monogram">{suspect.monogram}</span>
                      <span>
                        <strong>{suspect.name}</strong>
                        <small>{suspect.role}</small>
                        <p>{suspect.detail}</p>
                      </span>
                      <i>{selectedSuspect === suspect.id && <Check size={14} />}</i>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="theory-selects">
                <label>
                  <span>Method</span>
                  <select
                    value={selectedMethod}
                    onChange={(event) => setSelectedMethod(event.target.value)}
                  >
                    <option value="">Choose the method</option>
                    {methods.map((method) => <option key={method}>{method}</option>)}
                  </select>
                </label>
                <label>
                  <span>Location</span>
                  <select
                    value={selectedLocation}
                    onChange={(event) => setSelectedLocation(event.target.value)}
                  >
                    <option value="">Choose the location</option>
                    {locations.map((location) => <option key={location}>{location}</option>)}
                  </select>
                </label>
                <label>
                  <span>Motive</span>
                  <select
                    value={selectedMotive}
                    onChange={(event) => setSelectedMotive(event.target.value)}
                  >
                    <option value="">Choose the motive</option>
                    {motives.map((motive) => <option key={motive}>{motive}</option>)}
                  </select>
                </label>
              </div>

              {wrongTheory && (
                <div className="theory-warning" role="alert">
                  <Eye size={17} />
                  The evidence contradicts this theory. Revisit the print, the
                  watch, and the burned ledger—no penalty in practice.
                </div>
              )}
            </div>

            <div className="accusation-footer">
              <button className="secondary-button" onClick={() => setAccusationOpen(false)}>
                Review evidence
              </button>
              <button
                className="primary-button"
                onClick={submitTheory}
                disabled={!accusationComplete}
              >
                Seal accusation <Feather size={17} />
              </button>
            </div>
          </section>
        </div>
      )}

      {settingsOpen && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-title"
          >
            <div className="settings-heading">
              <div>
                <p className="eyebrow">Your experience</p>
                <h3 id="settings-title">Accessibility & sound</h3>
              </div>
              <button
                className="modal-close"
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
              >
                <X size={19} />
              </button>
            </div>
            <div className="setting-list">
              <label>
                <span className="setting-icon"><Volume2 size={19} /></span>
                <span><strong>Interface sound</strong><small>Subtle original chimes and feedback</small></span>
                <input
                  type="checkbox"
                  checked={soundOn}
                  onChange={(event) => setSoundOn(event.target.checked)}
                />
              </label>
              <label>
                <span className="setting-icon"><Menu size={19} /></span>
                <span><strong>Large text</strong><small>Increase dialogue and interface size</small></span>
                <input
                  type="checkbox"
                  checked={largeText}
                  onChange={(event) => setLargeText(event.target.checked)}
                />
              </label>
              <label>
                <span className="setting-icon"><Sparkles size={19} /></span>
                <span><strong>Reduce motion</strong><small>Disable atmospheric and panel movement</small></span>
                <input
                  type="checkbox"
                  checked={reducedMotion}
                  onChange={(event) => setReducedMotion(event.target.checked)}
                />
              </label>
              <label>
                <span className="setting-icon"><Mic size={19} /></span>
                <span><strong>Voice captions</strong><small>Show speech as readable dialogue</small></span>
                <input
                  type="checkbox"
                  checked={captionsOn}
                  onChange={(event) => setCaptionsOn(event.target.checked)}
                />
              </label>
            </div>
            <button className="primary-button settings-done" onClick={() => setSettingsOpen(false)}>
              Save preferences <Check size={17} />
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
