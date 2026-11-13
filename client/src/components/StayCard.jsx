import Scenery from "./Scenery.jsx";
import { BedIcon, CarIcon, PeopleIcon, AlertIcon } from "./icons.jsx";
import { rupees, perPerson, nights } from "../format.js";

/**
 * One villa. Used on the home page and in results.
 *   tag       a label on the picture, such as "Guest favourite"
 *   flag      a warning on the picture, such as "Booked on your dates"
 *   reasons   why this villa is here
 *   note      the one thing that is off, for close matches
 *   guests    the group size, to show what each person pays
 *   stay      the dates searched, to show the total for the stay
 *   action    one button, such as switching to the dates a villa is free
 */
export default function StayCard({ villa, tag, flag, reasons = [], note, guests, stay, onPick, action }) {
  const drive = villa.driveHours ? Math.max(1, Math.round(villa.driveHours)) : null;
  const each = perPerson(villa.pricePerNight, guests);

  return (
    <article className="stay">
      <div className="stay-art">
        <Scenery terrains={villa.terrains} className="stay-scene" />
        {tag && <span className="stay-tag">{tag}</span>}
        {flag && <span className="stay-flag">{flag}</span>}
      </div>
      <div className="stay-body">
        <div className="stay-head">
          <div>
            <h3>{villa.name}</h3>
            <p className="stay-place">
              {villa.city}, {villa.state}
            </p>
          </div>
          <div className="stay-price">
            <strong>{rupees(villa.pricePerNight)}</strong>
            <span>a night</span>
          </div>
        </div>

        <ul className="stay-facts">
          <li>
            <PeopleIcon size={16} />
            {villa.maxGuests} guests
          </li>
          <li>
            <BedIcon size={16} />
            {villa.bedrooms} bedrooms
          </li>
          <li className="stay-rating" title={`${villa.reviewCount} reviews`}>
            {villa.rating.toFixed(1)} <span>({villa.reviewCount})</span>
          </li>
        </ul>

        {drive && (
          <p className="stay-drive">
            <CarIcon size={16} />
            About {drive} {drive === 1 ? "hour" : "hours"} by road
          </p>
        )}

        {reasons.length > 0 && (
          <ul className="stay-reasons">
            {reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        )}

        {note && (
          <p className="stay-note">
            <AlertIcon size={16} />
            {note}
          </p>
        )}

        {(each || (stay && stay.nights > 1 && villa.totalPrice)) && (
          <p className="stay-split">
            {each}
            {each && stay && stay.nights > 1 && villa.totalPrice ? " · " : ""}
            {stay && stay.nights > 1 && villa.totalPrice ? `${rupees(villa.totalPrice)} for ${nights(stay.nights)}` : ""}
          </p>
        )}

        {action && (
          <button type="button" className="stay-more" onClick={action.onClick}>
            {action.label}
          </button>
        )}

        {onPick && !action && (
          <button type="button" className="stay-more" onClick={() => onPick(villa)}>
            More in {villa.region}
          </button>
        )}
      </div>
    </article>
  );
}
