import { useEffect, useMemo, useRef, useState } from "react";
import { NO_DATES } from "../filters.js";
import { rupees, todayIso, shortDate } from "../format.js";

/**
 * A button that opens a small panel below it. Closes on Escape or a click
 * outside. `button` renders the trigger, `children` the panel, and both get
 * what they need to open and close it.
 */
export function Picker({ button, children, align = "left", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <div className={`picker ${className}`} ref={ref}>
      {button({ open, toggle: () => setOpen((value) => !value) })}
      {open && (
        <div className={`popover popover-${align}`} role="dialog">
          {children(close)}
        </div>
      )}
    </div>
  );
}

// Which of our towns a place name covers, for the line under a choice
export function townsOf(name, places = []) {
  return places
    .filter((p) => p.city === name || p.region === name || p.state === name || p.zone === name || p.areas?.includes(name))
    .map((p) => p.city);
}

const preview = (towns) => (towns.length > 3 ? `${towns.slice(0, 3).join(", ")} and ${towns.length - 3} more` : towns.join(", "));

export function WhereContent({ meta, onPick, close }) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const places = meta.places || [];
    const regions = [...new Set(places.map((p) => p.region))];
    return [
      { title: "Regions", names: [...(meta.areas || []), ...(meta.zones || [])] },
      { title: "Towns", names: regions },
      { title: "Close to a city", names: meta.origins || [], near: true },
    ];
  }, [meta]);

  const match = (name) => name.toLowerCase().includes(query.trim().toLowerCase());
  const pick = (change) => {
    onPick(change);
    close();
  };

  return (
    <div className="pick-where">
      <label className="sr-only" htmlFor="where-find">
        Find a place
      </label>
      <input id="where-find" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Town, state or region" />
      <div className="pick-list">
        <button type="button" onClick={() => pick({ locations: [], near: null, maxHours: null })}>
          <strong>Anywhere</strong>
          <span>Every villa we have</span>
        </button>
        {groups.map((group) => {
          const names = group.names.filter(match);
          if (!names.length) return null;
          return (
            <div key={group.title}>
              <p className="pick-group">{group.title}</p>
              {names.map((name) =>
                group.near ? (
                  <button key={name} type="button" onClick={() => pick({ near: name, maxHours: null, locations: [] })}>
                    <strong>Near {name}</strong>
                    <span>Within about 4 hours by road</span>
                  </button>
                ) : (
                  <button key={name} type="button" onClick={() => pick({ locations: [name], near: null, maxHours: null })}>
                    <strong>{name}</strong>
                    <span>{preview(townsOf(name, meta.places))}</span>
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DatesContent({ stay, onPick, close }) {
  const [checkIn, setCheckIn] = useState(stay?.checkIn || todayIso());
  const [count, setCount] = useState(stay?.nights || 1);
  const pick = (change) => {
    onPick(change);
    close();
  };

  return (
    <div className="pick-dates">
      <div className="pick-quick">
        <button type="button" onClick={() => pick({ ...NO_DATES, when: "day_of_week", dayOfWeek: "saturday", nights: 1 })}>
          This Saturday
        </button>
        <button type="button" onClick={() => pick({ ...NO_DATES, when: "this_weekend" })}>
          This weekend
        </button>
        <button type="button" onClick={() => pick({ ...NO_DATES, when: "next_weekend" })}>
          Next weekend
        </button>
        <button type="button" onClick={() => pick({ ...NO_DATES })}>
          Any dates
        </button>
      </div>
      <div className="pick-row">
        <label>
          Check in
          <input type="date" min={todayIso()} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} />
        </label>
        <Stepper label="Nights" value={count} min={1} max={14} onChange={setCount} />
      </div>
      <p className="pick-hint">{checkIn ? `${shortDate(checkIn)}, ${count} ${count === 1 ? "night" : "nights"}` : ""}</p>
      <div className="pick-actions">
        <button type="button" className="btn-primary" onClick={() => pick({ ...NO_DATES, when: "specific", checkIn, nights: count })}>
          Use these dates
        </button>
      </div>
    </div>
  );
}

export function Stepper({ label, value, min, max, onChange }) {
  return (
    <div className="stepper">
      <span>{label}</span>
      <div>
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
          −
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
          +
        </button>
      </div>
    </div>
  );
}

export function GuestsContent({ filters, onPick, close }) {
  const [count, setCount] = useState(filters?.guests || 2);
  const [pets, setPets] = useState(Boolean(filters?.amenities.includes("petFriendly")));
  const apply = () => {
    const others = (filters?.amenities || []).filter((item) => item !== "petFriendly");
    onPick({ guests: count, amenities: pets ? [...others, "petFriendly"] : others });
    close();
  };
  return (
    <div className="pick-guests">
      <Stepper label="Guests" value={count} min={1} max={40} onChange={setCount} />
      <label className="pick-check">
        <input type="checkbox" checked={pets} onChange={(event) => setPets(event.target.checked)} />
        Pets are coming along
      </label>
      <div className="pick-actions">
        <button type="button" className="btn-primary" onClick={apply}>
          Done
        </button>
      </div>
    </div>
  );
}

// The budget ceiling, with how villas in this search spread by price when
// the server sent that along
export function BudgetContent({ filters, guide, onPick, close }) {
  const [max, setMax] = useState(filters?.maxPrice || 40000);
  const peak = guide ? Math.max(1, ...guide.bands.map((band) => band.count)) : 1;
  const pick = (change) => {
    onPick(change);
    close();
  };
  return (
    <div className="pick-budget">
      <div className="pick-budget-head">
        <strong>Budget a night</strong>
        <span>
          Up to <b>{rupees(max)}</b>
        </span>
      </div>
      {guide && (
        <div className="pick-bars" aria-hidden="true">
          {guide.bands.map((band) => (
            <span key={band.from} style={{ height: `${8 + (band.count / peak) * 48}px` }} className={band.from < max ? "is-in" : ""} />
          ))}
        </div>
      )}
      <label className="sr-only" htmlFor="budget-range">
        Budget a night
      </label>
      <input id="budget-range" type="range" min="5000" max="60000" step="1000" value={max} onChange={(event) => setMax(Number(event.target.value))} />
      <div className="pick-scale">
        <span>{rupees(5000)}</span>
        <span>{rupees(60000)}</span>
      </div>
      {guide?.nextStep && filters?.maxPrice === max && (
        <p className="pick-hint">
          Raise it to <b>{rupees(guide.nextStep.price)}</b> for {guide.nextStep.extra} more {guide.nextStep.extra === 1 ? "villa" : "villas"}.
        </p>
      )}
      <div className="pick-actions">
        <button type="button" className="btn-quiet" onClick={() => pick({ maxPrice: null, minPrice: null })}>
          Any budget
        </button>
        <button type="button" className="btn-primary" onClick={() => pick({ maxPrice: max })}>
          Use this budget
        </button>
      </div>
    </div>
  );
}

export function AmenitiesContent({ meta, filters, onPick, close }) {
  const [chosen, setChosen] = useState(new Set(filters?.amenities || []));
  const toggle = (key) =>
    setChosen((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return (
    <div className="pick-amenities">
      <p className="pick-group">Must haves</p>
      <div className="pick-grid">
        {Object.entries(meta.amenities || {}).map(([key, label]) => (
          <label key={key} className="pick-check">
            <input type="checkbox" checked={chosen.has(key)} onChange={() => toggle(key)} />
            {label}
          </label>
        ))}
      </div>
      <div className="pick-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            onPick({ amenities: [...chosen] });
            close();
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
