import Link from "next/link";

export default function CollectionCard({ item }) {
  return (
    <article className="cat-card">
      <Link href={`/cats/${item.token_id}`} className="cat-card__image-frame">
        <img
          src={item.image_data_uri}
          alt={item.name}
          width="192"
          height="192"
          className="pixel-art"
        />
      </Link>

      <div className="cat-card__body">
        <div className="cat-card__title-row">
          <Link href={`/cats/${item.token_id}`} className="cat-card__title">
            {item.name}
          </Link>
          <span className={`tier-badge tier-badge--${item.trait_values.rarity_tier}`}>
            {item.display_attributes.find((attr) => attr.trait_type_id === "Rarity Tier")?.value_label}
          </span>
        </div>

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
