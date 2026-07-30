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
};

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
  },
];

const detectives = [
  { id: "you", name: "You", title: "The Lantern", initials: "YL", color: "#e3c878" },
  { id: "iris", name: "Iris Bell", title: "The Listener", initials: "IB", color: "#75b8c8" },
  { id: "theo", name: "Theo Wren", title: "The Archivist", initials: "TW", color: "#a98bd4" },
  { id: "nell", name: "Nell Fox", title: "The Skeptic", initials: "NF", color: "#d16d78" },
] as const;

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
  const [round, setRound] = useState(1);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [movesLeft, setMovesLeft] = useState(0);
  const [searchedThisTurn, setSearchedThisTurn] = useState(false);
  const [eventIndex, setEventIndex] = useState<number | null>(null);
  const [boardNotice, setBoardNotice] = useState(
    "Roll the brass die, then choose a glowing doorway.",
  );
  const [pawnRooms, setPawnRooms] = useState<Record<string, RoomId>>({
    you: "hall",
    iris: "observatory",
    theo: "kitchen",
    nell: "conservatory",
  });

  const evidenceCount = investigated.length;
  const canAccuse = evidenceCount >= 4;
  const activeRoomData = rooms.find((room) => room.id === activeRoom);
  const currentRoom =
    rooms.find((room) => room.id === pawnRooms.you) ?? rooms[4];
  const reachableRooms = currentRoom.neighbors;
  const hasRolled = diceValue !== null;
  const accusationComplete =
    selectedSuspect && selectedMethod && selectedLocation && selectedMotive;

  useEffect(() => {
    window.localStorage.setItem(
      "veil-preferences",
      JSON.stringify({ soundOn, largeText, reducedMotion, captionsOn }),
    );
  }, [soundOn, largeText, reducedMotion, captionsOn]);

  const clueProgress = useMemo(
    () => rooms.map((room) => investigated.includes(room.id)),
    [investigated],
  );

  const moveTo = (next: Scene) => {
    playChime(soundOn);
    setScene(next);
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
    setDiceRolling(true);
    setEventIndex(null);
    setBoardNotice("The die tumbles across the velvet...");
    playChime(soundOn);

    window.setTimeout(() => {
      const value = Math.floor(Math.random() * 4) + 2;
      setDiceValue(value);
      setMovesLeft(value);
      setDiceRolling(false);
      setBoardNotice(
        `Move up to ${value} rooms. Connected doorways are glowing.`,
      );
    }, reducedMotion ? 80 : 620);
  };

  const movePawn = (room: Room) => {
    if (!hasRolled || movesLeft < 1 || !reachableRooms.includes(room.id)) return;
    setPawnRooms((current) => ({ ...current, you: room.id }));
    setMovesLeft((current) => current - 1);
    setSearchedThisTurn(false);
    setBoardNotice(
      investigated.includes(room.id)
        ? `${room.name} has already yielded its strongest clue.`
        : `You entered the ${room.name}. Search it, or keep moving.`,
    );
    playChime(soundOn);
  };

  const searchCurrentRoom = () => {
    if (!hasRolled || searchedThisTurn) return;
    setSearchedThisTurn(true);
    setMovesLeft(0);
    inspectRoom(currentRoom);
    setBoardNotice(`${currentRoom.clue} was added to your private notebook.`);
  };

  const endBoardTurn = () => {
    const nextEvent = Math.floor(Math.random() * manorEvents.length);
    setEventIndex(nextEvent);
    setPawnRooms((current) => {
      const next = { ...current };
      for (const detective of detectives.slice(1)) {
        const room = rooms.find((item) => item.id === current[detective.id]);
        const choices = room?.neighbors ?? ["hall"];
        next[detective.id] =
          choices[Math.floor(Math.random() * choices.length)] ?? "hall";
      }
      return next;
    });
    setRound((current) => current + 1);
    setDiceValue(null);
    setMovesLeft(0);
    setSearchedThisTurn(false);
    setBoardNotice("The other detectives have moved. Your turn begins again.");
    playChime(soundOn);
  };

  const restartBoard = () => {
    setRound(1);
    setDiceValue(null);
    setMovesLeft(0);
    setSearchedThisTurn(false);
    setEventIndex(null);
    setInvestigated([]);
    setPawnRooms({
      you: "hall",
      iris: "observatory",
      theo: "kitchen",
      nell: "conservatory",
    });
    setBoardNotice("Roll the brass die, then choose a glowing doorway.");
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
        <section className="opening scene" aria-labelledby="opening-title">
          <div className="opening-crest" aria-hidden="true">
            <span className="crest-v">V</span>
            <span className="crest-line left" />
            <Eye className="crest-eye" size={31} strokeWidth={1.25} />
            <span className="crest-line right" />
          </div>
          <p className="eyebrow">An original social deduction mystery</p>
          <h1 id="opening-title">
            <span>Veil</span>
            <em>of</em>
            <span>Secrets</span>
          </h1>
          <p className="opening-copy">
            Every room remembers. Every witness edits the truth.
          </p>
          <div className="ornament" aria-hidden="true">
            <span />
            <i />
            <span />
          </div>
          <button className="primary-button opening-button" onClick={() => moveTo("rules")}>
            <span>Enter Blackthorn Manor</span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <button className="text-button" onClick={() => moveTo("menu")}>
            Skip prologue
          </button>
          <p className="opening-caption">
            <Flame size={14} aria-hidden="true" />
            Headphones recommended
          </p>
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
              <p className="eyebrow">Blackthorn table · Case 001</p>
              <h2 id="case-title">The Ashes in the Library</h2>
              <p>
                Roll, move room to room, and search before the Veil track reaches
                midnight. The other detectives are watching the same board.
              </p>
            </div>
            <div className="tabletop-header-actions">
              <button className="icon-button" onClick={restartBoard} aria-label="Restart board">
                <Shuffle size={18} />
              </button>
              <button className="notebook-button" onClick={() => setNotebookOpen(true)}>
                <BookOpen size={18} />
                <span>
                  Notebook
                  <small>{evidenceCount} of {rooms.length} clues</small>
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
                  <strong>{evidenceCount}/{rooms.length}</strong>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${(evidenceCount / rooms.length) * 100}%` }} />
                </div>
                <small>{canAccuse ? "A complete theory is now possible." : "Find four clues to unlock accusations."}</small>
              </div>
            </aside>

            <div className="manor-board-wrap">
              <div className="board-ribbon">
                <span><CircleDot size={14} /> Your pawn is in the {currentRoom.name}</span>
                <strong>{movesLeft > 0 ? `${movesLeft} moves left` : hasRolled ? "Choose an action" : "Awaiting roll"}</strong>
              </div>
              <div className="manor-board" aria-label="Interactive Blackthorn Manor board">
                <div className="board-fold vertical" aria-hidden="true" />
                <div className="board-fold horizontal" aria-hidden="true" />
                <div className="board-center-seal" aria-hidden="true">
                  <Eye size={22} />
                </div>
                {rooms.map((room) => {
                  const Icon = room.icon;
                  const found = investigated.includes(room.id);
                  const occupied = detectives.filter(
                    (detective) => pawnRooms[detective.id] === room.id,
                  );
                  const reachable =
                    hasRolled && movesLeft > 0 && reachableRooms.includes(room.id);
                  const current = pawnRooms.you === room.id;
                  return (
                    <button
                      key={room.id}
                      className={`board-room ${found ? "discovered" : ""} ${
                        reachable ? "reachable" : ""
                      } ${current ? "current" : ""}`}
                      style={{
                        gridArea: room.area,
                        "--room-hue": room.hue,
                      } as CSSProperties}
                      onClick={() => movePawn(room)}
                      disabled={!reachable}
                      aria-label={`${room.name}${current ? ", your current room" : ""}${
                        reachable ? ", reachable" : ""
                      }`}
                    >
                      <span className="board-room-icon">
                        <Icon size={17} strokeWidth={1.5} />
                      </span>
                      <span className="board-room-copy">
                        <strong>{room.name}</strong>
                        <small>{found ? room.clue : current ? "Search available" : "Unsearched"}</small>
                      </span>
                      {found && <Check className="clue-check" size={14} />}
                      <span className="pawn-cluster" aria-hidden="true">
                        {occupied.map((detective) => (
                          <i
                            key={detective.id}
                            title={detective.name}
                            style={{ "--player-color": detective.color } as CSSProperties}
                          >
                            {detective.initials.slice(0, 1)}
                          </i>
                        ))}
                      </span>
                      {reachable && <span className="doorway-pulse" />}
                    </button>
                  );
                })}
              </div>
              <p className="board-notice" aria-live="polite">
                <Footprints size={15} />
                {boardNotice}
              </p>
            </div>

            <aside className="action-console" aria-label="Turn actions">
              <div className="panel-label">
                <span>Action tray</span>
                <Dices size={15} />
              </div>
              <button
                className={`brass-die ${diceRolling ? "rolling" : ""}`}
                onClick={rollDice}
                disabled={hasRolled || diceRolling}
                aria-label={hasRolled ? `Rolled ${diceValue}` : "Roll the movement die"}
              >
                <span>{diceRolling ? "?" : diceValue ?? "ROLL"}</span>
                <small>{hasRolled ? "Movement" : "Brass die"}</small>
              </button>

              <div className="turn-actions">
                <button
                  className="table-action search-action"
                  onClick={searchCurrentRoom}
                  disabled={!hasRolled || searchedThisTurn}
                >
                  <Search size={18} />
                  <span>
                    <strong>Search room</strong>
                    <small>{currentRoom.name}</small>
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
                  <span>MANOR</span>
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
          <p className="eyebrow">Case 001 · Truth established</p>
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
              <span>Evidence {String(rooms.findIndex((room) => room.id === activeRoom) + 1).padStart(2, "0")}</span>
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
              {rooms.map((room, index) => (
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
