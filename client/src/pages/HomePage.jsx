import { useEffect, useState } from "react";
import { getMeta, searchByFilters } from "../api.js";
import { emptyFilters } from "../filters.js";
import { whatsappLink, phoneLink, enquiryText } from "../contact.js";
import HeroScene from "../components/HeroScene.jsx";
import Scenery from "../components/Scenery.jsx";
import PlaceIcon from "../components/PlaceIcon.jsx";
import StayCard from "../components/StayCard.jsx";
import SearchPanel from "../components/SearchPanel.jsx";
import { Logo, PhoneIcon, ChatIcon, PinIcon } from "../components/icons.jsx";

const DESTINATIONS = [
  { name: "Lonavala", icon: "hills" },
  { name: "Alibaug", icon: "beach" },
  { name: "Goa", icon: "palm" },
  { name: "Karjat", icon: "river" },
  { name: "Coorg", icon: "forest" },
  { name: "Manali", icon: "snow" },
  { name: "Udaipur", icon: "palace" },
  { name: "Jaisalmer", icon: "dunes" },
  { name: "Shillong", icon: "lake" },
];

// Region tiles that show off the place guide. Each runs its sentence as a
// real search, so the parser is what turns "the seven sisters" into towns.
const REGIONS = [
  { name: "Hills up north", towns: "Manali, Shimla, Kasauli, Mussoorie, Nainital", kind: "mountain", say: "Mountains in north India for 8" },
  { name: "The North East", towns: "Shillong, Gangtok, Kaziranga", kind: "lake", say: "Somewhere in the seven sisters" },
  { name: "The Konkan side", towns: "Alibaug, Dapoli, Tarkarli, Goa, Gokarna", kind: "beach", say: "Beach house on the Konkan coast" },
  { name: "The desert", towns: "Jaisalmer and the Rann of Kutch", kind: "desert", say: "Villa near the desert" },
];

const CITY_KEY = "villa-search-city";
const savedCity = () => {
  try {
    return window.localStorage.getItem(CITY_KEY) || "Mumbai";
  } catch {
    return "Mumbai";
  }
};

export default function HomePage({ onSearch, onTeam }) {
  const [meta, setMeta] = useState({ amenities: {}, places: [], zones: [], areas: [], origins: [] });
  const [city, setCity] = useState(savedCity);
  const [near, setNear] = useState(null);

  useEffect(() => {
    getMeta().then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CITY_KEY, city);
    } catch {
      // A private window may refuse storage, the choice just is not remembered
    }
    setNear(null);
    searchByFilters({ ...emptyFilters(), near: city }, { pageSize: 4 })
      .then((data) => setNear(data.results))
      .catch(() => setNear([]));
  }, [city]);

  const talk = whatsappLink(enquiryText(""));

  return (
    <div className="home">
      <section className="hero">
        <HeroScene className="hero-art" />
        <div className="hero-shade" />

        <header className="site-header is-over">
          <a className="brand" href="/" aria-label="Villa Search home">
            <Logo size={30} />
            <span className="brand-text">
              <span className="brand-name">Villa Search</span>
              <span className="brand-line">SAY IT, STAY IT</span>
            </span>
          </a>
          <nav className="site-nav" aria-label="Main">
            <a href="#destinations">Destinations</a>
            <a href="#regions">Regions</a>
            <a href="#near">Near you</a>
          </nav>
          <div className="site-actions">
            <a className="btn-ghost" href={talk} target="_blank" rel="noreferrer">
              <PhoneIcon size={16} />
              Talk to us
            </a>
          </div>
        </header>

        <div className="hero-copy">
          <p className="eyebrow">PRIVATE VILLAS FOR FAMILIES AND GROUPS, ACROSS INDIA</p>
          <h1>
            Tell us the trip.
            <br />
            <em>We will find the villa.</em>
          </h1>
        </div>
      </section>

      <section className="panel-wrap" aria-label="Search villas">
        <SearchPanel meta={meta} onSearch={onSearch} />
        <div className="help-strip">
          <span>Planning for a big group or a special date? Our villa team plans it with you.</span>
          <span className="help-links">
            <a href={talk} target="_blank" rel="noreferrer">
              <ChatIcon size={16} />
              Chat on WhatsApp
            </a>
            {phoneLink && (
              <a href={phoneLink}>
                <PhoneIcon size={16} />
                Request a call back
              </a>
            )}
          </span>
        </div>
      </section>

      <section className="section" id="destinations">
        <div className="section-head">
          <h2>Pick a destination</h2>
        </div>
        <div className="places">
          {DESTINATIONS.map((place) => (
            <button key={place.name} type="button" className="place" onClick={() => onSearch({ filters: { ...emptyFilters(), locations: [place.name] } })}>
              <PlaceIcon kind={place.icon} />
              <span>{place.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="section" id="regions">
        <div className="section-head">
          <div>
            <h2>
              Or just <em>say a region</em>
            </h2>
            <p>Hills up north, the North East, the Konkan side, the desert. Say it however you like, we know which towns it covers.</p>
          </div>
        </div>
        <div className="regions">
          {REGIONS.map((region) => (
            <button key={region.name} type="button" className="region" onClick={() => onSearch({ query: region.say })}>
              <Scenery kind={region.kind} className="region-art" />
              <span className="region-shade" />
              <span className="region-text">
                <span className="region-name">{region.name}</span>
                <span className="region-towns">{region.towns}</span>
                <span className="region-say">Try: {region.say}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="section" id="near">
        <div className="section-head">
          <div>
            <h2>Homes near you</h2>
            <p className="near-city">
              <PinIcon size={14} />
              <label htmlFor="near-city">Close to</label>
              <select id="near-city" value={city} onChange={(event) => setCity(event.target.value)}>
                {(meta.origins.length ? meta.origins : ["Mumbai"]).map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </p>
          </div>
          <button type="button" className="view-all" onClick={() => onSearch({ filters: { ...emptyFilters(), near: city } })}>
            VIEW ALL
            <svg width="34" height="12" viewBox="0 0 34 12" fill="none" aria-hidden="true">
              <path d="M0 6h32M27 1l5 5-5 5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>
        <div className="stays">
          {near
            ? near.map((villa) => (
                <StayCard key={villa._id} villa={villa} tag={villa.rating >= 4.8 ? "Guest favourite" : null} onPick={(picked) => onSearch({ filters: { ...emptyFilters(), locations: [picked.region] } })} />
              ))
            : [0, 1, 2, 3].map((key) => <div key={key} className="stay stay-loading" aria-hidden="true" />)}
        </div>
      </section>

      <footer className="site-footer">
        <span>Villa Search, a prototype</span>
        <button type="button" className="link-quiet" onClick={onTeam}>
          For the villa team
        </button>
      </footer>
    </div>
  );
}
