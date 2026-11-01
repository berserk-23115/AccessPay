"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { amountReadback, money } from "@accesspay/core";
import { hapticPreference, playHaptic } from "@accesspay/a11y";
import { askAssistant, startCheckout } from "../app/actions";

type Recognition = {
  lang: string;
  interimResults: boolean;
  onresult: (event: { results: { 0: { transcript: string } }[] }) => void;
  onerror: () => void;
  onend: () => void;
  start(): void;
  stop(): void;
};
function createRecognition(): Recognition | null {
  const scope = window as unknown as Record<string, new () => Recognition>;
  const Engine = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  return Engine ? new Engine() : null;
}
export function AssistantForm() {
  const [result, action, pending] = useActionState(askAssistant, {});
  const [request, setRequest] = useState("");
  const [status, setStatus] = useState("");
  const [listening, setListening] = useState(false);
  const [canDictate, setCanDictate] = useState(false);
  const [canVibrate, setCanVibrate] = useState(false);
  const [vibration, setVibration] = useState(true);
  const recognition = useRef<Recognition | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    setCanDictate(!!createRecognition());
    setCanVibrate(!!navigator.vibrate);
    setVibration(localStorage.getItem(hapticPreference) !== "off");
  }, []);
  useEffect(() => {
    if (!result.proposal) return;
    heading.current?.focus();
    // "success" is reserved for a completed payment; a suggestion has not paid anything.
    playHaptic("attention");
  }, [result]);
  function dictate() {
    if (listening) return recognition.current?.stop();
    const engine = createRecognition();
    if (!engine) return;
    let heard = "";
    engine.lang = navigator.language;
    engine.interimResults = false;
    engine.onresult = (event) => {
      heard = event.results[0][0].transcript;
    };
    engine.onerror = () =>
      setStatus("Dictation did not work. You can type your request instead.");
    engine.onend = () => {
      setListening(false);
      if (!heard) return;
      setRequest(heard);
      setStatus(`Heard: ${heard}. Check it, then choose Find this.`);
      input.current?.focus();
    };
    recognition.current = engine;
    playHaptic("listening");
    setListening(true);
    setStatus("");
    engine.start();
  }
  const proposal = result.proposal;
  return (
    <>
      <section className="help-panel" aria-label="Your request">
        <form action={action}>
          <div className="field">
            <label htmlFor="request">What would you like to buy?</label>
            <input
              id="request"
              ref={input}
              name="request"
              maxLength={500}
              required
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              placeholder="Two desk lamps"
              aria-describedby="request-limit"
            />
          </div>
          <p id="request-limit" className="small muted">
            The assistant suggests an order. It cannot pay, change a price, or
            send money to a person.
          </p>
          <button type="submit" className="button primary" disabled={pending}>
            {pending ? "Finding…" : "Find this"}
          </button>{" "}
          {canDictate ? (
            <button
              type="button"
              className="button secondary"
              aria-pressed={listening}
              onClick={dictate}
            >
              {listening ? "Stop dictating" : "Dictate"}
            </button>
          ) : null}
        </form>
        {canDictate ? (
          <p className="small muted">
            Dictation sends your voice to your browser’s speech service.
          </p>
        ) : null}
        <p className="small" role="status">
          {status}
        </p>
        {canVibrate ? (
          <label className="small">
            <input
              type="checkbox"
              checked={vibration}
              onChange={(event) => {
                setVibration(event.target.checked);
                localStorage.setItem(
                  hapticPreference,
                  event.target.checked ? "on" : "off",
                );
              }}
            />{" "}
            Vibrate for payment status
          </label>
        ) : null}
      </section>
      {proposal ? (
        <section className="help-panel" aria-labelledby="proposal-heading">
          <h2 id="proposal-heading" ref={heading} tabIndex={-1}>
            {proposal.kind === "proposal"
              ? "Suggested order"
              : "We need a little more"}
          </h2>
          {result.request ? (
            <p className="small muted">You asked: {result.request}</p>
          ) : null}
          {proposal.kind === "proposal" ? (
            <>
              <p>From {proposal.cart.merchantDisplayName}</p>
              <ul>
                {proposal.cart.lineItems.map((item) => (
                  <li key={item.sku}>
                    {item.name}, quantity {item.qty}
                  </li>
                ))}
              </ul>
              <p>
                <strong>
                  <span aria-hidden="true">
                    Total {money(proposal.cart.totalMinor)} USD
                  </span>
                  <span className="sr-only">
                    Total {amountReadback(proposal.cart.totalMinor)}
                  </span>
                </strong>
              </p>
              <form action={startCheckout}>
                <input
                  type="hidden"
                  name="storeId"
                  value={proposal.input.storeId}
                />
                {proposal.input.items.map((item) => (
                  <span key={item.sku}>
                    <input type="hidden" name="sku" value={item.sku} />
                    <input type="hidden" name="qty" value={item.qty} />
                  </span>
                ))}
                <button type="submit" className="button primary">
                  Review this order
                </button>
              </form>
              <p className="small muted">This does not make a payment.</p>
            </>
          ) : (
            <>
              <p>{proposal.message}</p>
              {proposal.kind === "clarify" && proposal.options.length ? (
                <ul>
                  {proposal.options.map((option) => (
                    <li key={option.sku}>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          setRequest(option.name);
                          input.current?.focus();
                        }}
                      >
                        {option.name} from {option.merchant}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {proposal.kind === "unavailable" ? (
                <a href="/store-a">Go to the demo stores</a>
              ) : null}
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
