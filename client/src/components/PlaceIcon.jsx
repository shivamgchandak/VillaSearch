// Line drawings for the destination row, one per kind of place
const PATHS = {
  hills: (
    <>
      <path d="M6 60 L26 22 L38 42 L46 30 L66 60 M22 30 L26 22 L30 30 M44 60 C46 50 50 44 52 44" />
      <path d="M40 14 l3 -3 3 3 M50 18 l2 -2 2 2" />
    </>
  ),
  beach: (
    <>
      <path d="M14 30 C20 14 44 12 52 28 Z M33 22 L42 58 M8 60 H64 M12 52 C20 48 28 52 36 50" />
      <circle cx="58" cy="14" r="5" />
    </>
  ),
  palm: (
    <>
      <path d="M34 62 C34 46 36 34 40 24 M40 24 C32 18 22 20 16 28 M40 24 C40 14 32 8 24 10 M40 24 C48 16 58 18 62 26 M40 24 C50 26 54 34 54 42 M8 62 H64" />
      <circle cx="44" cy="52" r="4" />
    </>
  ),
  river: <path d="M6 36 L22 16 L34 30 L44 20 L66 40 M20 62 C30 54 20 48 32 42 C42 38 38 34 44 30 M40 62 C46 56 42 50 52 46" />,
  forest: (
    <>
      <path d="M18 60 V48 M18 48 L8 48 L18 30 L28 48 Z M46 60 V50 M46 50 L34 50 L46 22 L58 50 Z M6 60 H66" />
      <path d="M56 12 c4 0 6 3 6 6 c-4 0 -6 -3 -6 -6z" />
    </>
  ),
  snow: <path d="M4 60 L30 14 L44 38 L52 28 L68 60 Z M22 28 L30 14 L38 28 L34 26 L30 30 L26 26 Z M26 60 V52 H36 V60" />,
  palace: <path d="M12 60 V36 H60 V60 M8 60 H64 M24 36 C24 26 48 26 48 36 M36 28 V22 M20 60 V48 C20 44 26 44 26 48 V60 M46 60 V48 C46 44 52 44 52 48 V60 M33 60 V46 C33 42 39 42 39 46 V60" />,
  dunes: (
    <>
      <path d="M4 56 C18 40 30 40 40 50 C48 42 58 42 68 54 M4 62 H68 M16 44 V30 M12 34 C12 30 16 30 16 34 M20 36 C20 32 16 32 16 36" />
      <circle cx="50" cy="20" r="8" />
    </>
  ),
  lake: <path d="M6 40 L20 22 L30 34 L42 18 L66 40 M8 48 H64 M16 55 H40 M44 55 H56 M24 61 H48" />,
};

export default function PlaceIcon({ kind }) {
  return (
    <span className="place-icon" aria-hidden="true">
      <span className="place-icon-blob" />
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {PATHS[kind] || PATHS.hills}
      </svg>
    </span>
  );
}
