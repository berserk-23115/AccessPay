import { Icon, PageFocus } from "@accesspay/a11y";
export default function Home() {
  return (
    <div className="home">
      <PageFocus identity="home" />
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-label">
            <span aria-hidden="true">✳</span> A payment experience built around
            you
          </span>
          <h1 tabIndex={-1}>
            A clearer way
            <br />
            to pay.
          </h1>
          <p className="hero-description">
            Know who you’re paying. Understand every fee. Move forward with
            confidence, in the way that works for you.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="/store-a">
              Try an accessible checkout
              <Icon name="arrow" />
            </a>
            <a className="text-link" href="/workspace">
              Open your workspace
            </a>
          </div>
          <div className="hero-reassurance">
            <Icon name="keyboard" size={20} />
            <span>Keyboard ready.</span>
            <span>Text first.</span>
            <span>Your pace.</span>
          </div>
        </div>
        <div className="hero-preview" aria-label="Example payment review">
          <div className="preview-orbit orbit-one" aria-hidden="true" />
          <div className="preview-orbit orbit-two" aria-hidden="true" />
          <div className="preview-paper">
            <div className="preview-top">
              <span className="preview-logo" aria-hidden="true">
                ap
              </span>
              <span className="small muted">Example review</span>
              <Icon name="shield" size={20} />
            </div>
            <p className="small muted">You’re paying</p>
            <h2>Northstar Goods</h2>
            <div className="preview-item">
              <img src="/products/lamp-01.svg" width="84" height="84" alt="" />
              <div>
                <strong>Arc desk lamp</strong>
                <p className="small muted">Matte blue · Quantity 1</p>
              </div>
              <strong>$25.00</strong>
            </div>
            <dl className="preview-totals">
              <div>
                <dt>Shipping</dt>
                <dd>$3.00</dd>
              </div>
              <div>
                <dt>Tax</dt>
                <dd>$1.40</dd>
              </div>
              <div className="preview-total">
                <dt>
                  Total <span className="small muted">USD</span>
                </dt>
                <dd>$29.40</dd>
              </div>
            </dl>
            <div className="preview-confirm">
              <Icon name="check" />
              <span>Clear details. No surprises.</span>
            </div>
            <p className="small muted preview-note">
              Review first. Approve with PayPal when you’re ready.
            </p>
          </div>
          <div className="preview-caption">
            <Icon name="check" size={18} /> One consistent checkout. Across
            participating stores.
          </div>
        </div>
      </section>
      <section className="principles" aria-label="How AccessPay helps">
        <div>
          <Icon name="keyboard" size={28} />
          <h2>Your way in.</h2>
          <p>
            Use a keyboard, text input, or your assistive technology. Speaking
            is always optional.
          </p>
        </div>
        <div>
          <Icon name="help" size={28} />
          <h2>Clarity before consent.</h2>
          <p>
            Read every fee. Ask about your order. Confirm the exact amount
            before you pay.
          </p>
        </div>
        <div>
          <Icon name="phone" size={28} />
          <h2>Room to keep going.</h2>
          <p>
            Move an unpaid draft to your phone with a code. Review again on your
            new device.
          </p>
        </div>
      </section>
      <section className="demo-section" aria-labelledby="demo-heading">
        <div className="demo-intro">
          <div>
            <h2 id="demo-heading">Two stores. One familiar checkout.</h2>
            <p className="muted">
              Different shops, the same clear review. Choose a store to try it.
            </p>
          </div>
          <span className="badge">Interactive demos</span>
        </div>
        <div className="store-tiles">
          <a href="/store-a" className="store-tile northstar-tile">
            <div>
              <span className="tile-mark" aria-hidden="true">
                N<span>✳</span>
              </span>
              <h3>Northstar Goods</h3>
              <p>Thoughtful everyday essentials.</p>
              <span className="tile-cta">
                Explore the store
                <Icon name="arrow" />
              </span>
            </div>
            <img src="/products/lamp-01.svg" alt="" width="240" height="240" />
          </a>
          <a href="/store-b" className="store-tile fieldwork-tile">
            <div>
              <span className="tile-mark" aria-hidden="true">
                f.
              </span>
              <h3>Fieldwork Supply</h3>
              <p>Tools for your next good idea.</p>
              <span className="tile-cta">
                Explore the store
                <Icon name="arrow" />
              </span>
            </div>
            <img
              src="/products/sketch-01.svg"
              alt=""
              width="240"
              height="240"
            />
          </a>
        </div>
      </section>
      <section className="developer-strip">
        <div>
          <h2>Built to belong in your checkout.</h2>
          <p>
            One reusable React integration, with merchant-owned prices and
            PayPal-owned approval.
          </p>
        </div>
        <a href="/integration" className="button secondary">
          Explore the integration
          <Icon name="arrow" />
        </a>
      </section>
    </div>
  );
}
