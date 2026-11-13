import { useCallback, useEffect, useMemo, useState } from "react";
import { searchByText, searchByFilters, getMeta } from "../api.js";
import { pillsFrom, withoutPill, withChange, NO_DATES, sentenceFrom } from "../filters.js";
import { SORT_LABELS, TERRAIN_PHRASES, joinList, villaCount, shortDate, weekdayName, nights, rupees, addDaysIso } from "../format.js";
import { whatsappLink, phoneLink, enquiryText } from "../contact.js";
import { useSpeech } from "../useSpeech.js";
import StayCard from "../components/StayCard.jsx";
import { Picker, WhereContent, DatesContent, GuestsContent, BudgetContent, AmenitiesContent } from "../components/Pickers.jsx";
import { Logo, SearchIcon, MicIcon, CloseIcon, ChevronIcon, PlusIcon, CalendarIcon, ChatIcon, PhoneIcon } from "../components/icons.jsx";

const FOLLOW_UPS = ["Now make it cheaper", "Also with a bonfire", "What about Goa instead", "Make it bigger"];

function whereWords(filters) {
  if (filters.locations.length) return ` in ${joinList(filters.locations)}`;
  if (filters.near) return ` within ${filters.maxHours || 4} hours of ${filters.near}`;
  if (filters.terrains.length) return ` ${TERRAIN_PHRASES[filters.terrains[0]] || ""}`;
  return "";
}

// A dated search where the guest named a weekday or a weekend is the one
// place the reading could be wrong, so it is said back once, with a fix
function clarifyFor(data) {
  if (!data?.stay || !["ai", "rules"].includes(data.source)) return null;
  const { when, dayOfWeek } = data.filters;
  const { checkIn, checkOut } = data.stay;
  if (when === "day_of_week" && dayOfWeek) {
    const day = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    return {
      text: `We read ${day} as this ${day}, ${shortDate(checkIn).replace(`${day} `, "")}.`,
      sub: `${nights(data.stay.nights)}, check out ${weekdayName(checkOut)}.`,
      options: [
        { label: `I meant ${shortDate(addDaysIso(checkIn, 7))}`, change: { ...NO_DATES, when: "specific", checkIn: addDaysIso(checkIn, 7), nights: data.stay.nights } },
        ...(data.stay.nights === 1 ? [{ label: "Make it 2 nights", change: { ...NO_DATES, when: "specific", checkIn, nights: 2 } }] : []),
      ],
    };
  }
  if (when === "this_weekend") {
    return {
      text: `This weekend means ${shortDate(checkIn)} to ${shortDate(checkOut)}.`,
      sub: nights(data.stay.nights),
      options: [{ label: "Next weekend instead", change: { ...NO_DATES, when: "next_weekend" } }],
    };
  }
  return null;
}

