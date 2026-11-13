import { useEffect, useRef, useState } from "react";
import { previewQuery, previewFilters } from "../api.js";
import { withChange, hasAnything, sentenceFrom } from "../filters.js";
import { rupees, shortDate, weekdayName, nights, joinList, TERRAIN_LABELS } from "../format.js";
import { useSpeech } from "../useSpeech.js";
import { Picker, WhereContent, DatesContent, GuestsContent, BudgetContent, AmenitiesContent, townsOf } from "./Pickers.jsx";
import { ChatIcon, CloseIcon, MicIcon, PinIcon, CalendarIcon, PeopleIcon, ArrowIcon, PlusIcon } from "./icons.jsx";

export const EXAMPLE = "Villa for 12 near Lonavala, pet friendly, private pool, under 40k for Saturday";

function whereOf(filters, meta) {
  if (filters?.locations.length) {
    const towns = filters.locations.flatMap((name) => townsOf(name, meta.places));
    const sub = towns.length > 3 ? `${towns.slice(0, 3).join(", ")} and more` : towns.join(", ");
    return { value: joinList(filters.locations), sub };
  }
  if (filters?.near) return { value: `Near ${filters.near}`, sub: `Within ${filters.maxHours || 4} hours by road` };
  if (filters?.terrains.length) return { value: filters.terrains.map((t) => TERRAIN_LABELS[t]).join(", "), sub: "Anywhere in India" };
  return { value: "Anywhere", sub: "Town, state or region" };
}

/**
 * Two ways to search in one panel. Guests who like to talk type or say a
 * sentence; guests who like forms use the fields. Each follows the other:
 * the sentence fills the fields, and changing a field rewrites the sentence.
 * Whichever the guest touched last decides how the search is sent.
 */
