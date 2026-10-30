"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset(): void;
}) {
  return (
    <div className="error-page">
      <h1 tabIndex={-1}>We couldn’t open this page.</h1>
      <p>
        Your payment is not confirmed here. Check the existing checkout before
        starting another payment.
      </p>
      <div className="button-row">
        <button type="button" className="button primary" onClick={reset}>
          Try opening this page again
        </button>
        <a className="button secondary" href="/workspace">
          Your checkouts
        </a>
      </div>
    </div>
  );
}
