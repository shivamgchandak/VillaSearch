import { useEffect, useState } from "react";
import { getInsights } from "../api.js";
import { Logo, BackIcon } from "../components/icons.jsx";

// For the villa company, not for guests: every sentence typed into search,
// read back as demand. Where supply falls short, and which words the search
// could not place yet.
export default function TeamPage({ onHome }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    getInsights(days)
      .then(setData)
      .catch((problem) => setError(problem.message));
  }, [days]);

  const kpis = data
    ? [
        { label: "Searches", value: data.searches.toLocaleString("en-IN"), note: "Sentences typed, not clicks" },
        { label: "Ended with nothing", value: `${data.nothingShare}%`, note: `${data.nothingCount} searches found no exact fit` },
        { label: "Wanted pets allowed", value: `${data.petShare}%`, note: `${data.petVillas} of ${data.totalVillas} villas allow pets` },
        { label: "Typical group", value: data.medianGuests ? `${data.medianGuests} guests` : "Not yet", note: "The middle group size asked for" },
      ]
    : [];

  return (
    <div className="team">
      <header className="team-header">
        <div className="team-header-row">
          <span className="brand">
            <Logo size={28} />
            <span className="brand-name">Villa Search</span>
            <span className="team-for">for the team</span>
          </span>
          <button type="button" className="btn-ghost" onClick={onHome}>
            <BackIcon size={16} />
            Guest site
          </button>
        </div>
      </header>

      <main className="team-main">
        <div className="team-title">
          <div>
            <h1>What guests asked for</h1>
            <p>Every sentence typed into search, read back as demand you can plan supply around</p>
          </div>
          <label className="sort">
            Period
            <select value={days} onChange={(event) => setDays(Number(event.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>

        {error && <p className="notice is-error">{error}</p>}
        {!data && !error && <p className="team-wait">Reading the searches</p>}

        {data && data.searches === 0 && (
          <p className="notice">No searches in this period yet. Run a few from the guest site and they show up here.</p>
        )}

        {data && data.searches > 0 && (
          <>
            <div className="kpis">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="kpi">
                  <p>{kpi.label}</p>
                  <strong>{kpi.value}</strong>
                  <span>{kpi.note}</span>
                </div>
              ))}
            </div>

            <div className="team-split">
              <section className="team-card">
                <h2>Asked for often, few villas to offer</h2>
                <p>Where adding or signing a villa would turn searches into bookings</p>
                <table className="gaps">
                  <thead>
                    <tr>
                      <th scope="col">Request</th>
                      <th scope="col">Searches</th>
                      <th scope="col">Villas that fit</th>
                      <th scope="col">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.gaps.map((row) => (
                      <tr key={row.request}>
                        <td>{row.request}</td>
                        <td>{row.searches}</td>
                        <td>{row.villas}</td>
                        <td>
                          <span className="bar">
                            <span style={{ width: `${row.gap}%` }} />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className="team-card">
                <h2>Words we could not place</h2>
                <p>Add these to the place guide or the amenities and every future guest benefits</p>
                {data.words.length ? (
                  <ul className="words">
                    {data.words.map((word) => (
                      <li key={word.word}>
                        <strong>{word.word}</strong>
                        <span>
                          {word.count} {word.count === 1 ? "search" : "searches"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Every word was understood.</p>
                )}
              </section>
            </div>

            {data.zones.length > 0 && (
              <section className="team-card">
                <h2>Where searches point</h2>
                <ul className="zones">
                  {data.zones.map((zone) => (
                    <li key={zone.name}>
                      <span>{zone.name}</span>
                      <span className="bar">
                        <span style={{ width: `${zone.pct}%` }} />
                      </span>
                      <b>{zone.pct}%</b>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