export default function SearchPanel({ meta, onSearch }) {
  const [text, setText] = useState("");
  const [filters, setFilters] = useState(null);
  const [stay, setStay] = useState(null);
  const [total, setTotal] = useState(null);
  const [origin, setOrigin] = useState("text");
  const inputRef = useRef(null);

  const speech = useSpeech((spoken) => {
    setOrigin("text");
    setText(spoken);
  });

  // The sentence fills the fields, a moment after typing stops
  useEffect(() => {
    if (origin !== "text") return undefined;
    const value = text.trim();
    if (value.length < 3) {
      setFilters(null);
      setStay(null);
      setTotal(null);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      previewQuery(value, controller.signal)
        .then((answer) => {
          setFilters(answer.filters);
          setStay(answer.stay);
          setTotal(answer.total);
        })
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, origin]);

  // A changed field rewrites the sentence
  const change = (patch) => {
    const next = withChange(filters, patch);
    setOrigin("fields");
    setFilters(next);
    previewFilters(next)
      .then((answer) => {
        setStay(answer.stay);
        setTotal(answer.total);
        setText(sentenceFrom(answer.filters, answer.stay, meta.amenities));
      })
      .catch(() => setText(sentenceFrom(next, null, meta.amenities)));
  };

  const submit = (event) => {
    event?.preventDefault();
    if (origin === "fields" && hasAnything(filters)) onSearch({ filters });
    else onSearch({ query: text.trim() || EXAMPLE });
  };

  const where = whereOf(filters, meta);
  const pets = filters?.amenities.includes("petFriendly");
  const musts = (filters?.amenities || []).filter((key) => key !== "petFriendly");
  const ready = hasAnything(filters) && total !== null;
  const label = ready && total > 0 ? `Show ${total} ${total === 1 ? "villa" : "villas"}` : "Search";

  return (
    <div className="panel">
      <div className="panel-top">
        <span className="panel-title">Ask in your own words</span>
        <span className="panel-hint">{speech.supported ? "Type it, or tap the mic and say it." : "Type it the way you would say it."}</span>
      </div>

      <form className="ask" onSubmit={submit}>
        <div className={`ask-box ${speech.listening ? "is-listening" : ""}`}>
          <ChatIcon size={20} />
          <label htmlFor="ask-input" className="sr-only">
            Describe your trip
          </label>
          <input
            id="ask-input"
            ref={inputRef}
            value={text}
            onChange={(event) => {
              setOrigin("text");
              setText(event.target.value);
            }}
            placeholder={speech.listening ? "Listening" : EXAMPLE}
            autoComplete="off"
            maxLength={300}
          />
          {text && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Clear the sentence"
              onClick={() => {
                setOrigin("text");
                setText("");
                inputRef.current?.focus();
              }}
            >
              <CloseIcon size={14} />
            </button>
          )}
        </div>
        {speech.supported && (
          <button
            type="button"
            className={`mic ${speech.listening ? "is-on" : ""}`}
            aria-label={speech.listening ? "Stop listening" : "Say your trip out loud"}
            aria-pressed={speech.listening}
            onClick={speech.listening ? speech.stop : speech.start}
          >
            <MicIcon size={22} />
          </button>
        )}
      </form>

      <div className="or-line">
        <span />
        or search by yourself
        <span />
      </div>

      <div className="fields">
        <Picker
          button={({ toggle, open }) => (
            <button type="button" className="field" aria-expanded={open} onClick={toggle}>
              <span className="field-icon">
                <PinIcon size={18} />
              </span>
              <span className="field-text">
                <span className="field-label">WHERE</span>
                <span className="field-value">{where.value}</span>
                <span className="field-sub">{where.sub}</span>
              </span>
            </button>
          )}
        >
          {(close) => <WhereContent meta={meta} onPick={change} close={close} />}
        </Picker>

        <Picker
          button={({ toggle, open }) => (
            <button type="button" className="field" aria-expanded={open} onClick={toggle}>
              <span className="field-icon">
                <CalendarIcon size={18} />
              </span>
              <span className="field-text">
                <span className="field-label">DATES</span>
                <span className="field-value">{stay ? shortDate(stay.checkIn) : "Add dates"}</span>
                <span className="field-sub">{stay ? `${nights(stay.nights)}, check out ${weekdayName(stay.checkOut)}` : "Any dates"}</span>
              </span>
            </button>
          )}
        >
          {(close) => <DatesContent stay={stay} onPick={change} close={close} />}
        </Picker>

        <Picker
          align="right"
          button={({ toggle, open }) => (
            <button type="button" className="field" aria-expanded={open} onClick={toggle}>
              <span className="field-icon">
                <PeopleIcon size={18} />
              </span>
              <span className="field-text">
                <span className="field-label">GUESTS</span>
                <span className="field-value">{filters?.guests ? `${filters.guests} guests` : "Add guests"}</span>
                <span className="field-sub">{pets ? "Pets coming along" : "No pets"}</span>
              </span>
            </button>
          )}
        >
          {(close) => <GuestsContent filters={filters} onPick={change} close={close} />}
        </Picker>

        <button type="button" className="go" onClick={submit}>
          {label}
          <ArrowIcon size={18} />
        </button>
      </div>

      <div className="musts">
        <div className="musts-list">
          <span className="musts-label">Must haves</span>
          {pets && (
            <span className="must">
              Pet friendly
              <button type="button" aria-label="Remove pet friendly" onClick={() => change({ amenities: filters.amenities.filter((a) => a !== "petFriendly") })}>
                <CloseIcon size={10} />
              </button>
            </span>
          )}
          {musts.map((key) => (
            <span key={key} className="must">
              {meta.amenities?.[key] || key}
              <button type="button" aria-label={`Remove ${meta.amenities?.[key] || key}`} onClick={() => change({ amenities: filters.amenities.filter((a) => a !== key) })}>
                <CloseIcon size={10} />
              </button>
            </span>
          ))}
          <Picker
            button={({ toggle, open }) =>
              filters?.maxPrice ? (
                <span className="must">
                  <button type="button" className="must-edit" aria-expanded={open} onClick={toggle}>
                    Up to {rupees(filters.maxPrice)} a night
                  </button>
                  <button type="button" aria-label="Remove the budget" onClick={() => change({ maxPrice: null, minPrice: null })}>
                    <CloseIcon size={10} />
                  </button>
                </span>
              ) : (
                <button type="button" className="must-add" aria-expanded={open} onClick={toggle}>
                  <PlusIcon size={14} />
                  Budget
                </button>
              )
            }
          >
            {(close) => <BudgetContent filters={filters} onPick={change} close={close} />}
          </Picker>
          <Picker
            button={({ toggle, open }) => (
              <button type="button" className="must-add" aria-expanded={open} onClick={toggle}>
                <PlusIcon size={14} />
                Add
              </button>
            )}
          >
            {(close) => <AmenitiesContent meta={meta} filters={filters} onPick={change} close={close} />}
          </Picker>
        </div>
        {hasAnything(filters) && (
          <span className="musts-note">
            <span className="dot" />
            {origin === "text" ? "Filled from your sentence. Change a field and the sentence follows." : "The sentence follows your fields."}
          </span>
        )}
      </div>
    </div>
  );
}
