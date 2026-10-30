import { AccessibleCheckout } from "@accesspay/react";
import { stores, money, type CartInput } from "@accesspay/core";
import { startCheckout } from "../app/actions";
import { PageFocus, Icon } from "@accesspay/a11y";
export function StorePage({ id }: { id: CartInput["storeId"] }) {
  const store = stores[id];
  return (
    <div
      className={`store-page ${id === "store-b" ? "fieldwork" : "northstar"}`}
    >
      <PageFocus identity={id} />
      <div className="store-topline">
        <a href="/">AccessPay demo stores</a>
        <span className="badge">Sandbox store</span>
      </div>
      <header className="store-hero">
        <p className="store-wordmark">
          {store.name}
          <span aria-hidden="true">{id === "store-a" ? " ✳" : " ↗"}</span>
        </p>
        <h1 tabIndex={-1}>{store.description}</h1>
        <p>
          {id === "store-a"
            ? "Useful things, thoughtfully made. A little less friction in your day."
            : "For the first rough line and everything that comes after."}
        </p>
      </header>
      <div className="product-grid">
        {store.products.map((product) => (
          <article className="product" key={product.sku}>
            <div className="product-art">
              <img
                src={`/products/${product.sku}.svg`}
                alt={`Illustration of ${product.name.toLowerCase()}`}
                width="400"
                height="300"
              />
            </div>
            <div className="product-title">
              <h2>{product.name}</h2>
              <strong>{money(product.unitMinor)}</strong>
            </div>
            <p>{product.description}</p>
            <AccessibleCheckout
              storeId={id}
              sku={product.sku}
              action={startCheckout}
            />
          </article>
        ))}
      </div>
      <div className="store-footer">
        <Icon name="shield" />
        <p>
          Every product uses the same AccessPay checkout. Review shipping and
          tax before you approve a payment. This store uses a single PayPal
          sandbox seller with the other demo store.
        </p>
      </div>
      <a
        className="button secondary"
        href={id === "store-a" ? "/store-b" : "/store-a"}
      >
        Visit {id === "store-a" ? "Fieldwork Supply" : "Northstar Goods"}
        <Icon name="arrow" />
      </a>
    </div>
  );
}
