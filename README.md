# Villa search

Type a trip the way you would say it out loud and get matching villas.

> Villa for 12 near Lonavala, pet friendly, private pool, under 40k for Saturday

becomes 12 guests, the Lonavala region, pet friendly, a private pool, up to
₹40,000 a night, free on the coming Saturday, ranked by how well each villa
answers the request.

Then you can keep talking to it. "Now make it cheaper" carries the whole
search over and only changes the budget.

Built with MongoDB, Express, React and Node.

## What you need

* Node 18 or newer
* A MongoDB database, either a free Atlas cluster or MongoDB running on your
  own machine
* Optionally a Groq key, free from https://console.groq.com/keys. Without one
  the keyword parser answers every query and nothing breaks.

## Setting up the database

Free Atlas cluster, which is what this was built against:

1. Create a cluster at https://cloud.mongodb.com
2. Database Access, add a database user, copy the password
3. Network Access, add your current address, or 0.0.0.0/0 while you are testing
4. Database, Connect, Drivers, copy the connection string
5. Put the database name before the question mark, otherwise everything lands
   in a database called test

```
mongodb+srv://user:password@cluster0.abcde.mongodb.net/villa_search?retryWrites=true&w=majority
```

If your password contains a symbol, percent encode it. An @ becomes %40.

Running MongoDB yourself instead:

```
mongodb://127.0.0.1:27017/villa_search
```

## Running it

```bash
# API
cd server
cp .env.example .env          # paste your connection string into MONGODB_URI
npm install
npm run check-env             # confirms every value before you start
npm run seed                  # loads 61 villas with bookings for the next 60 days
npm run dev                   # http://localhost:5050

# Web app, in a second terminal
cd client
npm install
npm run dev                   # http://localhost:5173
```

The web app talks to the API through the dev server, so both run on one
address and there is no cross origin setup to do.

## Environment variables

Everything lives in `server/.env` apart from the address the browser calls,
which lives in `client/.env.local`. Only `MONGODB_URI` has no default. The
server refuses to start on a bad value and names the one that is wrong.

### server/.env

| Variable | Default | What it does |
| --- | --- | --- |
| `MONGODB_URI` | none, required | Connection string. Local or Atlas. |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | `8000` | How long to wait for the cluster. Raise it on a slow connection. |
| `MONGODB_MAX_POOL_SIZE` | `10` | Connection pool size. |
| `MONGODB_CONNECT_RETRIES` | `3` | Retries on the first connection, which a sleeping Atlas cluster often needs. |
| `MONGODB_AUTO_INDEX` | `true` in development | Build indexes on start. Switch off against a production cluster. |
| `PORT` | `5050` | Port the API listens on. Port 5000 is taken by the AirPlay Receiver on macOS. |
| `HOST` | `0.0.0.0` | Address the API binds to. |
| `NODE_ENV` | `development` | One of development, test, production. |
| `CORS_ORIGIN` | `*` | Comma separated list of addresses allowed to call the API. |
| `BODY_LIMIT` | `20kb` | Largest accepted request body. |
| `TRUST_PROXY` | `false` | Switch on behind a proxy so the rate limiter sees the real visitor. |
| `SHUTDOWN_TIMEOUT_MS` | `10000` | How long open requests get when the process is asked to stop. |
| `GROQ_API_KEY` | empty | Model key. Leave empty to run on the keyword parser alone. |
| `LLM_ENABLED` | `true` | Set to false to force the keyword parser even with a key. Useful for showing the fallback. |
| `GROQ_BASE_URL` | Groq | Any endpoint that speaks the OpenAI chat completions shape. |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | First model tried. |
| `GROQ_FALLBACK_MODEL` | `llama-3.1-8b-instant` | Tried only if the first one fails or times out. |
| `LLM_TIMEOUT_MS` | `5000` | Per model timeout. |
| `LLM_MAX_OUTPUT_TOKENS` | `500` | Ceiling on the answer size. |
| `LLM_TEMPERATURE` | `0` | Kept at zero so the same sentence always parses the same way. |
| `SEARCH_PAGE_SIZE` | `12` | Results per page. |
| `SEARCH_MAX_PAGE_SIZE` | `48` | Largest page a client may ask for. |
| `SEARCH_CANDIDATE_LIMIT` | `240` | How many villas are pulled before ranking and paging. |
| `SEARCH_MAX_QUERY_LENGTH` | `300` | Longest accepted search text. |
| `SEARCH_RELAX_WHEN_EMPTY` | `true` | Loosen one filter at a time rather than show an empty page. |
| `PARSE_CACHE_ENABLED` | `true` | Repeat searches skip the model call. |
| `PARSE_CACHE_TTL_MS` | `600000` | How long a parse stays cached. |
| `PARSE_CACHE_MAX_ENTRIES` | `500` | Cache size, oldest entry drops out first. |
| `RATE_LIMIT_ENABLED` | `true` | Counted per visitor address. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Window length. |
| `RATE_LIMIT_MAX` | `60` | Requests allowed in that window. |
| `LOG_REQUESTS` | `true` | One line per request with its duration. |
| `LOG_SLOW_REQUEST_MS` | `800` | Requests above this are flagged in the log. |
| `SEED_BOOKING_HORIZON_DAYS` | `60` | How far ahead the seeded bookings run. |
| `SEED_RANDOM_SEED` | `42` | Makes the seeded bookings identical every run. |

