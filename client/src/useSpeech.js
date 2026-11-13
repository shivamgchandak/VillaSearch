import { useCallback, useEffect, useRef, useState } from "react";

// Say the trip instead of typing it. Uses the browser's own speech
// recognition, so nothing extra is installed and no audio leaves for our
// server. Browsers without it simply do not show the microphone.
const Recognition = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export function useSpeech(onText) {
  const [listening, setListening] = useState(false);
  const recognition = useRef(null);
  const handler = useRef(onText);
  handler.current = onText;

  useEffect(() => () => recognition.current?.abort(), []);

  const start = useCallback(() => {
    if (!Recognition || recognition.current) return;
    const rec = new Recognition();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ");
      handler.current(text, event.results[event.results.length - 1].isFinal);
    };
    const done = () => {
      recognition.current = null;
      setListening(false);
    };
    rec.onend = done;
    rec.onerror = done;
    recognition.current = rec;
    rec.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => recognition.current?.stop(), []);

  return { supported: Boolean(Recognition), listening, start, stop };
}
