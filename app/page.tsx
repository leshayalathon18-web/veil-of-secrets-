"use client";

import {
  Accessibility,
  ArrowRight,
  BookOpen,
  Captions,
  Check,
  CircleDot,
  Clock3,
  Dices,
  DoorOpen,
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
  Play,
  RotateCcw,
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
import type { DataConnection, Peer } from "peerjs";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

type Scene = "opening" | "rules" | "case" | "verdict" | "menu" | "lobby";
type TurnPhase = "roll" | "move" | "search" | "end";
type NotebookTab = "evidence" | "timeline" | "suspects";
type RoomId =
  | "observatory"
  | "attic"
  | "library"
  | "study"
  | "masterBedroom"
  | "ballroom"
  | "hall"
  | "guestSuite"
  | "dining"
  | "garden"
  | "conservatory"
  | "cellar"
  | "kitchen"
  | "basement"
  | "secretPassage";

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
    doorway: "p-3-4",
    doorSide: "bottom",
  },
  {
    id: "attic",
    name: "Attic",
    kicker: "A trunk opened in haste",
    description:
      "A travel trunk stands open beneath the rafters, its false bottom holding a duplicate account key.",
    clue: "Duplicate account key",
    note: "The key opens Celia's private document case and was hidden upstairs before dinner.",
    icon: KeyRound,
    area: "attic",
    neighbors: ["observatory", "library", "masterBedroom"],
    hue: "#5d5148",
    board: { column: 6, row: 1, width: 3, height: 3 },
    doorway: "p-7-4",
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
    board: { column: 10, row: 1, width: 4, height: 3 },
    doorway: "p-12-4",
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
    board: { column: 15, row: 1, width: 6, height: 3 },
    doorway: "p-17-4",
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
    board: { column: 6, row: 6, width: 3, height: 4 },
    doorway: "p-9-7",
    doorSide: "right",
  },
  {
    id: "masterBedroom",
    name: "Master Bedroom",
    kicker: "A wardrobe left breathing",
    description:
      "The wardrobe door is ajar. A white camellia petal is caught in a crimson evening cloak.",
    clue: "Cloak-bound camellia",
    note: "Celia changed her wrap after crossing the wet conservatory and hid the first one upstairs.",
    icon: LockKeyhole,
    area: "master-bedroom",
    neighbors: ["attic", "hall", "dining"],
    hue: "#6d3444",
    board: { column: 1, row: 6, width: 4, height: 4 },
    doorway: "p-5-7",
    doorSide: "right",
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
    board: { column: 10, row: 6, width: 4, height: 4 },
    doorway: "p-14-7",
    doorSide: "right",
  },
  {
    id: "guestSuite",
    name: "Guest Suite",
    kicker: "A witness behind a locked door",
    description:
      "A tea tray is untouched, but the speaking tube carries a conversation from the library corridor.",
    clue: "Speaking-tube testimony",
    note: "A guest heard Celia tell Edmund, 'The accounts end tonight,' shortly before 10:17.",
    icon: Headphones,
    area: "guest-suite",
    neighbors: ["study", "hall", "garden"],
    hue: "#4a5f72",
    board: { column: 15, row: 6, width: 6, height: 4 },
    doorway: "p-14-7",
    doorSide: "left",
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
    board: { column: 1, row: 11, width: 4, height: 4 },
    doorway: "p-5-12",
    doorSide: "right",
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
    board: { column: 10, row: 11, width: 4, height: 4 },
    doorway: "p-14-12",
    doorSide: "right",
  },
  {
    id: "garden",
    name: "Moon Garden",
    kicker: "Footprints that stop at stone",
    description:
      "A wet trail circles the reflecting pool, then ends where a hidden service stair enters the manor.",
    clue: "Interrupted garden trail",
    note: "The trail proves the rain route was staged; no one crossed the outer gate after the murder.",
    icon: Sparkles,
    area: "garden",
    neighbors: ["guestSuite", "conservatory", "secretPassage"],
    hue: "#2f654c",
    board: { column: 15, row: 11, width: 6, height: 4 },
    doorway: "p-14-12",
    doorSide: "left",
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
    board: { column: 1, row: 16, width: 4, height: 3 },
    doorway: "p-3-15",
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
    board: { column: 6, row: 11, width: 3, height: 4 },
    doorway: "p-9-12",
    doorSide: "right",
  },
  {
    id: "basement",
    name: "Basement",
    kicker: "The boiler masks a second clock",
    description:
      "Soot on the boiler dial preserves a clean handprint at exactly 10:20.",
    clue: "Sootless boiler dial",
    note: "The basement clock was adjusted three minutes late to support Celia's false timeline.",
    icon: Flame,
    area: "basement",
    neighbors: ["cellar", "kitchen", "secretPassage"],
    hue: "#563b32",
    board: { column: 6, row: 16, width: 3, height: 3 },
    doorway: "p-7-15",
    doorSide: "top",
  },
  {
    id: "secretPassage",
    name: "Secret Passage",
    kicker: "Velvet caught behind the wall",
    description:
      "A crimson thread hangs from the concealed latch linking the garden stair to the library wing.",
    clue: "Crimson latch thread",
    note: "Celia used the passage to return the cleaned letter opener without crossing the crowded hall.",
    icon: DoorOpen,
    area: "secret-passage",
    neighbors: ["basement", "garden", "library"],
    hue: "#41364e",
    board: { column: 10, row: 16, width: 4, height: 3 },
    doorway: "p-12-15",
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
  attic: [
    {
      kicker: "A trunk opened in haste",
      description:
        "A travel trunk stands open beneath the rafters, its false bottom holding a duplicate account key.",
      clue: "Duplicate account key",
      note: "The key opens Celia's private document case and was hidden upstairs before dinner.",
    },
    {
      kicker: "Dust broken by one visitor",
      description:
        "Only one narrow shoe trail crosses the attic dust, ending at a locked solicitor's trunk.",
      clue: "Attic dust trail",
      note: "The size-seven trail matches Celia's evening shoes and disproves her claim that she never went upstairs.",
    },
    {
      kicker: "A ribbon tucked in cedar",
      description:
        "Gold document ribbon is pinched beneath the cedar chest that held the estate's duplicate account keys.",
      clue: "Hidden document ribbon",
      note: "The ribbon matches the packet Edmund opened in the library before confronting Celia.",
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
  masterBedroom: [
    {
      kicker: "A wardrobe left breathing",
      description:
        "The wardrobe door is ajar. A white camellia petal is caught in a crimson evening cloak.",
      clue: "Cloak-bound camellia",
      note: "Celia changed her wrap after crossing the wet conservatory and hid the first one upstairs.",
    },
    {
      kicker: "Rain beneath dry velvet",
      description:
        "The hem of a crimson wrap is wet inside the wardrobe while every other garment is dry.",
      clue: "Hidden wet wrap",
      note: "The wrap carries glasshouse grit from Celia's staged route through the conservatory.",
    },
    {
      kicker: "A missing pair returns",
      description:
        "Size-seven evening shoes sit behind the wardrobe with fresh marble dust packed into one heel.",
      clue: "Recovered evening shoes",
      note: "The shoes match the Grand Hall impression and were hidden after Celia returned from the library wing.",
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
  guestSuite: [
    {
      kicker: "A witness behind a locked door",
      description:
        "A tea tray is untouched, but the speaking tube carries a conversation from the library corridor.",
      clue: "Speaking-tube testimony",
      note: "A guest heard Celia tell Edmund, 'The accounts end tonight,' shortly before 10:17.",
    },
    {
      kicker: "A bell pull at quarter past",
      description:
        "The guest bell register shows a pull at 10:16 and a servant's note reporting raised voices next door.",
      clue: "Guest bell register",
      note: "The timing places Celia in the library wing one minute before Edmund's watch stopped.",
    },
    {
      kicker: "A message never delivered",
      description:
        "An unsigned note beneath the guest tray warns Edmund not to meet his solicitor alone.",
      clue: "Undelivered warning",
      note: "The paper came from Celia's monogrammed writing set, though the monogram was cut away.",
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
  garden: [
    {
      kicker: "Footprints that stop at stone",
      description:
        "A wet trail circles the reflecting pool, then ends where a hidden service stair enters the manor.",
      clue: "Interrupted garden trail",
      note: "The trail proves the rain route was staged; no one crossed the outer gate after the murder.",
    },
    {
      kicker: "A gate sealed by rust",
      description:
        "Rust bridges the garden gate latch without a break, despite Celia's story of an escaping intruder.",
      clue: "Unopened garden gate",
      note: "The supposed outsider never left the grounds because the gate had not moved all evening.",
    },
    {
      kicker: "Moonlight finds the wrong mud",
      description:
        "The wet prints beside the pool contain conservatory grit rather than soil from the garden beds.",
      clue: "Glasshouse garden prints",
      note: "The trail was planted with indoor potting mix to make Celia's passage look like an escape route.",
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
  basement: [
    {
      kicker: "The boiler masks a second clock",
      description:
        "Soot on the boiler dial preserves a clean handprint at exactly 10:20.",
      clue: "Sootless boiler dial",
      note: "The basement clock was adjusted three minutes late to support Celia's false timeline.",
    },
    {
      kicker: "Three minutes stolen below",
      description:
        "Fresh tool marks score the regulator screw of the basement clock while the hall clocks agree.",
      clue: "Altered clock regulator",
      note: "Someone shifted the basement clock after 10:17 to make Edmund appear alive later.",
    },
    {
      kicker: "Coal dust on white gloves",
      description:
        "A white evening glove lies behind the boiler, its fingertips marked with soot and silver rouge.",
      clue: "Soot-marked glove",
      note: "The glove links Celia's clock tampering to the polished library weapon.",
    },
  ],
  secretPassage: [
    {
      kicker: "Velvet caught behind the wall",
      description:
        "A crimson thread hangs from the concealed latch linking the garden stair to the library wing.",
      clue: "Crimson latch thread",
      note: "Celia used the passage to return the cleaned letter opener without crossing the crowded hall.",
    },
    {
      kicker: "A wall panel recently oiled",
      description:
        "The hidden hinge shines with fresh oil, and one white camellia petal rests inside the narrow track.",
      clue: "Oiled passage hinge",
      note: "The passage was prepared before dinner and used by someone wearing Celia's camellia.",
    },
    {
      kicker: "Echoes measure the return",
      description:
        "A servant's phonograph test captured the hidden panel closing at 10:22 beneath the final ballroom waltz.",
      clue: "Recorded panel echo",
      note: "The timing gives Celia five minutes to clean the opener and return it through the passage.",
    },
  ],
};

type Suspect = {
  id: string;
  name: string;
  role: string;
  detail: string;
  monogram: string;
};

type CaseFile = {
  title: string;
  subtitle: string;
  victim: string;
  suspects: Suspect[];
  methods: string[];
  locations: string[];
  motives: string[];
  solution: {
    suspect: string;
    method: string;
    location: string;
    motive: string;
  };
  reveal: string;
  timeline: Array<{ time: string; text: string }>;
  evidence: Partial<Record<RoomId, EvidenceVariant>>;
};

const suspectPool = {
  celia: {
    id: "celia", name: "Celia Harrow", role: "Estate solicitor", monogram: "CH",
    detail: "Controlled the manor accounts and wore a white camellia.",
  },
  elias: {
    id: "elias", name: "Elias Voss", role: "Head groundskeeper", monogram: "EV",
    detail: "Knew every garden lock and cultivated Blackthorn's rare plants.",
  },
  mirelle: {
    id: "mirelle", name: "Mirelle Ash", role: "Concert pianist", monogram: "MA",
    detail: "Guarded the authorship of her celebrated midnight waltz.",
  },
  lucien: {
    id: "lucien", name: "Dr. Lucien Grey", role: "Family physician", monogram: "LG",
    detail: "Kept private medical reports for every member of the household.",
  },
  beatrice: {
    id: "beatrice", name: "Lady Beatrice Thorn", role: "Disputed heiress", monogram: "BT",
    detail: "Expected to inherit Blackthorn until a new codicil appeared.",
  },
  sebastian: {
    id: "sebastian", name: "Sebastian Crow", role: "Senior valet", monogram: "SC",
    detail: "Carried keys to the guest rooms and knew every servant passage.",
  },
  agatha: {
    id: "agatha", name: "Agatha Morel", role: "Visiting botanist", monogram: "AM",
    detail: "Claimed the conservatory's rare camellia hybrid as her own discovery.",
  },
  conrad: {
    id: "conrad", name: "Conrad Vale", role: "Private financier", monogram: "CV",
    detail: "Sold bonds backed by Blackthorn's celebrated wine collection.",
  },
  isolde: {
    id: "isolde", name: "Isolde March", role: "Salon medium", monogram: "IM",
    detail: "Built a fashionable reputation on private séances at the manor.",
  },
  silas: {
    id: "silas", name: "Reverend Silas Flint", role: "Estate chaplain", monogram: "SF",
    detail: "Managed the Blackthorn charitable trust without outside review.",
  },
} satisfies Record<string, Suspect>;

const caseFiles: CaseFile[] = [
  {
    title: "The Ashes in the Library",
    subtitle: "A burned ledger, a silent blade, and a lie told before midnight.",
    victim: "Edmund Blackthorn",
    suspects: [suspectPool.celia, suspectPool.elias, suspectPool.mirelle],
    methods: ["Silver letter opener", "Poisoned cordial", "Falling marble bust"],
    locations: ["The Library", "The Conservatory", "The Study"],
    motives: [
      "To conceal the stolen estate funds",
      "To inherit Blackthorn Manor",
      "To stop a private engagement",
    ],
    solution: {
      suspect: "celia",
      method: "Silver letter opener",
      location: "The Library",
      motive: "To conceal the stolen estate funds",
    },
    reveal:
      "Celia Harrow killed Edmund Blackthorn in the Library with the silver letter opener, then burned the account page that exposed her embezzlement.",
    timeline: [
      { time: "10:12", text: "Celia confronts Edmund over the missing funds." },
      { time: "10:17", text: "Edmund's watch shatters beside the library desk." },
      { time: "10:21", text: "Celia cleans the opener and burns the ledger page." },
    ],
    evidence: {},
  },
  {
    title: "The Silent Waltz",
    subtitle: "A final chord, a falling light, and a melody stolen before its debut.",
    victim: "Viola Sterling",
    suspects: [suspectPool.mirelle, suspectPool.sebastian, suspectPool.beatrice],
    methods: ["Loosened chandelier counterweight", "Poisoned champagne", "Piano-wire snare"],
    locations: ["The Ballroom", "The Attic", "The Grand Hall"],
    motives: [
      "To conceal the waltz's true composer",
      "To recover a family jewel",
      "To prevent a broken engagement",
    ],
    solution: {
      suspect: "mirelle",
      method: "Loosened chandelier counterweight",
      location: "The Ballroom",
      motive: "To conceal the waltz's true composer",
    },
    reveal:
      "Mirelle Ash loosened the Ballroom chandelier counterweight before the concert, silencing Viola before she could prove the famous waltz was hers.",
    timeline: [
      { time: "9:48", text: "Viola places her original score in the Attic trunk." },
      { time: "10:06", text: "Mirelle cuts the chandelier retaining cord." },
      { time: "10:19", text: "The final chord releases the altered counterweight." },
    ],
    evidence: {
      ballroom: {
        kicker: "A counterweight cut twice",
        description: "The chandelier rope shows a clean musician's blade cut hidden beneath a decorative fray.",
        clue: "Altered chandelier cord",
        note: "The cut was prepared before the concert and released by the final stage cue.",
      },
      attic: {
        kicker: "The first waltz in another hand",
        description: "Viola's dated manuscript matches Mirelle's celebrated melody note for note.",
        clue: "Original waltz manuscript",
        note: "The score proves Viola—not Mirelle—composed the work that made Mirelle famous.",
      },
      guestSuite: {
        kicker: "A rehearsal heard through brass",
        description: "A guest heard Mirelle threaten Viola through the speaking tube before the doors opened.",
        clue: "Overheard rehearsal threat",
        note: "Mirelle knew Viola planned to reveal the manuscript after the final waltz.",
      },
      study: {
        kicker: "Royalties paid to one name",
        description: "A publishing contract routes every payment to Mirelle despite Viola's corrections in the margin.",
        clue: "Disputed royalty contract",
        note: "Public exposure would have ended Mirelle's career and fortune.",
      },
      hall: {
        kicker: "Rosin where no violin played",
        description: "Fresh bow rosin marks the service stair leading from Mirelle's dressing room.",
        clue: "Rosin stair trace",
        note: "The trace maps Mirelle's unseen route to the chandelier winch.",
      },
    },
  },
  {
    title: "The Moon Garden Alibi",
    subtitle: "Rare flowers, a locked gate, and an antidote hidden beneath the soil.",
    victim: "Dr. Alistair Fenn",
    suspects: [suspectPool.elias, suspectPool.agatha, suspectPool.lucien],
    methods: ["Foxglove tincture", "Contaminated garden needle", "Crushed glass powder"],
    locations: ["The Conservatory", "The Moon Garden", "The Kitchen"],
    motives: [
      "To protect a rare-plant smuggling route",
      "To claim a botanical discovery",
      "To suppress a medical scandal",
    ],
    solution: {
      suspect: "elias",
      method: "Foxglove tincture",
      location: "The Conservatory",
      motive: "To protect a rare-plant smuggling route",
    },
    reveal:
      "Elias Voss slipped concentrated foxglove into Dr. Fenn's conservatory tonic to stop him exposing the rare plants moving through Blackthorn's cellar.",
    timeline: [
      { time: "9:55", text: "Fenn photographs the hidden export labels." },
      { time: "10:11", text: "Elias replaces the harmless tonic bottle." },
      { time: "10:26", text: "Fenn collapses beside the locked conservatory door." },
    ],
    evidence: {
      conservatory: {
        kicker: "Foxglove missing from one bed",
        description: "Three fresh stems are cut from the locked medicinal plot and their sap remains wet.",
        clue: "Fresh foxglove cuts",
        note: "Only Elias carried the groundskeeper's key to the medicinal bed.",
      },
      garden: {
        kicker: "A gate that never opened",
        description: "Unbroken rust bridges the outer latch despite Elias's claim that a courier escaped through it.",
        clue: "Sealed garden gate",
        note: "The courier story was an alibi; the poisoner remained inside Blackthorn.",
      },
      cellar: {
        kicker: "Orchids beneath false labels",
        description: "Export crates marked table linen contain protected orchids packed by the estate garden staff.",
        clue: "Smuggled orchid crates",
        note: "Dr. Fenn had discovered the operation Elias was protecting.",
      },
      kitchen: {
        kicker: "A tincture bottle rinsed once",
        description: "The washbasin carries a bitter green ring matching concentrated foxglove.",
        clue: "Rinsed tincture bottle",
        note: "The bottle was cleaned moments after Fenn's evening tonic was prepared.",
      },
      guestSuite: {
        kicker: "A manifest copied by moonlight",
        description: "Fenn's pocket notebook lists the cellar crates and Elias's private shipping mark.",
        clue: "Secret export manifest",
        note: "The manifest supplied Elias with a direct motive to silence him.",
      },
    },
  },
  {
    title: "The Testament Behind the Wall",
    subtitle: "A rewritten inheritance, a sleeping draught, and a secret passage left open.",
    victim: "Marcus Thorne",
    suspects: [suspectPool.beatrice, suspectPool.celia, suspectPool.sebastian],
    methods: ["Laudanum overdose", "Smothered fireplace draft", "Tampered bed warmer"],
    locations: ["The Master Bedroom", "The Secret Passage", "The Guest Suite"],
    motives: [
      "To restore a lost inheritance",
      "To conceal an illicit marriage",
      "To recover a compromising letter",
    ],
    solution: {
      suspect: "beatrice",
      method: "Laudanum overdose",
      location: "The Master Bedroom",
      motive: "To restore a lost inheritance",
    },
    reveal:
      "Lady Beatrice Thorn doubled Marcus's sleeping draught in the Master Bedroom, then hid the new codicil inside the Secret Passage.",
    timeline: [
      { time: "10:02", text: "Marcus signs a codicil removing Beatrice from the will." },
      { time: "10:14", text: "Beatrice enters with the nightly medicine tray." },
      { time: "10:23", text: "She hides the codicil behind the passage panel." },
    ],
    evidence: {
      masterBedroom: {
        kicker: "Two measures in one glass",
        description: "The medicine glass holds twice the prescribed laudanum and a trace of Beatrice's violet powder.",
        clue: "Doubled sleeping draught",
        note: "Beatrice delivered the tray and handled the glass after the valet left.",
      },
      secretPassage: {
        kicker: "A will folded behind velvet",
        description: "The new codicil is wedged behind the panel in a glove carrying violet face powder.",
        clue: "Hidden inheritance codicil",
        note: "The document removed Beatrice from the estate hours before Marcus died.",
      },
      library: {
        kicker: "An older will left open",
        description: "The former testament names Beatrice sole heir and bears her fresh fingerprints.",
        clue: "Superseded testament",
        note: "Beatrice knew exactly what the new codicil would cost her.",
      },
      dining: {
        kicker: "No drug in the dinner wine",
        description: "Every decanter tests clean, disproving the story that Marcus dosed himself at dinner.",
        clue: "Clean dinner decanters",
        note: "The fatal dose came later, with the private bedroom medicine.",
      },
      study: {
        kicker: "A signature witnessed at ten",
        description: "The signing register records Marcus alert and steady minutes before his bedtime draught.",
        clue: "Codicil witness register",
        note: "Marcus was not confused or accidentally overmedicated when the will changed.",
      },
    },
  },
  {
    title: "The Last Light",
    subtitle: "A telescope brake, a false diagnosis, and one final exposure in the storm.",
    victim: "Rose Harcourt",
    suspects: [suspectPool.lucien, suspectPool.celia, suspectPool.conrad],
    methods: ["Sabotaged telescope brake", "Cut balcony rail", "Drugged photographic plate"],
    locations: ["The Observatory", "The Attic", "The Study"],
    motives: [
      "To conceal a falsified medical report",
      "To destroy a damaging photograph",
      "To protect a secret investment",
    ],
    solution: {
      suspect: "lucien",
      method: "Sabotaged telescope brake",
      location: "The Observatory",
      motive: "To conceal a falsified medical report",
    },
    reveal:
      "Dr. Lucien Grey filed through the Observatory brake so the heavy telescope would swing when Rose opened the dome, destroying the witness who held his falsified report.",
    timeline: [
      { time: "9:42", text: "Rose copies Lucien's altered medical report." },
      { time: "10:08", text: "Lucien oils and files the telescope brake." },
      { time: "10:31", text: "Rose opens the dome and the assembly swings free." },
    ],
    evidence: {
      observatory: {
        kicker: "A brake filed smooth",
        description: "The brass brake tooth has fresh parallel file marks beneath a smear of medical oil.",
        clue: "Sabotaged telescope brake",
        note: "The failure was prepared deliberately and timed to the opening of the dome.",
      },
      basement: {
        kicker: "Instrument oil beside the boiler",
        description: "Lucien's monogrammed medical oil bottle is hidden behind the basement tool rack.",
        clue: "Monogrammed instrument oil",
        note: "The same oil coats the sabotaged observatory brake.",
      },
      study: {
        kicker: "A diagnosis written twice",
        description: "Rose's copy records a healthy patient while Lucien's filed report invents a fatal condition.",
        clue: "Conflicting medical reports",
        note: "Rose planned to expose the fraud at breakfast.",
      },
      attic: {
        kicker: "A physician's file in the tool roll",
        description: "A fine metal file carries brass dust matching the telescope mechanism.",
        clue: "Brass-dusted hand file",
        note: "The file came from Lucien's travelling surgical case.",
      },
      hall: {
        kicker: "One clean heel in roof dust",
        description: "A narrow medical boot print leads from the east stair to the Observatory service door.",
        clue: "Roof-dust boot print",
        note: "The tread matches Lucien's storm boots, not the household staff.",
      },
    },
  },
  {
    title: "The Clockwork Guest",
    subtitle: "A blackmail letter, a woundless clock, and the valet who knew every key.",
    victim: "Julian Mercer",
    suspects: [suspectPool.sebastian, suspectPool.conrad, suspectPool.isolde],
    methods: ["Spring-fired mantel dart", "Poisoned shaving soap", "Locked-room gas valve"],
    locations: ["The Guest Suite", "The Basement", "The Study"],
    motives: [
      "To end a blackmail scheme",
      "To steal a bearer bond",
      "To conceal a false identity",
    ],
    solution: {
      suspect: "sebastian",
      method: "Spring-fired mantel dart",
      location: "The Guest Suite",
      motive: "To end a blackmail scheme",
    },
    reveal:
      "Sebastian Crow rebuilt the Guest Suite mantel clock to fire a tiny dart when Julian wound it, ending the blackmail that had trapped him for years.",
    timeline: [
      { time: "9:50", text: "Julian demands a final payment from Sebastian." },
      { time: "10:18", text: "Sebastian replaces the clock's winding pin." },
      { time: "10:30", text: "Julian winds the clock and releases the hidden spring." },
    ],
    evidence: {
      guestSuite: {
        kicker: "A clock with two springs",
        description: "The mantel clock contains a second spring aligned with a hollow winding pin.",
        clue: "Altered mantel clock",
        note: "The device could be armed only by someone with private access to the guest room.",
      },
      basement: {
        kicker: "A spring cut at the workbench",
        description: "Fine steel filings and a clipped clock spring remain beneath the servants' repair vise.",
        clue: "Clock-spring filings",
        note: "Sebastian signed out the basement workbench that afternoon.",
      },
      study: {
        kicker: "Payments in a servant's name",
        description: "Julian's letter book records six blackmail payments from S. Crow.",
        clue: "Blackmail payment ledger",
        note: "The entries establish Sebastian's long-running motive.",
      },
      hall: {
        kicker: "A master key copied in wax",
        description: "A wax impression of the Guest Suite key is hidden inside Sebastian's key wallet.",
        clue: "Guest-key impression",
        note: "The duplicate let Sebastian enter without disturbing the door register.",
      },
      kitchen: {
        kicker: "Soot on a silver pin",
        description: "A hollow steel pin washed in the scullery carries the same soot as the altered clock.",
        clue: "Washed winding pin",
        note: "The pin was cleaned after Sebastian tested the mechanism.",
      },
    },
  },
  {
    title: "The Camellia Poison",
    subtitle: "A stolen hybrid, a porcelain cup, and petals that changed color overnight.",
    victim: "Clara Whitlock",
    suspects: [suspectPool.agatha, suspectPool.elias, suspectPool.mirelle],
    methods: ["Poisoned camellia tea", "Toxic face powder", "Contaminated sugar tongs"],
    locations: ["The Conservatory", "The Kitchen", "The Dining Hall"],
    motives: [
      "To claim a stolen botanical discovery",
      "To protect the estate gardens",
      "To silence a society critic",
    ],
    solution: {
      suspect: "agatha",
      method: "Poisoned camellia tea",
      location: "The Conservatory",
      motive: "To claim a stolen botanical discovery",
    },
    reveal:
      "Agatha Morel steeped a toxic look-alike with Clara's private camellia tea, ensuring the rival botanist could never prove who created the celebrated hybrid.",
    timeline: [
      { time: "9:35", text: "Clara announces she will present her breeding journal." },
      { time: "10:05", text: "Agatha switches the labelled tea caddy." },
      { time: "10:24", text: "Clara drinks alone beside the conservatory specimens." },
    ],
    evidence: {
      conservatory: {
        kicker: "Two flowers under one label",
        description: "The tea caddy contains a toxic cousin of Clara's harmless white camellia.",
        clue: "Switched camellia caddy",
        note: "A trained botanist selected the look-alike deliberately.",
      },
      garden: {
        kicker: "Green dye on one glove",
        description: "Agatha's discarded glove carries the nursery dye used to relabel the toxic plant.",
        clue: "Nursery-dyed glove",
        note: "The dye matches the altered conservatory plant marker.",
      },
      kitchen: {
        kicker: "One cup rinsed with spirits",
        description: "Clara's porcelain cup smells of botanical spirits despite being washed before discovery.",
        clue: "Rinsed tea cup",
        note: "Agatha asked the scullery maid for spirits immediately after tea.",
      },
      library: {
        kicker: "A breeding journal copied badly",
        description: "Agatha's lecture notes reproduce Clara's private hybrid diagrams with dates altered.",
        clue: "Copied breeding diagrams",
        note: "Clara could prove Agatha had stolen the discovery.",
      },
      dining: {
        kicker: "The shared sugar is clean",
        description: "Every guest used the same sugar bowl without illness.",
        clue: "Uncontaminated sugar bowl",
        note: "The poison was in Clara's private tea, not the communal service.",
      },
    },
  },
  {
    title: "The Cellar Ledger",
    subtitle: "Counterfeit bonds, a sealed vent, and a vintage that never existed.",
    victim: "Bernard Pike",
    suspects: [suspectPool.conrad, suspectPool.celia, suspectPool.elias],
    methods: ["Blocked cellar vent", "Adulterated tasting glass", "Falling cask brace"],
    locations: ["The Wine Cellar", "The Basement", "The Dining Hall"],
    motives: [
      "To conceal counterfeit wine bonds",
      "To seize the estate collection",
      "To hide an illegal export",
    ],
    solution: {
      suspect: "conrad",
      method: "Blocked cellar vent",
      location: "The Wine Cellar",
      motive: "To conceal counterfeit wine bonds",
    },
    reveal:
      "Conrad Vale blocked the Wine Cellar vent and redirected boiler exhaust during Bernard's inventory, preventing him from revealing that the valuable bond-backed vintages never existed.",
    timeline: [
      { time: "9:58", text: "Bernard marks twelve bond vintages as missing." },
      { time: "10:13", text: "Conrad closes the cellar vent from the passage." },
      { time: "10:27", text: "The boiler cycle fills the sealed inventory room." },
    ],
    evidence: {
      cellar: {
        kicker: "A vent sealed from outside",
        description: "The cellar grille is packed with fresh velvet and held by a financier's brass tie pin.",
        clue: "Blocked cellar vent",
        note: "The obstruction was placed from the passage side before Bernard began counting.",
      },
      study: {
        kicker: "Bonds for absent bottles",
        description: "Conrad sold certificates for twelve vintages not listed in any Blackthorn inventory.",
        clue: "Counterfeit wine bonds",
        note: "Bernard's audit would have exposed the fraud the next morning.",
      },
      basement: {
        kicker: "A boiler damper turned by hand",
        description: "The exhaust damper carries fresh brass polish from Conrad's distinctive tie pin.",
        clue: "Redirected boiler damper",
        note: "The change sent fumes toward the sealed cellar rather than the chimney.",
      },
      dining: {
        kicker: "Labels printed this week",
        description: "The celebrated tasting bottles use ink that was delivered only three days ago.",
        clue: "Fresh counterfeit labels",
        note: "The false bottles supported Conrad's fictitious bond vintages.",
      },
      secretPassage: {
        kicker: "A financier's route in chalk",
        description: "A chalk mark matching Conrad's ledger notation points from the Study to the cellar vent.",
        clue: "Chalked passage route",
        note: "The passage let Conrad alter the vent unseen.",
      },
    },
  },
  {
    title: "A Séance Without Spirits",
    subtitle: "A hidden battery, a darkened room, and a ghost who knew too much.",
    victim: "Evelyn Cross",
    suspects: [suspectPool.isolde, suspectPool.lucien, suspectPool.sebastian],
    methods: ["Electrified séance table", "Drugged incense", "Weighted spirit cabinet"],
    locations: ["The Study", "The Ballroom", "The Basement"],
    motives: [
      "To conceal fraudulent séances",
      "To suppress a medical diagnosis",
      "To recover stolen servant keys",
    ],
    solution: {
      suspect: "isolde",
      method: "Electrified séance table",
      location: "The Study",
      motive: "To conceal fraudulent séances",
    },
    reveal:
      "Isolde March wired the Study séance table to a concealed battery, turning one of her harmless stage effects deadly when Evelyn threatened to demonstrate the fraud.",
    timeline: [
      { time: "9:44", text: "Evelyn finds the wires beneath the séance cloth." },
      { time: "10:09", text: "Isolde exchanges the stage battery for a stronger cell." },
      { time: "10:33", text: "The lights dim and Evelyn touches the brass table ring." },
    ],
    evidence: {
      study: {
        kicker: "A brass ring wired below",
        description: "Copper wire runs from the séance table ring through a newly drilled floor hole.",
        clue: "Wired séance table",
        note: "The table was altered after Evelyn announced she would expose the trick.",
      },
      basement: {
        kicker: "The strong battery is missing",
        description: "Isolde's stage case holds a weak demonstration cell where a high-voltage battery should be.",
        clue: "Exchanged stage battery",
        note: "The stronger cell fits the fresh clamp marks beneath the Study.",
      },
      ballroom: {
        kicker: "Ghost silk and copper wire",
        description: "Isolde's performance trunk contains identical wire among her levitation equipment.",
        clue: "Matching illusion wire",
        note: "The materials tie the deadly alteration to Isolde's stage apparatus.",
      },
      guestSuite: {
        kicker: "A confession interrupted",
        description: "Evelyn's letter says she will reveal how Isolde learned guests' secrets through speaking tubes.",
        clue: "Fraud exposé letter",
        note: "The letter gives Isolde a direct reason to stop the demonstration.",
      },
      attic: {
        kicker: "A burned rehearsal diagram",
        description: "A charred sketch shows the table circuit and Isolde's handwritten timing cues.",
        clue: "Burned circuit sketch",
        note: "The diagram proves the current was planned, not accidental.",
      },
    },
  },
  {
    title: "The Bell at Dawn",
    subtitle: "A charitable trust, a cut rope, and the sound that covered a fall.",
    victim: "Arthur Vale",
    suspects: [suspectPool.silas, suspectPool.beatrice, suspectPool.conrad],
    methods: ["Released bell counterweight", "Cut staircase runner", "Tampered balcony latch"],
    locations: ["The Grand Hall", "The Attic", "The Library"],
    motives: [
      "To conceal charity embezzlement",
      "To protect an inheritance claim",
      "To erase a private debt",
    ],
    solution: {
      suspect: "silas",
      method: "Released bell counterweight",
      location: "The Grand Hall",
      motive: "To conceal charity embezzlement",
    },
    reveal:
      "Reverend Silas Flint cut the Attic bell restraint so its counterweight would fall through the Grand Hall at dawn, silencing Arthur before he could expose the missing charity funds.",
    timeline: [
      { time: "5:31", text: "Arthur hides a copy of the trust ledger in the Library." },
      { time: "5:46", text: "Silas cuts the counterweight restraint in the Attic." },
      { time: "6:00", text: "The dawn bell releases the weight above the Grand Hall." },
    ],
    evidence: {
      hall: {
        kicker: "A counterweight fell before the bell",
        description: "The Grand Hall floor bears a fresh iron strike directly beneath the bell shaft.",
        clue: "Released bell counterweight",
        note: "The mechanism was altered to fall when the dawn bell began.",
      },
      attic: {
        kicker: "A rope cut with a ceremonial blade",
        description: "The restraint fibers carry beeswax from the chaplain's vestment knife.",
        clue: "Waxed cut rope",
        note: "Silas alone used that wax on the morning service equipment.",
      },
      library: {
        kicker: "Donations that never reached the poor",
        description: "Arthur's copied ledger shows five trust withdrawals signed S. Flint.",
        clue: "Missing charity ledger",
        note: "Arthur planned to present the accounts to the trustees after breakfast.",
      },
      study: {
        kicker: "A seal pressed in reverse",
        description: "False approval letters use a reversed impression of the estate charity seal.",
        clue: "Forged charity approvals",
        note: "The reversed seal came from Silas's private travelling press.",
      },
      garden: {
        kicker: "Chapel mud before sunrise",
        description: "Pale chapel-path clay marks the service stair from Silas's rooms to the Attic.",
        clue: "Dawn chapel footprints",
        note: "The prints place Silas at the bell mechanism before dawn.",
      },
    },
  },
  {
    title: "The Crimson Masquerade",
    subtitle: "A borrowed mask, a vanished key, and a toast delivered to the wrong guest.",
    victim: "Helena Ward",
    suspects: [suspectPool.celia, suspectPool.mirelle, suspectPool.isolde],
    methods: ["Poisoned mask perfume", "Tampered champagne coupe", "Rigged balcony screen"],
    locations: ["The Ballroom", "The Guest Suite", "The Moon Garden"],
    motives: [
      "To conceal a secret engagement contract",
      "To steal a patron's fortune",
      "To protect a false spiritual prophecy",
    ],
    solution: {
      suspect: "celia",
      method: "Poisoned mask perfume",
      location: "The Ballroom",
      motive: "To conceal a secret engagement contract",
    },
    reveal:
      "Celia Harrow painted poison into Helena's masquerade mask after learning Helena held the contract that proved Celia had secretly promised the estate to two different heirs.",
    timeline: [
      { time: "11:04", text: "Helena locks the engagement contract in the Guest Suite." },
      { time: "11:18", text: "Celia switches two masks beside the Ballroom cloakroom." },
      { time: "11:32", text: "Helena puts on the perfumed mask for the final dance." },
    ],
    evidence: {
      ballroom: {
        kicker: "Perfume beneath crimson paint",
        description: "The mask lining carries bitter almond oil under a fresh coat of theatrical perfume.",
        clue: "Poisoned masquerade mask",
        note: "The poison was designed for Helena's mask and activated by the warmth of her face.",
      },
      guestSuite: {
        kicker: "A contract hidden in a hatbox",
        description: "Helena's signed contract names Celia as broker to two competing inheritance promises.",
        clue: "Double engagement contract",
        note: "Publication would have destroyed Celia's legal career.",
      },
      conservatory: {
        kicker: "A perfume vial among camellias",
        description: "Celia's empty perfume vial contains the same almond residue as the mask.",
        clue: "Discarded perfume vial",
        note: "The vial was hidden minutes after the masks were switched.",
      },
      hall: {
        kicker: "Two masks, one numbered twice",
        description: "The cloakroom ledger records Celia correcting Helena's mask number in her own hand.",
        clue: "Altered mask register",
        note: "The correction let Celia target the correct mask without entering the Ballroom.",
      },
      garden: {
        kicker: "A key thrown short of the pond",
        description: "The Guest Suite key lies in wet grass with Celia's gold glove fiber caught in its bow.",
        clue: "Discarded guest key",
        note: "Celia used the key to find the contract before preparing the mask.",
      },
    },
  },
];

const detectiveRoster = [
  {
    id: "you", name: "Avery Vane", title: "The Lantern", initials: "AV", color: "#e3c878",
    portraitIndex: 0, talent: "Revisit one searched room", bio: "A society investigator who notices what polished manners are designed to hide.",
  },
  {
    id: "iris", name: "Iris Bell", title: "The Listener", initials: "IB", color: "#75b8c8",
    portraitIndex: 9, talent: "Hear a nearby clue", bio: "A wilderness tracker who reads silence, footprints, and changes in the weather.",
  },
  {
    id: "theo", name: "Theo Wren", title: "The Archivist", initials: "TW", color: "#a98bd4",
    portraitIndex: 1, talent: "Decode sealed records", bio: "Blackthorn's former archivist, carrying a memory sharper than any index.",
  },
  {
    id: "nell", name: "Nell Fox", title: "The Skeptic", initials: "NF", color: "#d16d78",
    portraitIndex: 2, talent: "Challenge a statement", bio: "A relentless columnist who treats every confident answer as a fresh question.",
  },
  {
    id: "mara", name: "Mara Vale", title: "The Advocate", initials: "MV", color: "#77b78b",
    portraitIndex: 3, talent: "Expose a contradiction", bio: "A celebrated barrister with a gift for turning testimony against itself.",
  },
  {
    id: "gideon", name: "Gideon Pike", title: "The Inspector", initials: "GP", color: "#d29a62",
    portraitIndex: 4, talent: "Inspect a locked object", bio: "A retired inspector who knows which details criminals expect police to miss.",
  },
  {
    id: "sable", name: "Sable Quinn", title: "The Illusionist", initials: "SQ", color: "#8c9fca",
    portraitIndex: 5, talent: "Slip through one doorway", bio: "A theatrical magician fluent in misdirection, mechanisms, and hidden panels.",
  },
  {
    id: "rowan", name: "Rowan Chase", title: "The Cipher", initials: "RC", color: "#c47f9f",
    portraitIndex: 6, talent: "Read an encoded note", bio: "A quiet cryptographer who sees patterns in ledgers, clocks, and nervous hands.",
  },
  {
    id: "ophelia", name: "Ophelia Reed", title: "The Botanist", initials: "OR", color: "#9b83c5",
    portraitIndex: 7, talent: "Identify natural traces", bio: "A renowned botanist whose flowers have solved more mysteries than witnesses.",
  },
  {
    id: "bram", name: "Bram Locke", title: "The Virtuoso", initials: "BL", color: "#a7a167",
    portraitIndex: 8, talent: "Reconstruct a sound", bio: "A jazz pianist with perfect timing and an ear for every footstep in the room.",
  },
] as const;

type Detective = (typeof detectiveRoster)[number];

const initialDetectives = detectiveRoster.slice(0, 4);

type NetworkRole = "solo" | "host" | "guest";
type NetworkStatus =
  | "offline"
  | "opening"
  | "waiting"
  | "connected"
  | "reconnecting"
  | "error";
type GameSnapshot = {
  scene: Scene;
  caseVariant: number;
  detectives: Detective[];
  round: number;
  diceValue: number | null;
  diceFace: number;
  movesLeft: number;
  pathThisTurn: BoardNodeId[];
  searchedThisTurn: boolean;
  eventIndex: number | null;
  boardNotice: string;
  pawnPositions: Record<string, BoardNodeId>;
  investigated: RoomId[];
  activePlayerId: string;
  moveHistory: string[];
};

type NetworkMessage =
  | { type: "snapshot"; snapshot: GameSnapshot }
  | { type: "hello"; name: string }
  | { type: "welcome"; name: string }
  | { type: "join-denied"; reason: "password" | "full" };

const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ROOM_PEER_PREFIX = "veil-blackthorn-";

function createRoomCode() {
  const random = new Uint32Array(ROOM_CODE_LENGTH);
  window.crypto.getRandomValues(random);
  return Array.from(
    random,
    (value) => ROOM_CODE_ALPHABET[value % ROOM_CODE_ALPHABET.length],
  ).join("");
}

function normalizeRoomCode(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "")
    .slice(0, ROOM_CODE_LENGTH);
}

function roomPeerId(code: string) {
  return `${ROOM_PEER_PREFIX}${code.toLowerCase()}`;
}

const portraitStyle = (portraitIndex: number) =>
  ({
    "--portrait-column": portraitIndex % 5,
    "--portrait-row": Math.floor(portraitIndex / 5),
  }) as CSSProperties;

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
  for (let column = 1; column <= 20; column += 1) {
    coordinates.push([column, 4], [column, 10], [column, 15]);
  }
  for (let row = 1; row <= 18; row += 1) {
    coordinates.push([5, row], [9, row], [14, row]);
  }
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

const tutorialChapters = [
  {
    number: "I",
    title: "Your objective",
    body: "Understand the changing victim, culprit, method, location, motive, and evidence trail.",
    icon: KeyRound,
  },
  {
    number: "II",
    title: "Roll for movement",
    body: "Cast the brass die and spend movement points along connected marble corridors.",
    icon: Dices,
  },
  {
    number: "III",
    title: "Walk the manor",
    body: "Watch every illustrated detective travel one space at a time and enter through working doors.",
    icon: Footprints,
  },
  {
    number: "IV",
    title: "Search for evidence",
    body: "Search a room once to reveal a timeline, motive, method, or location clue.",
    icon: Search,
  },
  {
    number: "V",
    title: "Read the notebook",
    body: "Connect evidence, witnesses, suspects, motives, and negative room evidence.",
    icon: BookOpen,
  },
  {
    number: "VI",
    title: "Discuss and deceive",
    body: "Share evidence with a friend, hold back a detail, or bluff about your suspicion.",
    icon: UsersRound,
  },
  {
    number: "VII",
    title: "Seal your accusation",
    body: "A complete accusation names the suspect, method, location, and motive.",
    icon: ShieldCheck,
  },
];

const menuItems = [
  {
    label: "Solo investigation",
    detail: "Enter Blackthorn with three moving manor bots",
    icon: KeyRound,
    action: "case",
  },
  {
    label: "Play with a friend",
    detail: "Create an invite link; bots fill the empty seats",
    icon: UsersRound,
    action: "lobby",
  },
  {
    label: "How deduction works",
    detail: "Watch the narrated 90-second tutorial",
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

async function hashRoomPassword(password: string) {
  const normalized = password.trim();
  if (!normalized) return "";
  const bytes = new TextEncoder().encode(`veil-of-secrets:${normalized}`);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  }
}

function quietRoomEvidence(room: Room, caseFile: CaseFile, caseIndex: number): EvidenceVariant {
  const observations = [
    {
      kicker: "A room left undisturbed",
      description: `The ${room.name} inventory is complete, with no disturbance after the final confirmed sighting of ${caseFile.victim}.`,
      clue: `Cleared ${room.name}`,
      note: `Negative evidence removes the ${room.name} from the immediate route and tightens the case timeline.`,
    },
    {
      kicker: "Silence that narrows the route",
      description: `Wax dust at the ${room.name} threshold is unbroken; nobody crossed it during the critical interval.`,
      clue: `${room.name} threshold record`,
      note: `The intact threshold excludes this doorway and shortens the culprit's possible path through Blackthorn.`,
    },
    {
      kicker: "An alibi preserved in place",
      description: `The ${room.name} clock, lamp, and service register agree on an empty room throughout the decisive minutes.`,
      clue: `${room.name} exclusion`,
      note: `Three independent details clear this room without clearing any suspect.`,
    },
  ];
  return observations[caseIndex % observations.length];
}

export default function Home() {
  const [scene, setScene] = useState<Scene>("opening");
  const [openingDeparting, setOpeningDeparting] = useState(false);
  const [tutorialStarted, setTutorialStarted] = useState(false);
  const [tutorialComplete, setTutorialComplete] = useState(false);
  const [investigated, setInvestigated] = useState<RoomId[]>([]);
  const [activeRoom, setActiveRoom] = useState<RoomId | null>(null);
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [notebookTab, setNotebookTab] = useState<NotebookTab>("evidence");
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
  const [activePlayerId, setActivePlayerId] = useState<string>("you");
  const [botsMoving, setBotsMoving] = useState(false);
  const [movingDetectiveId, setMovingDetectiveId] = useState<string | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([
    "Avery Vane begins in the Grand Hall.",
  ]);
  const [networkRole, setNetworkRole] = useState<NetworkRole>("solo");
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>("offline");
  const [joinCode, setJoinCode] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [hostPassword, setHostPassword] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [roomPasswordProtected, setRoomPasswordProtected] = useState(false);
  const [inviteNeedsPassword, setInviteNeedsPassword] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [friendConnected, setFriendConnected] = useState(false);
  const [friendName, setFriendName] = useState("Guest investigator");
  const [copyConfirmed, setCopyConfirmed] = useState<"link" | "code" | null>(null);
  const [networkError, setNetworkError] = useState("");
  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  const snapshotRef = useRef<GameSnapshot | null>(null);
  const applyingRemoteRef = useRef(false);
  const roomPasswordHashRef = useRef("");
  const guestTargetRef = useRef<{ hostId: string; passwordHash: string } | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const tutorialVideoRef = useRef<HTMLVideoElement | null>(null);
  const joinFriendGameRef = useRef<
    (codeOverride?: string, passwordOverride?: string) => Promise<void>
  >(async () => {});
  const reconnectGuestRef = useRef<() => void>(() => {});

  const evidenceCount = investigated.length;
  const canAccuse = evidenceCount >= 4;
  const currentCase = caseFiles[caseVariant];
  const tableWitness =
    currentCase.suspects.find(
      (suspect) => suspect.id !== currentCase.solution.suspect,
    ) ?? currentCase.suspects[0]!;
  const caseRooms = useMemo(
    () =>
      rooms.map((room) => ({
        ...room,
        ...(caseVariant === 0
          ? evidenceVariants[room.id][0]
          : currentCase.evidence[room.id] ??
            quietRoomEvidence(room, currentCase, caseVariant)),
      })),
    [caseVariant, currentCase],
  );
  const activeRoomData = caseRooms.find((room) => room.id === activeRoom);
  const activeDetective = detectives.find((detective) => detective.id === activePlayerId)
    ?? detectives[0];
  const localDetectiveId =
    networkRole === "guest" ? detectives[1]?.id ?? "iris" : detectives[0]?.id ?? "you";
  const isLocalTurn =
    networkRole === "solo" || (friendConnected && activePlayerId === localDetectiveId);
  const currentPawnNode = pawnPositions[activePlayerId] ?? "hall";
  const currentRoom = caseRooms.find((room) => room.id === currentPawnNode);
  const currentLocationName = currentRoom?.name ?? "Manor corridor";
  const reachableNodes = boardGraph[currentPawnNode] ?? [];
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
  const verifiedTimelineCount = currentCase.timeline.filter(
    (_, index) => evidenceCount >= Math.min(index * 2 + 1, 4),
  ).length;

  useEffect(() => {
    window.localStorage.setItem(
      "veil-preferences",
      JSON.stringify({ soundOn, largeText, reducedMotion, captionsOn }),
    );
  }, [soundOn, largeText, reducedMotion, captionsOn]);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const room = parameters.get("room");
    if (!room) return;
    const compactCode = normalizeRoomCode(room);
    const locked = parameters.get("locked") === "1";
    const timer = window.setTimeout(() => {
      setJoinCode(compactCode || room);
      setInviteNeedsPassword(locked);
      setScene("lobby");
      if (!locked) {
        void joinFriendGameRef.current(compactCode || room, "");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(
    () => () => {
      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      connectionRef.current?.close();
      peerRef.current?.destroy();
    },
    [],
  );

  useEffect(() => {
    const restoreSignaling = () => {
      const peer = peerRef.current;
      if (!peer || peer.destroyed || !peer.disconnected) return;
      setNetworkStatus("reconnecting");
      try {
        peer.reconnect();
      } catch {
        setNetworkStatus("error");
        setNetworkError("Tap Join table or Create room again to restore the table.");
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") restoreSignaling();
    };
    window.addEventListener("online", restoreSignaling);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", restoreSignaling);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    const snapshot: GameSnapshot = {
      scene,
      caseVariant,
      detectives,
      round,
      diceValue,
      diceFace,
      movesLeft,
      pathThisTurn,
      searchedThisTurn,
      eventIndex,
      boardNotice,
      pawnPositions,
      investigated,
      activePlayerId,
      moveHistory,
    };
    snapshotRef.current = snapshot;

    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }
    if (connectionRef.current?.open) {
      connectionRef.current.send({ type: "snapshot", snapshot } satisfies NetworkMessage);
    }
  }, [
    scene,
    caseVariant,
    detectives,
    round,
    diceValue,
    diceFace,
    movesLeft,
    pathThisTurn,
    searchedThisTurn,
    eventIndex,
    boardNotice,
    pawnPositions,
    investigated,
    activePlayerId,
    moveHistory,
  ]);

  const clueProgress = useMemo(
    () => caseRooms.map((room) => investigated.includes(room.id)),
    [caseRooms, investigated],
  );

  const disconnectNetwork = () => {
    const connection = connectionRef.current;
    const peer = peerRef.current;
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    connectionRef.current = null;
    peerRef.current = null;
    guestTargetRef.current = null;
    roomPasswordHashRef.current = "";
    connection?.close();
    peer?.destroy();
    setFriendConnected(false);
    setNetworkRole("solo");
    setNetworkStatus("offline");
    setNetworkError("");
    setRoomCode("");
    setRoomPasswordProtected(false);
    setInviteLink("");
  };

  const applyRemoteSnapshot = (snapshot: GameSnapshot) => {
    applyingRemoteRef.current = true;
    setScene(snapshot.scene);
    setCaseVariant(snapshot.caseVariant);
    setDetectives(snapshot.detectives);
    setRound(snapshot.round);
    setDiceValue(snapshot.diceValue);
    setDiceFace(snapshot.diceFace);
    setMovesLeft(snapshot.movesLeft);
    setPathThisTurn(snapshot.pathThisTurn);
    setSearchedThisTurn(snapshot.searchedThisTurn);
    setEventIndex(snapshot.eventIndex);
    setBoardNotice(snapshot.boardNotice);
    setPawnPositions(snapshot.pawnPositions);
    setInvestigated(snapshot.investigated);
    setActivePlayerId(snapshot.activePlayerId);
    setMoveHistory(snapshot.moveHistory);
  };

  const bindConnection = (connection: DataConnection, role: NetworkRole) => {
    connectionRef.current?.close();
    connectionRef.current = connection;
    let connectionAccepted = role === "host";
    connection.on("open", () => {
      if (connectionRef.current !== connection) return;
      setNetworkError("");
      connection.send({
        type: "hello",
        name: role === "guest" ? "Invited investigator" : "Host investigator",
      } satisfies NetworkMessage);
      if (role === "host") {
        setNetworkStatus("connected");
        setFriendConnected(true);
        connection.send({
          type: "welcome",
          name: "Host investigator",
        } satisfies NetworkMessage);
      }
      if (role === "host" && snapshotRef.current) {
        connection.send({
          type: "snapshot",
          snapshot: snapshotRef.current,
        } satisfies NetworkMessage);
      }
      if (role === "host") playChime(soundOn, true);
    });
    connection.on("data", (data) => {
      const message = data as NetworkMessage;
      if (message?.type === "welcome" && role === "guest") {
        connectionAccepted = true;
        setNetworkStatus("connected");
        setFriendConnected(true);
        setFriendName(message.name);
        setNetworkError("");
        playChime(soundOn, true);
      }
      if (message?.type === "join-denied" && role === "guest") {
        connectionAccepted = false;
        setFriendConnected(false);
        setNetworkStatus("error");
        setNetworkError(
          message.reason === "password"
            ? "That round password is not correct. Check it and try again."
            : "That room already has two investigators. Ask the host for a new room.",
        );
        connection.close();
      }
      if (message?.type === "snapshot" && message.snapshot) {
        applyRemoteSnapshot(message.snapshot);
      }
      if (message?.type === "hello") {
        setFriendName(message.name);
      }
    });
    connection.on("close", () => {
      if (connectionRef.current !== connection) return;
      connectionRef.current = null;
      setFriendConnected(false);
      setNetworkStatus(
        role === "host" ? "waiting" : connectionAccepted ? "reconnecting" : "error",
      );
      setActivePlayerId("you");
      setBoardNotice(
        role === "host"
          ? "Your friend stepped away. Their seat is saved while the room stays open."
          : "The connection paused. Restoring your seat at the Blackthorn table.",
      );
      if (role === "guest" && connectionAccepted) {
        reconnectTimerRef.current = window.setTimeout(
          () => reconnectGuestRef.current(),
          1200,
        );
      }
    });
    connection.on("error", () => {
      if (connectionRef.current !== connection) return;
      setNetworkStatus("error");
      setFriendConnected(false);
      setNetworkError("The connection paused. Tap Join table to try again.");
    });
  };

  const startHosting = async () => {
    disconnectNetwork();
    setNetworkRole("host");
    setNetworkStatus("opening");
    setNetworkError("");
    try {
      const { Peer: PeerClient } = await import("peerjs");
      const code = createRoomCode();
      const passwordHash = await hashRoomPassword(hostPassword);
      const peer = new PeerClient(roomPeerId(code));
      peerRef.current = peer;
      roomPasswordHashRef.current = passwordHash;
      setRoomCode(code);
      setRoomPasswordProtected(Boolean(passwordHash));
      peer.on("open", () => {
        const url = new URL(window.location.href);
        url.search = "";
        url.searchParams.set("room", code);
        if (passwordHash) url.searchParams.set("locked", "1");
        setInviteLink(url.toString());
        setNetworkStatus("waiting");
      });
      peer.on("connection", (connection) => {
        const metadata = connection.metadata as
          | { passwordHash?: string }
          | undefined;
        const roomIsFull = Boolean(connectionRef.current?.open);
        const wrongPassword =
          (metadata?.passwordHash ?? "") !== roomPasswordHashRef.current;
        if (roomIsFull || wrongPassword) {
          connection.on("open", () => {
            connection.send({
              type: "join-denied",
              reason: roomIsFull ? "full" : "password",
            } satisfies NetworkMessage);
            window.setTimeout(() => connection.close(), 260);
          });
          return;
        }
        bindConnection(connection, "host");
      });
      peer.on("disconnected", () => {
        if (peerRef.current !== peer || peer.destroyed) return;
        setNetworkStatus("reconnecting");
        try {
          peer.reconnect();
        } catch {
          setNetworkStatus("error");
          setNetworkError("Tap Create room again to reopen the table.");
        }
      });
      peer.on("error", (error) => {
        if (peerRef.current !== peer) return;
        setNetworkStatus("error");
        setNetworkError(
          error.type === "unavailable-id"
            ? "That short code was just claimed. Tap Create room once more."
            : "The room could not open. Check your connection and try again.",
        );
      });
    } catch {
      setNetworkStatus("error");
      setNetworkError("The room could not open. Check your connection and try again.");
    }
  };

  const connectGuest = (
    peer: Peer,
    hostId: string,
    passwordHash: string,
  ) => {
    if (connectionRef.current?.open) return;
    setNetworkStatus("opening");
    setNetworkError("");
    const connection = peer.connect(hostId, {
      reliable: true,
      metadata: { passwordHash },
    });
    bindConnection(connection, "guest");
  };

  const reconnectGuest = () => {
    const peer = peerRef.current;
    const target = guestTargetRef.current;
    if (!peer || peer.destroyed || !target) {
      setNetworkStatus("error");
      setNetworkError("Tap Join table to restore your seat.");
      return;
    }
    if (peer.disconnected) {
      try {
        peer.reconnect();
      } catch {
        setNetworkStatus("error");
        setNetworkError("Tap Join table to restore your seat.");
      }
      return;
    }
    connectGuest(peer, target.hostId, target.passwordHash);
  };

  const joinFriendGame = async (
    codeOverride?: string,
    passwordOverride?: string,
  ) => {
    const rawCode = (codeOverride ?? joinCode).trim();
    if (!rawCode) return;
    let roomValue = rawCode;
    let lockedFromLink = false;
    try {
      const invitation = new URL(rawCode);
      roomValue = invitation.searchParams.get("room") ?? rawCode;
      lockedFromLink = invitation.searchParams.get("locked") === "1";
    } catch {
      // A six-character room code is already valid.
    }
    const compactCode = normalizeRoomCode(roomValue);
    const isShortCode = compactCode.length === ROOM_CODE_LENGTH;
    const hostId = isShortCode ? roomPeerId(compactCode) : roomValue;
    const password = passwordOverride ?? joinPassword;
    if ((inviteNeedsPassword || lockedFromLink) && !password.trim()) {
      setScene("lobby");
      setJoinCode(compactCode || roomValue);
      setInviteNeedsPassword(true);
      setNetworkStatus("offline");
      setNetworkError("Enter the round password from your host, then tap Join table.");
      return;
    }
    const passwordHash = await hashRoomPassword(password);
    disconnectNetwork();
    setNetworkRole("guest");
    setNetworkStatus("opening");
    setJoinCode(compactCode || roomValue);
    setInviteNeedsPassword(Boolean(passwordHash) || lockedFromLink);
    guestTargetRef.current = { hostId, passwordHash };
    try {
      const { Peer: PeerClient } = await import("peerjs");
      const peer = new PeerClient();
      peerRef.current = peer;
      peer.on("open", () => {
        const target = guestTargetRef.current;
        if (target) connectGuest(peer, target.hostId, target.passwordHash);
      });
      peer.on("disconnected", () => {
        if (peerRef.current !== peer || peer.destroyed) return;
        setNetworkStatus("reconnecting");
        try {
          peer.reconnect();
        } catch {
          setNetworkStatus("error");
          setNetworkError("Tap Join table to restore your seat.");
        }
      });
      peer.on("error", () => {
        if (peerRef.current !== peer) return;
        setNetworkStatus("error");
        setNetworkError(
          "Room not found yet. Ask the host to return to the lobby, then tap Join table again.",
        );
      });
    } catch {
      setNetworkStatus("error");
      setNetworkError("The room could not connect. Check your connection and try again.");
    }
  };
  useEffect(() => {
    reconnectGuestRef.current = reconnectGuest;
    joinFriendGameRef.current = joinFriendGame;
  });

  const copyInvite = async (kind: "link" | "code") => {
    const text = kind === "link" ? inviteLink : roomCode;
    if (!text) return;
    const copied = await copyText(text);
    if (!copied) {
      setNetworkError("Press and hold the room code to copy it manually.");
      return;
    }
    setCopyConfirmed(kind);
    window.setTimeout(() => setCopyConfirmed(null), 1800);
  };

  const playTutorial = async () => {
    const video = tutorialVideoRef.current;
    if (!video) return;
    setTutorialStarted(true);
    setTutorialComplete(false);
    video.currentTime = 0;
    await video.play().catch(() => {
      setTutorialStarted(false);
    });
  };

  const replayTutorial = async () => {
    const video = tutorialVideoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setTutorialComplete(false);
    setTutorialStarted(true);
    await video.play().catch(() => undefined);
  };

  const moveTo = (next: Scene) => {
    playChime(soundOn);
    if (next === "rules") {
      setTutorialStarted(false);
      setTutorialComplete(false);
    }
    setScene(next);
  };

  const returnToOpeningScene = () => {
    playChime(soundOn);
    setNotebookOpen(false);
    setSettingsOpen(false);
    setAccusationOpen(false);
    setWrongTheory(false);
    setTutorialStarted(false);
    setTutorialComplete(false);
    setOpeningDeparting(false);
    setScene("opening");
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
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
    if (diceRolling || hasRolled || botsMoving || !isLocalTurn) return;
    const value = Math.floor(Math.random() * 6) + 1;
    const rollDuration = reducedMotion ? 280 : 760;
    const faceSequence = [2, 5, 3, 6, 1, 4, value];
    setDiceRolling(true);
    setEventIndex(null);
    setPathThisTurn([currentPawnNode]);
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
          ? `${activeDetective.name} rolled 1. Walk to one glowing marble space.`
          : `${activeDetective.name} rolled ${value}. Walk through up to ${value} connected spaces and enter a room.`,
      );
    }, rollDuration);
  };

  const movePawn = (nodeId: BoardNodeId) => {
    if (
      !hasRolled ||
      movesLeft < 1 ||
      !reachableNodes.includes(nodeId) ||
      botsMoving ||
      !isLocalTurn
    ) return;
    const enteredRoom = caseRooms.find((room) => room.id === nodeId);
    const fromName =
      caseRooms.find((room) => room.id === currentPawnNode)?.name ?? "Manor corridor";
    const toName = enteredRoom?.name ?? "Manor corridor";
    setPawnPositions((current) => ({ ...current, [activePlayerId]: nodeId }));
    setPathThisTurn((current) => [...current, nodeId]);
    setMovesLeft((current) => current - 1);
    setSearchedThisTurn(false);
    setMoveHistory((current) =>
      [`${activeDetective.name}: ${fromName} → ${toName}`, ...current].slice(0, 6),
    );
    setBoardNotice(
      enteredRoom
        ? investigated.includes(enteredRoom.id)
          ? `${activeDetective.name} entered the ${enteredRoom.name}. Its strongest clue is already secured.`
          : `${activeDetective.name} entered the ${enteredRoom.name}. Search it now, or leave through the doorway.`
        : `${activeDetective.name}'s pawn advances across the marble corridor.`,
    );
    playChime(soundOn);
  };

  const searchCurrentRoom = () => {
    if (!hasRolled || searchedThisTurn || !currentRoom || botsMoving || !isLocalTurn) return;
    setSearchedThisTurn(true);
    setMovesLeft(0);
    inspectRoom(currentRoom);
    setBoardNotice(`${currentRoom.clue} was added to your private notebook.`);
  };

  const animateBotTurns = async () => {
    const nextEvent = Math.floor(Math.random() * manorEvents.length);
    setEventIndex(nextEvent);
    setBotsMoving(true);
    const humanCount = friendConnected ? 2 : 1;
    const botDetectives = detectives.slice(humanCount);
    const nextPositions = { ...pawnPositions };

    for (const detective of botDetectives) {
      setMovingDetectiveId(detective.id);
      const stepCount = 1 + Math.floor(Math.random() * 3);
      let currentNode = nextPositions[detective.id] ?? "hall";
      let previousNode: string | null = null;
      for (let step = 0; step < stepCount; step += 1) {
        const choices = (boardGraph[currentNode] ?? ["hall"]).filter(
          (choice) => choice !== previousNode,
        );
        const nextNode =
          choices[Math.floor(Math.random() * choices.length)] ??
          boardGraph[currentNode]?.[0] ??
          "hall";
        previousNode = currentNode;
        currentNode = nextNode;
        nextPositions[detective.id] = nextNode;
        setPawnPositions({ ...nextPositions });
        const destination =
          caseRooms.find((room) => room.id === nextNode)?.name ?? "marble corridor";
        setBoardNotice(`${detective.name} moves to the ${destination}.`);
        setMoveHistory((current) =>
          [`${detective.name} → ${destination}`, ...current].slice(0, 6),
        );
        await new Promise((resolve) =>
          window.setTimeout(resolve, reducedMotion ? 40 : 310),
        );
      }
    }
    setMovingDetectiveId(null);
    setRound((current) => current + 1);
    setDiceValue(null);
    setDiceFace(6);
    setMovesLeft(0);
    setActivePlayerId(detectives[0]?.id ?? "you");
    setPathThisTurn([nextPositions[detectives[0]?.id ?? "you"] ?? "hall"]);
    setSearchedThisTurn(false);
    setBotsMoving(false);
    setBoardNotice("The manor bots have completed their visible moves. Avery's turn begins.");
    playChime(soundOn);
  };

  const endBoardTurn = () => {
    if (botsMoving || !isLocalTurn) return;
    if (friendConnected && activePlayerId === detectives[0]?.id) {
      const friendDetective = detectives[1];
      setActivePlayerId(friendDetective.id);
      setDiceValue(null);
      setDiceFace(6);
      setMovesLeft(0);
      setPathThisTurn([pawnPositions[friendDetective.id] ?? "hall"]);
      setSearchedThisTurn(false);
      setBoardNotice(`${friendDetective.name}'s turn. Waiting for your friend to roll.`);
      playChime(soundOn);
      return;
    }
    void animateBotTurns();
  };

  const restartBoard = () => {
    const nextVariant =
      (caseVariant + 1 + Math.floor(Math.random() * (caseFiles.length - 1))) %
      caseFiles.length;
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
    setNotebookTab("evidence");
    setAccusationOpen(false);
    setSelectedSuspect("");
    setSelectedMethod("");
    setSelectedLocation("");
    setSelectedMotive("");
    setWrongTheory(false);
    setPawnPositions(placeDetectives(nextDetectives));
    setActivePlayerId(nextDetectives[0].id);
    setBotsMoving(false);
    setMovingDetectiveId(null);
    setMoveHistory([`${nextDetectives[0].name} begins in the Grand Hall.`]);
    setBoardNotice(
      "A new case, detective table, and evidence trail are ready. Roll to leave the Grand Hall.",
    );
    playChime(soundOn);
  };

  const beginLobbyGame = (botsOnly = false) => {
    if (botsOnly) disconnectNetwork();
    restartBoard();
    setScene("case");
  };

  const submitTheory = () => {
    const correct =
      selectedSuspect === currentCase.solution.suspect &&
      selectedMethod === currentCase.solution.method &&
      selectedLocation === currentCase.solution.location &&
      selectedMotive === currentCase.solution.motive;

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
            type="button"
            className="brand-lockup"
            onClick={returnToOpeningScene}
            aria-label="Return to the Veil of Secrets opening scene"
            title="Return to opening scene"
          >
            <span className="brand-mark" aria-hidden="true">
              <span
                className="brand-mark-art"
                style={{ backgroundImage: "url('./branding/veil-sigil-v2.png')" }}
              />
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
              <span className="sigil-shadow-disc" />
              <span
                className="sigil-crest-art"
                style={{
                  backgroundImage: "url('./branding/veil-sigil-v2.png')",
                }}
              />
              <span className="sigil-glint" />
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
        <section className="tutorial-scene scene" aria-labelledby="tutorial-title">
          <div className="tutorial-heading">
            <div>
              <p className="eyebrow">The investigator&apos;s briefing</p>
              <h2 id="tutorial-title">Learn Blackthorn in ninety seconds.</h2>
              <p>
                A narrated walkthrough of movement, evidence, deduction, friend play,
                and the final accusation—shown with the actual detective cast.
              </p>
            </div>
            <span className="tutorial-runtime">
              <Play size={14} fill="currentColor" />
              01:30 · Seven chapters
            </span>
          </div>

          <div className="tutorial-layout">
            <div className="tutorial-player-shell">
              <div className="tutorial-film-frame">
                <video
                  ref={tutorialVideoRef}
                  controls={tutorialStarted}
                  playsInline
                  preload="metadata"
                  muted={!soundOn}
                  poster="./tutorial/veil-of-secrets-tutorial-poster.jpg"
                  onPlay={() => setTutorialStarted(true)}
                  onEnded={() => setTutorialComplete(true)}
                  aria-label="Veil of Secrets narrated gameplay tutorial"
                >
                  <source
                    src="./tutorial/veil-of-secrets-tutorial.mp4"
                    type="video/mp4"
                  />
                  <track
                    kind="captions"
                    src="./tutorial/veil-of-secrets-tutorial.vtt"
                    srcLang="en"
                    label="English"
                  />
                  Your browser does not support the tutorial video.
                </video>

                {!tutorialStarted && (
                  <button className="tutorial-play-button" onClick={() => void playTutorial()}>
                    <span><Play size={28} fill="currentColor" /></span>
                    <strong>Play tutorial</strong>
                    <small>Narration, captions, and moving characters</small>
                  </button>
                )}

                {tutorialComplete && (
                  <div className="tutorial-complete-card" role="status">
                    <Check size={22} />
                    <span>
                      <strong>Briefing complete</strong>
                      <small>You are ready to investigate.</small>
                    </span>
                  </div>
                )}
              </div>

              <div className="tutorial-player-meta">
                <span><Captions size={15} /> Captions included</span>
                <span><Volume2 size={15} /> Narrated walkthrough</span>
                {tutorialStarted && (
                  <button onClick={() => void replayTutorial()}>
                    <RotateCcw size={14} /> Replay from start
                  </button>
                )}
              </div>
            </div>

            <aside className="tutorial-chapter-list" aria-label="Tutorial chapters">
              <div className="panel-label">
                <span>Inside the film</span>
                <span>01:30</span>
              </div>
              <ol>
                {tutorialChapters.map((chapter, index) => (
                  <li key={chapter.title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{chapter.title}</strong>
                      <small>{index === 0 ? "The changing mystery" : chapter.body}</small>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>

          <div className="tutorial-footer">
            <button className="secondary-button" onClick={() => moveTo("menu")}>
              Skip for now
            </button>
            <button className="primary-button" onClick={() => moveTo("case")}>
              {tutorialComplete ? "Begin practice case" : "Skip to practice case"}
              <ArrowRight size={17} />
            </button>
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
              <small>{caseFiles.length} rotating cases · solo bots or a friend table</small>
            </div>
          </nav>
        </section>
      )}

      {scene === "lobby" && (
        <section className="lobby-scene scene" aria-labelledby="lobby-title">
          <div className="lobby-heading">
            <div>
              <p className="eyebrow">Private table · Two investigators + manor bots</p>
              <h2 id="lobby-title">Invite a friend into the mystery.</h2>
              <p>
                Open a private room, copy the six-character code or invitation, and
                watch every investigator cross Blackthorn together.
              </p>
            </div>
            <div className={`connection-seal status-${networkStatus}`}>
              <span />
              <strong>
                {friendConnected
                  ? "Friend connected"
                  : networkStatus === "waiting"
                    ? "Invitation ready"
                    : networkStatus === "opening"
                      ? "Connecting"
                      : networkStatus === "reconnecting"
                        ? "Restoring the table"
                      : networkStatus === "error"
                        ? "Needs attention"
                        : "Table offline"}
              </strong>
              <small>
                {friendConnected
                  ? `${friendName} · two-player table`
                  : networkStatus === "waiting"
                    ? `Room ${roomCode} is open`
                    : networkStatus === "reconnecting"
                      ? "Trying again automatically"
                      : networkStatus === "opening"
                        ? "Securing your private room"
                        : "No account or download required"}
              </small>
            </div>
          </div>

          <div className="lobby-layout">
            <div className="invite-console">
              <div className="invite-panel">
                <span className="invite-number">01</span>
                <div>
                  <small>Host a table</small>
                  <h3>Open a private room</h3>
                  <p>
                    Choose an optional password, then send the short code or copy-ready
                    invitation.
                  </p>
                </div>
                <label className="round-password-field" htmlFor="host-password">
                  <span>
                    <LockKeyhole size={14} />
                    Round password <small>optional</small>
                  </span>
                  <input
                    id="host-password"
                    type="password"
                    value={hostPassword}
                    onChange={(event) => setHostPassword(event.target.value)}
                    placeholder="Add a private password"
                    maxLength={24}
                    autoComplete="new-password"
                    disabled={networkStatus === "waiting" || friendConnected}
                  />
                </label>
                <button
                  className="primary-button"
                  onClick={startHosting}
                  disabled={networkStatus === "opening" || friendConnected}
                >
                  <UsersRound size={17} />
                  {inviteLink ? "Create a new room" : "Create room"}
                </button>
              </div>

              {inviteLink && (
                <div className="invite-link-card">
                  <div className="room-code-card">
                    <small>Friend room code</small>
                    <strong>{roomCode}</strong>
                    <span>
                      {roomPasswordProtected ? (
                        <>
                          <LockKeyhole size={12} /> Password protected
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={12} /> Private invitation
                        </>
                      )}
                    </span>
                  </div>
                  <div className="invite-copy-actions">
                    <button
                      className="primary-button"
                      onClick={() => void copyInvite("link")}
                    >
                      {copyConfirmed === "link" ? (
                        <Check size={17} />
                      ) : (
                        <KeyRound size={17} />
                      )}
                      {copyConfirmed === "link" ? "Invite copied" : "Copy invitation"}
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => void copyInvite("code")}
                    >
                      {copyConfirmed === "code" ? <Check size={16} /> : "ABC"}
                      {copyConfirmed === "code" ? "Copied" : "Copy code"}
                    </button>
                  </div>
                </div>
              )}

              <div className="invite-divider">
                <span />
                or join your friend
                <span />
              </div>

              <div className="join-panel">
                <label htmlFor="friend-code">Join with a six-character room code</label>
                <div className="join-fields">
                  <input
                    id="friend-code"
                    value={joinCode}
                    onChange={(event) => {
                      const value = event.target.value;
                      setJoinCode(
                        value.includes("://") ? value : normalizeRoomCode(value),
                      );
                    }}
                    placeholder="EXAMPLE: VEIL42"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    inputMode="text"
                  />
                  <input
                    id="join-password"
                    type="password"
                    value={joinPassword}
                    onChange={(event) => setJoinPassword(event.target.value)}
                    placeholder={
                      inviteNeedsPassword
                        ? "Round password required"
                        : "Password, if the host made one"
                    }
                    maxLength={24}
                    autoComplete="current-password"
                  />
                  <button
                    className="secondary-button"
                    onClick={() => void joinFriendGame()}
                    disabled={!joinCode.trim() || networkStatus === "opening"}
                  >
                    {networkStatus === "reconnecting" ? "Reconnect" : "Join table"}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>

              {networkError && (
                <p className="connection-error" role="alert">
                  {networkError}
                </p>
              )}

              <div className="lobby-actions">
                <button
                  className="primary-button"
                  onClick={() => beginLobbyGame(false)}
                  disabled={networkRole !== "host" || !friendConnected}
                >
                  Begin friend match <ArrowRight size={17} />
                </button>
                <button className="secondary-button" onClick={() => beginLobbyGame(true)}>
                  Play now with three bots
                </button>
              </div>

              <p className="peer-note">
                <ShieldCheck size={13} />
                Tap <strong>Copy invitation</strong>, paste it in a message, then return
                here. If your phone pauses the game while messaging, this room restores
                when you come back. The host must keep the game tab open during play.
              </p>
            </div>

            <aside className="cast-gallery" aria-label="Blackthorn detective roster">
              <div className="panel-label">
                <span>Original detective cast</span>
                <Shuffle size={15} />
              </div>
              <p>Four cards are drawn for each case. Empty friend seats become bots.</p>
              <div className="character-card-grid">
                {detectiveRoster.map((detective) => (
                  <article className="character-card" key={detective.id}>
                    <div
                      className="character-portrait"
                      style={portraitStyle(detective.portraitIndex)}
                      role="img"
                      aria-label={`Portrait of ${detective.name}`}
                    />
                    <div>
                      <small>{detective.title}</small>
                      <strong>{detective.name}</strong>
                      <p>{detective.bio}</p>
                      <span>
                        <Sparkles size={12} />
                        {detective.talent}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          </div>
        </section>
      )}

      {scene === "case" && (
        <section className="case-scene scene" aria-labelledby="case-title">
          <div className="tabletop-header">
            <div>
              <p className="eyebrow">
                Blackthorn table · Case {String(caseVariant + 1).padStart(3, "0")} of{" "}
                {String(caseFiles.length).padStart(3, "0")}
              </p>
              <h2 id="case-title">{currentCase.title}</h2>
              <p>{currentCase.subtitle}</p>
              <span className="case-victim">
                Victim: {currentCase.victim}
              </span>
            </div>
            <div className="tabletop-header-actions">
              <button
                className="new-case-button secondary-button"
                onClick={restartBoard}
                aria-label="Start a new case with a new cast and clues"
                title="New case, cast, and clues"
              >
                <Shuffle size={18} />
                <span>New case</span>
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
            <span>
              <UsersRound size={15} />
              {friendConnected ? "Private table · 2 players + 2 bots" : "Solo table · You + 3 bots"}
            </span>
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
                  <article
                    className={detective.id === activePlayerId ? "active" : ""}
                    key={detective.id}
                  >
                    <div
                      className="detective-card-portrait"
                      style={{
                        ...portraitStyle(detective.portraitIndex),
                        "--player-color": detective.color,
                      } as CSSProperties}
                      role="img"
                      aria-label={`${detective.name}, ${detective.title}`}
                    />
                    <span>
                      <strong>{detective.name}</strong>
                      <small>{detective.title}</small>
                    </span>
                    {detective.id === activePlayerId ? (
                      <b>
                        {isLocalTurn
                          ? "Your turn"
                          : friendConnected
                            ? "Friend turn"
                            : "Moving"}
                      </b>
                    ) : (
                      <i>{friendConnected && index === 1 ? "F" : "BOT"}</i>
                    )}
                  </article>
                ))}
              </div>

              <div className="movement-ledger">
                <small>Visible move ledger</small>
                <ol>
                  {moveHistory.slice(0, 4).map((entry, index) => (
                    <li key={`${entry}-${index}`}>
                      <Footprints size={12} />
                      {entry}
                    </li>
                  ))}
                </ol>
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
                <span>
                  <CircleDot size={14} />
                  {activeDetective.name}&apos;s pawn is in the {currentLocationName}
                </span>
                <strong>
                  {botsMoving
                    ? "Manor bots moving"
                    : !isLocalTurn
                      ? "Watching your friend"
                      : movesLeft > 0
                        ? `${movesLeft} moves left`
                        : hasRolled
                          ? "Choose an action"
                          : "Awaiting roll"}
                </strong>
              </div>
              <div className="manor-board" aria-label="Interactive Blackthorn Manor board">
                <div className="board-atmosphere" aria-hidden="true" />
                {corridorCoordinates.map((space, spaceIndex) => {
                  const occupied = detectives.filter(
                    (detective) => pawnPositions[detective.id] === space.id,
                  );
                  const pathStep = pathThisTurn.lastIndexOf(space.id);
                  const reachable =
                    hasRolled &&
                    movesLeft > 0 &&
                    isLocalTurn &&
                    !botsMoving &&
                    reachableNodes.includes(space.id);
                  const current = currentPawnNode === space.id;
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
                        current ? `, ${activeDetective.name}'s current position` : ""
                      }${reachable ? ", reachable" : ""}`}
                    >
                      <span className="floor-inlay" aria-hidden="true" />
                      <span className="pawn-cluster" aria-hidden="true">
                        {occupied.map((detective) => (
                          <i
                            key={detective.id}
                            title={detective.name}
                            className={movingDetectiveId === detective.id ? "moving" : ""}
                            style={{ "--player-color": detective.color } as CSSProperties}
                          >
                            <span
                              className="pawn-character"
                              style={portraitStyle(detective.portraitIndex)}
                            />
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
                    hasRolled &&
                    movesLeft > 0 &&
                    isLocalTurn &&
                    !botsMoving &&
                    reachableNodes.includes(room.id);
                  const current = currentPawnNode === room.id;
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
                      aria-label={`${room.name}${current ? `, ${activeDetective.name}'s current room` : ""}${
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
                            className={movingDetectiveId === detective.id ? "moving" : ""}
                            style={{ "--player-color": detective.color } as CSSProperties}
                          >
                            <span
                              className="pawn-character"
                              style={portraitStyle(detective.portraitIndex)}
                            />
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
                  disabled={hasRolled || diceRolling || botsMoving || !isLocalTurn}
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
                  disabled={
                    !hasRolled ||
                    searchedThisTurn ||
                    !currentRoom ||
                    botsMoving ||
                    !isLocalTurn
                  }
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
                  disabled={!hasRolled || botsMoving || !isLocalTurn}
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
              <small>Table talk · {tableWitness.name}&apos;s statement</small>
              <p>
                “I saw {currentCase.suspects[0].name} near{" "}
                {currentCase.locations[1]} before {currentCase.victim} was found.”
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
            Case {String(caseVariant + 1).padStart(3, "0")} of{" "}
            {String(caseFiles.length).padStart(3, "0")} · Truth established
          </p>
          <h2 id="verdict-title">The veil is lifted.</h2>
          <p className="verdict-lead">{currentCase.reveal}</p>

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
            {currentCase.timeline.map((moment) => (
              <div key={`${moment.time}-${moment.text}`}>
                <span>{moment.time}</span>
                <p>{moment.text}</p>
              </div>
            ))}
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
            <div className="notebook-tabs" role="tablist" aria-label="Notebook sections">
              <button
                type="button"
                role="tab"
                aria-selected={notebookTab === "evidence"}
                aria-controls="notebook-evidence"
                className={notebookTab === "evidence" ? "active" : ""}
                onClick={() => {
                  setNotebookTab("evidence");
                  playChime(soundOn);
                }}
              >
                Evidence <span>{evidenceCount}/{caseRooms.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={notebookTab === "timeline"}
                aria-controls="notebook-timeline"
                className={notebookTab === "timeline" ? "active" : ""}
                onClick={() => {
                  setNotebookTab("timeline");
                  playChime(soundOn);
                }}
              >
                Timeline <span>{verifiedTimelineCount}/{currentCase.timeline.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={notebookTab === "suspects"}
                aria-controls="notebook-suspects"
                className={notebookTab === "suspects" ? "active" : ""}
                onClick={() => {
                  setNotebookTab("suspects");
                  playChime(soundOn);
                }}
              >
                Suspects <span>{selectedSuspect ? "1 marked" : currentCase.suspects.length}</span>
              </button>
            </div>

            {notebookTab === "evidence" && (
              <div
                className="notebook-entries"
                id="notebook-evidence"
                role="tabpanel"
              >
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
            )}

            {notebookTab === "timeline" && (
              <div
                className="notebook-entries notebook-timeline"
                id="notebook-timeline"
                role="tabpanel"
              >
                <div className="notebook-section-intro">
                  <Clock3 size={17} />
                  <span>
                    <strong>Critical movements</strong>
                    <small>Times verify automatically as your evidence trail grows.</small>
                  </span>
                </div>
                {currentCase.timeline.map((event, index) => {
                  const requiredClues = Math.min(index * 2 + 1, 4);
                  const verified = evidenceCount >= requiredClues;
                  return (
                    <article className={verified ? "found" : ""} key={`${event.time}-${index}`}>
                      <div>{verified ? <Check size={15} /> : <LockKeyhole size={15} />}</div>
                      <span>
                        <small>{verified ? "Verified timestamp" : `Requires ${requiredClues} clues`}</small>
                        <strong>{verified ? event.time : "Time unverified"}</strong>
                        <p>
                          {verified
                            ? event.text
                            : "Search the manor to connect this movement to physical evidence."}
                        </p>
                      </span>
                    </article>
                  );
                })}
              </div>
            )}

            {notebookTab === "suspects" && (
              <div
                className="notebook-entries notebook-suspects"
                id="notebook-suspects"
                role="tabpanel"
              >
                <div className="notebook-section-intro">
                  <UsersRound size={17} />
                  <span>
                    <strong>People of interest</strong>
                    <small>Mark one suspect to carry them into your final theory.</small>
                  </span>
                </div>
                {currentCase.suspects.map((suspect) => {
                  const marked = selectedSuspect === suspect.id;
                  return (
                    <button
                      type="button"
                      className={`notebook-suspect ${marked ? "marked" : ""}`}
                      key={suspect.id}
                      aria-pressed={marked}
                      onClick={() => {
                        setSelectedSuspect(marked ? "" : suspect.id);
                        setWrongTheory(false);
                        playChime(soundOn, !marked);
                      }}
                    >
                      <span className="notebook-suspect-monogram">{suspect.monogram}</span>
                      <span>
                        <small>{suspect.role}</small>
                        <strong>{suspect.name}</strong>
                        <p>{suspect.detail}</p>
                        <i>{marked ? "Marked as prime suspect" : "Mark as prime suspect"}</i>
                      </span>
                      <span className="notebook-suspect-check">
                        {marked ? <Check size={15} /> : <CircleDot size={15} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
                  {currentCase.suspects.map((suspect) => (
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
                    {currentCase.methods.map((method) => (
                      <option key={method}>{method}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Location</span>
                  <select
                    value={selectedLocation}
                    onChange={(event) => setSelectedLocation(event.target.value)}
                  >
                    <option value="">Choose the location</option>
                    {currentCase.locations.map((location) => (
                      <option key={location}>{location}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Motive</span>
                  <select
                    value={selectedMotive}
                    onChange={(event) => setSelectedMotive(event.target.value)}
                  >
                    <option value="">Choose the motive</option>
                    {currentCase.motives.map((motive) => (
                      <option key={motive}>{motive}</option>
                    ))}
                  </select>
                </label>
              </div>

              {wrongTheory && (
                <div className="theory-warning" role="alert">
                  <Eye size={17} />
                  The evidence contradicts this theory. Compare the timeline,
                  room exclusions, and strongest physical clues—there is no
                  penalty for revising your deduction.
                </div>
              )}
            </div>

            <div className="accusation-footer">
              <button
                className="secondary-button"
                onClick={() => {
                  setAccusationOpen(false);
                  setNotebookTab("evidence");
                  setNotebookOpen(true);
                }}
              >
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
