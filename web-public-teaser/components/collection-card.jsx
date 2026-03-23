"use client";

import { useRouter } from "next/navigation";

export default function CollectionCard({ item, detailHref }) {
  const router = useRouter();
  const mintStatus = item.mint_status;
  const tierLabel = item.display_attributes.find((attr) => attr.trait_type_id === "Rarity Tier")?.value_label;
  const targetHref = detailHref || `/cats/${item.token_id}`;
  const previewSrc = item.image_preview_src || item.image_src || item.image_data_uri;

  function handleCardClick(event) {
    if (event.target.closest("a")) {
      return;
    }
    router.push(targetHref);
  }

  function handleCardKeyDown(event) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    router.push(targetHref);
  }

  return (
    <article
      className="cat-card"
      role="link"
      tabIndex={0}
      aria-label={`View details for ${item.name}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
    >
      <div className="cat-card__image-frame">
        <img
          src={previewSrc}
          alt={item.name}
          width="192"
          height="192"
          className="pixel-art"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="cat-card__body">
        <div className="cat-card__title-row">
          <span className="cat-card__title">{item.name}</span>
          <span className={`tier-badge tier-badge--${item.trait_values.rarity_tier}`}>{tierLabel}</span>
        </div>

        {mintStatus?.minted ? (
          <div className="cat-card__status-row">
            <span className="cat-card__status-label">Live on-chain</span>
            {mintStatus.explorer?.mintTx ? (
              <a href={mintStatus.explorer.mintTx} target="_blank" rel="noreferrer" className="card-inline-link">
                Mint tx
              </a>
            ) : null}
          </div>
        ) : null}

        <dl className="trait-list">
          {item.display_attributes.map((attr) => (
            <div key={`${item.token_id}-${attr.trait_type_id}`} className="trait-row">
              <dt>{attr.trait_type_label}</dt>
              <dd>{attr.value_label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  );
}