export default function ResultsPage({ initialQuery = "", initialFilters = null, onHome, onRemember }) {
  const [text, setText] = useState(initialQuery);
  const [followUp, setFollowUp] = useState("");
  const [data, setData] = useState(null);
  const [results, setResults] = useState([]);
  const [meta, setMeta] = useState({ amenities: {}, places: [], zones: [], areas: [], origins: [] });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [clarified, setClarified] = useState(false);

  const speech = useSpeech((spoken) => setText(spoken));

  const send = useCallback(async (call, { append = false } = {}) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setError("");
    try {
      const response = await call();
      setData((previous) => (append && previous ? { ...response, source: previous.source } : response));
      setResults((previous) => (append ? [...previous, ...response.results] : response.results));
      return response;
    } catch (problem) {
      setError(problem.message);
      if (!append) setResults([]);
      return null;
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    getMeta().then(setMeta).catch(() => {});
    if (initialFilters) send(() => searchByFilters(initialFilters));
    else if (initialQuery.trim()) send(() => searchByText(initialQuery.trim()));
    else send(() => searchByFilters({}));
    // Runs once, for the search this page was opened with
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [send]);

  // Filters set by hand: no parsing, and the address keeps them
  const runFilters = async (next, options = {}) => {
    const response = await send(() => searchByFilters(next, options));
    if (response) {
      onRemember({ filters: response.filters });
      setText(sentenceFrom(response.filters, response.stay, meta.amenities));
    }
  };
  const change = (patch) => runFilters(withChange(data?.filters, patch));

  // A sentence: the server decides if it is a follow up or a new trip
  const ask = async (sentence) => {
    const value = (sentence ?? text).trim();
    if (!value) return;
    setClarified(false);
    const response = await send(() => searchByText(value, { previousFilters: data?.filters || null }));
    if (!response) return;
    if (response.refined) {
      onRemember({ filters: response.filters });
      setText(sentenceFrom(response.filters, response.stay, meta.amenities));
    } else {
      onRemember({ query: value });
      setText(value);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pills = useMemo(() => pillsFrom(data?.filters, data?.stay, meta.amenities), [data, meta.amenities]);
  const clarify = clarified ? null : clarifyFor(data);
  const strictNothing = Boolean(data?.relaxed);
  const filters = data?.filters;
  const guests = filters?.guests;
  const firstLoad = loading && !data;
  const sentence = sentenceFrom(filters, data?.stay, meta.amenities) || text;
  const reasonsOf = (villa) => villa.matchReasons || [];

  const pillPanel = (pill, close) => {
    if (pill.kind === "where" || pill.kind === "terrain") return <WhereContent meta={meta} onPick={change} close={close} />;
    if (pill.kind === "dates") return <DatesContent stay={data.stay} onPick={change} close={close} />;
    if (pill.kind === "guests") return <GuestsContent filters={filters} onPick={change} close={close} />;
    if (pill.kind === "budget") return <BudgetContent filters={filters} guide={data.priceGuide} onPick={change} close={close} />;
    return <AmenitiesContent meta={meta} filters={filters} onPick={change} close={close} />;
  };

  return (
    <div className="results">
      <header className="results-header">
        <div className="results-header-row">
          <button type="button" className="brand" onClick={onHome} aria-label="Villa Search home">
            <Logo size={28} />
            <span className="brand-name">Villa Search</span>
          </button>
          <a className="btn-ghost" href={whatsappLink(enquiryText(sentence))} target="_blank" rel="noreferrer">
            <ChatIcon size={16} />
            Talk to us
          </a>
        </div>
        <form
          className="results-ask"
          onSubmit={(event) => {
            event.preventDefault();
            ask();
          }}
        >
          <SearchIcon size={20} />
          <label htmlFor="results-input" className="sr-only">
            Describe your trip, or say what to change
          </label>
          <input
            id="results-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={speech.listening ? "Listening" : "Describe your trip, or say what to change"}
            autoComplete="off"
            maxLength={300}
          />
          {text && (
            <button type="button" className="icon-btn" aria-label="Clear the sentence" onClick={() => setText("")}>
              <CloseIcon size={14} />
            </button>
          )}
          {speech.supported && (
            <button type="button" className={`mic mic-small ${speech.listening ? "is-on" : ""}`} aria-label={speech.listening ? "Stop listening" : "Say it out loud"} aria-pressed={speech.listening} onClick={speech.listening ? speech.stop : speech.start}>
              <MicIcon size={18} />
            </button>
          )}
          <button type="submit" className="results-go" disabled={loading}>
            Search
          </button>
        </form>
      </header>

      <main className="results-main">
        {clarify && (
          <div className="clarify" role="status">
            <span className="clarify-icon">
              <CalendarIcon size={18} />
            </span>
            <p>
              <strong>{clarify.text}</strong> <span>{clarify.sub}</span>
            </p>
            <div className="clarify-actions">
              <button type="button" className="btn-dark" onClick={() => setClarified(true)}>
                That is right
              </button>
              {clarify.options.map((option) => (
                <button key={option.label} type="button" className="btn-line" onClick={() => change(option.change)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {data && (
          <div className="pills-area">
            <div className="pills-head">
              <span>Tap a pill to change it, or the cross to drop it</span>
              <button type="button" className="link" onClick={() => runFilters({})}>
                Start over
              </button>
            </div>
            <ul className="pills">
              {pills.map((pill) => (
                <li key={pill.id}>
                  <Picker
                    align={pill.kind === "budget" || pill.kind === "amenity" ? "right" : "left"}
                    button={({ toggle, open }) => (
                      <span className={`pill ${open ? "is-open" : ""}`}>
                        <button type="button" className="pill-edit" aria-expanded={open} onClick={toggle}>
                          {pill.label}
                          <ChevronIcon size={12} />
                        </button>
                        <button type="button" className="pill-drop" aria-label={`Drop ${pill.label}`} onClick={() => runFilters(withoutPill(filters, pill.id))}>
                          <CloseIcon size={12} />
                        </button>
                      </span>
                    )}
                  >
                    {(close) => pillPanel(pill, close)}
                  </Picker>
                </li>
              ))}
              {!data.stay && (
                <li>
                  <Picker button={({ toggle }) => <button type="button" className="pill-add" onClick={toggle}><PlusIcon size={14} />Dates</button>}>
                    {(close) => <DatesContent stay={null} onPick={change} close={close} />}
                  </Picker>
                </li>
              )}
              {!guests && (
                <li>
                  <Picker button={({ toggle }) => <button type="button" className="pill-add" onClick={toggle}><PlusIcon size={14} />Guests</button>}>
                    {(close) => <GuestsContent filters={filters} onPick={change} close={close} />}
                  </Picker>
                </li>
              )}
              {!filters.maxPrice && (
                <li>
                  <Picker button={({ toggle }) => <button type="button" className="pill-add" onClick={toggle}><PlusIcon size={14} />Budget</button>}>
                    {(close) => <BudgetContent filters={filters} guide={data.priceGuide} onPick={change} close={close} />}
                  </Picker>
                </li>
              )}
              <li>
                <Picker align="right" button={({ toggle }) => <button type="button" className="pill-add" onClick={toggle}><PlusIcon size={14} />Must have</button>}>
                  {(close) => <AmenitiesContent meta={meta} filters={filters} onPick={change} close={close} />}
                </Picker>
              </li>
            </ul>
          </div>
        )}

        {error && <p className="notice is-error">{error}</p>}

        {strictNothing && (
          <section className="nothing">
            <div className="nothing-main">
              <h1>No villa fits all {pills.length > 1 ? pills.length : "of it"}</h1>
              <p>Change one thing and see what opens up.</p>
              {data.alternatives?.length > 0 ? (
                <ul>
                  {data.alternatives.map((option) => (
                    <li key={option.key}>
                      <div>
                        <strong>{option.label}</strong>
                        <span>{option.detail}</span>
                      </div>
                      <b>{villaCount(option.count)}</b>
                      <button type="button" className="btn-line" onClick={() => runFilters(option.filters)}>
                        Show
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="nothing-empty">No single change is enough here. The closest villas are below.</p>
              )}
            </div>
            <aside className="nothing-help">
              <h2>Rather have us look?</h2>
              <p>Send this search to the villa team. They know which owners can hold a date or add what you need, and reply on WhatsApp.</p>
              <a className="btn-sand" href={whatsappLink(enquiryText(sentence))} target="_blank" rel="noreferrer">
                <ChatIcon size={16} />
                Send on WhatsApp
              </a>
              {phoneLink && (
                <a className="btn-outline-light" href={phoneLink}>
                  <PhoneIcon size={16} />
                  Ask for a call back
                </a>
              )}
              <small>Your whole search goes with the message, so nobody asks you twice.</small>
            </aside>
          </section>
        )}

        {data && (
          <div className="results-bar">
            <p>
              <strong>{strictNothing ? "Closest we have" : `${villaCount(data.total)}${whereWords(filters)}`}</strong>
              <span>
                {strictNothing
                  ? `${data.relaxed.label}.`
                  : [
                      data.stay ? `free ${shortDate(data.stay.checkIn)}, ${nights(data.stay.nights)}` : null,
                      guests ? `for ${guests} guests` : null,
                      filters.sortBy === "relevance" ? "ranked by how well each one fits" : `sorted by ${SORT_LABELS[filters.sortBy]?.toLowerCase()}`,
                    ]
                      .filter(Boolean)
                      .join(", ")}
              </span>
            </p>
            {data.total > 0 && (
              <label className="sort">
                Sort by
                <select value={filters.sortBy} onChange={(event) => runFilters(filters, { sortBy: event.target.value })} disabled={loading}>
                  {Object.entries(SORT_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        <div className={`grid ${loading && !firstLoad ? "is-loading" : ""}`} aria-busy={loading}>
          {firstLoad
            ? [0, 1, 2].map((key) => <div key={key} className="stay stay-loading" aria-hidden="true" />)
            : results.map((villa, index) => (
                <StayCard
                  key={villa._id}
                  villa={villa}
                  tag={index === 0 && !strictNothing && filters.sortBy === "relevance" && data.total > 1 ? "Best match" : null}
                  flag={villa.available === false ? "Booked on your dates" : null}
                  reasons={reasonsOf(villa)}
                  guests={guests}
                  stay={data.stay}
                />
              ))}
        </div>

        {data?.hasMore && !firstLoad && (
          <div className="more">
            <button type="button" className="btn-line" onClick={() => send(() => searchByFilters(filters, { page: data.page + 1 }), { append: true })} disabled={loadingMore}>
              {loadingMore ? "Loading" : `Show more, ${data.total - results.length} left`}
            </button>
          </div>
        )}

        {data?.closeMatches?.length > 0 && (
          <section className="close">
            <div className="close-head">
              <h2>Close, but one thing is off</h2>
              <span>Everything else you asked for fits</span>
            </div>
            <div className="grid">
              {data.closeMatches.map((villa) => (
                <StayCard
                  key={villa._id}
                  villa={villa}
                  flag={villa.miss.kind === "dates" ? "Booked on your dates" : null}
                  note={villa.miss.kind === "price" ? `${rupees(villa.miss.over)} over your budget` : `Free on ${shortDate(villa.miss.nextFree)} instead`}
                  reasons={reasonsOf(villa).slice(0, 2)}
                  guests={guests}
                  stay={data.stay}
                  action={
                    villa.miss.kind === "dates"
                      ? { label: `Search ${shortDate(villa.miss.nextFree)}`, onClick: () => change({ ...NO_DATES, when: "specific", checkIn: villa.miss.nextFree, nights: data.stay.nights }) }
                      : { label: `Raise budget to ${rupees(Math.ceil(villa.pricePerNight / 1000) * 1000)}`, onClick: () => change({ maxPrice: Math.ceil(villa.pricePerNight / 1000) * 1000 }) }
                  }
                />
              ))}
            </div>
          </section>
        )}

        {data && (
          <section className="refine">
            <h2>Change something</h2>
            <p>Say only what changes. Everything else in this search stays.</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const value = followUp.trim();
                if (value) {
                  setFollowUp("");
                  ask(value);
                }
              }}
            >
              <label htmlFor="refine-input" className="sr-only">
                Change this search
              </label>
              <input id="refine-input" value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder="Now make it cheaper" autoComplete="off" maxLength={300} />
              <button type="submit" className="btn-dark" disabled={loading || !followUp.trim()}>
                Adjust
              </button>
            </form>
            <div className="refine-examples">
              {FOLLOW_UPS.map((example) => (
                <button key={example} type="button" onClick={() => ask(example)} disabled={loading}>
                  {example}
                </button>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="site-footer">
        <span>Villa Search, a prototype</span>
        <button type="button" className="link-quiet" onClick={onHome}>
          Back to home
        </button>
      </footer>
    </div>
  );
}