### client/.env.local

| Variable | Default | What it does |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Where the browser sends searches. Use a full address when the API is deployed separately. |
| `VITE_API_PROXY_TARGET` | `http://localhost:5050` | Where the dev server forwards `/api`. |
| `VITE_PORT` | `5173` | Port for the dev server. |

Vite only exposes variables beginning with `VITE_` to the browser, so no
secret belongs in that file. The model key stays on the server.

## How a search flows

1. `POST /api/search { query }`
2. The model is asked for JSON filters. The main model first, then a lighter
   one, each with a timeout. With no key, or when both calls fail, the keyword
   parser answers instead. The response says which one understood it.
3. Whatever comes back goes through one sanitiser. Only known keys and known
   values survive, so nothing else in the system has to care where the filters
   came from.
4. Date intent becomes real dates in Indian time. The model says "this weekend",
   the code works out which Saturday that is.
5. The database query is built from the sanitised filters: group size range,
   place by city or region or state, terrain, every requested amenity, price
   per night, and no booked night inside the stay.
6. Results are ranked by how well each villa answers the request, and paged.
7. If nothing matched, one constraint is dropped at a time and the page says
   which one was loosened.

## How places are understood

People rarely name a town. They say "mountains in north India", "somewhere
in the north east", "the Konkan side" or "near the desert". None of that is
handled by a rule for each phrase. It is handled by a place guide in
`server/services/geography.js`, and every name in it turns into a plain list
of towns before the database is asked anything.

| Kind of name | Examples | Becomes |
| --- | --- | --- |
| Town | Manali, Tarkarli | that town |
| Region | Lonavala, Goa | the towns grouped under it |
| State | Kerala, Sikkim | every town in that state |
| Zone | North India, North East India, South India | every town in the states of that zone |
| Area | Himalayas, Western Ghats, Konkan coast, Thar desert, Rann of Kutch | every town tagged with that landscape |
| Home city | Mumbai, Pune, Delhi, Bengaluru | every town inside a drive of it, four hours unless the guest says otherwise |

A landscape word such as mountains, beach or desert is a terrain, and it
stacks on top of the place. "Mountains in north India" is the North India
towns that are also mountain towns, so Manali, Shimla, Kasauli, Mussoorie,
Nainital and Rishikesh, and never Jaipur.

The model is handed the whole guide and uses its own knowledge of India to
connect loose wording to it. "Seven sisters" is North East India, "sand
dunes" is the desert, "Malvan" is Tarkarli. It can only answer with names in
the guide, and the sanitiser drops anything else, so it can never invent a
place. The keyword parser reads the same guide, so the common ways of saying
a region work with no model key too.

Adding a new part of the country is a data change: a line in `PLACES` with
its state, landscapes, areas and map position, and villas in `data/villas.js`.
The prompt does not change.

Drive times from a home city are estimated from the straight line distance,
stretched for winding roads at an average road speed. They are there to rank
and to say "about 2 hours by road from Mumbai" on a card, not to navigate by.

## Follow up searches

The second box under the results carries the last search forward.

| You say | What changes |
| --- | --- |
| Now make it cheaper | The budget drops by a quarter. With no budget set it sorts by price instead. |
| Also with a bonfire | Bonfire joins the amenities already asked for. |
| What about Goa instead | Goa replaces Lonavala, everything else stays. |
| Make it bigger | Two more guests. |
| Somewhere closer | One hour less from the home city. |
| Anywhere is fine | The place and the home city come off. |
| Without a pool | The pool comes off. |
| Any budget | The price limit comes off. |

Amenities add up because asking for a pool after a bonfire means both. A place
replaces the previous one, because naming Goa after Lonavala means instead of,
not as well as.

## Slightly over budget

A budget that leaves fewer than four villas is often just a little too tight.
When that happens the response also carries up to four villas priced no more
than a quarter above the budget, as `overBudget`. Everything else about them
still fits. The current screen does not show them yet.

## Why the results are in that order

