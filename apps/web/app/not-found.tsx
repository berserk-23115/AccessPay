export default function NotFound() {
  return (
    <div className="error-page">
      <h1 tabIndex={-1}>This checkout isn’t available.</h1>
      <p>
        It may belong to another account, or the address may be incomplete. Sign
        in to the account that created it.
      </p>
      <a className="button primary" href="/workspace">
        Open your checkouts
      </a>
    </div>
  );
}
