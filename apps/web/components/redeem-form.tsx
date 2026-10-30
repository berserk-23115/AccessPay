"use client";
import { useActionState } from "react";
import { redeemHandoff } from "../app/actions";
export function RedeemForm() {
  const [state, action, pending] = useActionState(redeemHandoff, {});
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="code">Pairing code</label>
        <input
          id="code"
          name="code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          maxLength={30}
          aria-describedby="code-help"
          aria-invalid={state.error ? true : undefined}
        />
        <p className="small muted" id="code-help">
          Type the one-time code from your original device. You do not need a
          camera.
        </p>
      </div>
      <p role="status" aria-live="polite">
        {state.error ?? ""}
      </p>
      <button className="button primary full" type="submit" disabled={pending}>
        {pending ? "Opening your draft…" : "Open draft on this device"}
      </button>
    </form>
  );
}