Sorting by popularity alone puts the same villas at the top of every search. A
match score is worked out per villa from the parts the guest actually asked
about: whether it is free on those nights, how close the size is to the group,
how many of the amenities it has, where the price sits against the budget, the
terrain, and finally its reviews. Each card carries the two or three reasons
that decided it.

The explicit sorts, price and rating, stay exactly as they say.

## Decisions worth knowing

* **The model never runs the search.** It only turns a sentence into JSON.
  Everything it produces is filtered down to known values before a query is
  built, so it cannot inject a database operator or invent a place.
* **The model never does date arithmetic.** It reports intent, such as
  "this weekend", and the code counts the days. Language models are unreliable
  at counting.
* **It works with no key at all.** The keyword parser is the fallback, not a
  toy. Every rule it uses comes from the same vocabulary file the model prompt
  is built from, so the two stay in step.
* **Places are data, not prompt rules.** Towns, regions, states, zones, areas
  and home cities all live in the place guide, and all of them become a list of
  towns before the query is built. See How places are understood above.
* **Terrain is separate from place.** Near mountains searches every mountain
  villa in the country. Near the beach returns every beach town, from Alibaug
  and the Konkan coast down to Gokarna and Pondicherry.
* **Group size ceiling.** A group of 4 is not shown an 18 guest estate first.
* **Weekend** means Saturday check in, Monday check out.
* **Budget** is per night.
* **The filters are visible and editable.** Removing a chip reruns the search
  without asking the model again.

## Scripts

Inside `server`:

| Command | What it does |
| --- | --- |
| `npm run check-env` | Validates `.env` and prints what the server will use. |
| `npm run seed` | Wipes and reloads the villas, then builds the indexes. |
| `npm run dev` | Runs the API and restarts on a change. |
| `npm start` | Runs the API once. |
| `npm test` | 98 checks over the parsers, place guide, dates, sanitiser, query builder, ranking and follow ups. |
| `npm run try "villa for 6 near hills"` | Parses one query in the terminal, no database needed. |

Inside `client`: `npm run dev`, `npm run build`, `npm run preview`.

## Endpoints

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| POST | `/api/search` | `{ query }` | Understand the sentence, then search. |
| POST | `/api/search` | `{ query, previousFilters }` | A follow up on the last search. |
| POST | `/api/search` | `{ filters }` | Search with edited chips, no parsing. |
| POST | `/api/search` | `{ page, pageSize, sortBy }` | Combines with any of the above. |
| POST | `/api/preview` | `{ query }` | Keyword parser and a count only, no model call. Meant for a live read out while typing. |
| GET | `/api/meta` | | Labels and places the interface needs. |
| GET | `/api/health` | | Database state, parsing mode, cache size, uptime. |

## Structure

```
server/
  index.js                 starts everything and stops cleanly
  app.js                   the express app on its own, so it can be tested
  config/env.js            every environment variable, read and checked once
  db/connect.js            connection with retries and readable failures
  middleware/              request log, rate limit, error handling
  models/Villa.js          schema and the indexes the searches actually use
  routes/search.js         search, meta and health
  services/
    vocabulary.js          towns, terrains, amenities, one source for both parsers
    geography.js           the place guide: zones, areas, home cities, drive times
    llmParser.js           the model call, with a fallback model and a timeout
    ruleParser.js          keyword and pattern fallback
    parseQuery.js          model first, rules second, cache in front
    filters.js             the sanitiser and the follow up merge
    refine.js              reads follow ups such as cheaper or without a pool
    dates.js               date intent into real dates
    query.js               the database query, kept free of database imports
    scoring.js             the match score and the reasons on each card
    search.js              runs the query, ranks, pages, relaxes
    cache.js               short lived parse cache
  data/                    the dummy catalogue and the seed builder
  scripts/                 test suite, parser preview, environment check
client/
  src/App.jsx              the one screen
  src/api.js               the only place that calls the API
  src/components/          chips, villa card, loading card, drawn scenery
```

## Deploying

The API is a plain Node process, so anything that runs Node works. Set the
same variables in the host's dashboard, point `MONGODB_URI` at Atlas, set
`NODE_ENV=production`, set `CORS_ORIGIN` to the address of the deployed web
app, and set `TRUST_PROXY=true` so the rate limiter sees real visitors.

The web app is a static build. Run `npm run build` in `client` with
`VITE_API_BASE_URL` set to the full address of the deployed API, and serve
`dist`.

## Not built yet

* Semantic search, so that romantic or quiet find something sensible.
* Real photographs. The scenery on each card is drawn in code, which keeps the
  prototype offline and free of stock images.
* Anything to do with accounts, payments or a real booking calendar.
