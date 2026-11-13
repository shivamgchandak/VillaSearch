// The villa team's contact. Set VITE_TEAM_WHATSAPP and VITE_TEAM_PHONE in
// .env.local. Without a WhatsApp number the message still opens, ready to
// send, and the guest picks who gets it.
const WHATSAPP = String(import.meta.env.VITE_TEAM_WHATSAPP || "").replace(/\D/g, "");
const PHONE = String(import.meta.env.VITE_TEAM_PHONE || "").replace(/\s/g, "");

export const whatsappLink = (text) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
export const phoneLink = PHONE ? `tel:${PHONE}` : null;

// The whole search travels with the message, so nobody asks the guest twice
export function enquiryText(sentence) {
  const link = typeof window !== "undefined" ? window.location.href : "";
  return `Hi, I am planning a trip: ${sentence || "a villa stay"}. Could you help me find a villa?${link ? `\n${link}` : ""}`;
}
