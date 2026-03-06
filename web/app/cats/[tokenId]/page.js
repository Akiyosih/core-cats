import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionItem } from "../../../lib/viewer-data";

export default async function CatDetailPage({ params }) {
  const tokenId = Number(params.tokenId);
  const item = await getCollectionItem(tokenId);

  if (!item) {
    notFound();
  }

  return (
    <div className="detail-layout">
      <section className="detail-art">
        <div className="detail-art__frame">
          <img src={item.image_data_uri} alt={item.name} width="480" height="480" className="pixel-art" />
        </div>
      </section>

      <section className="detail-copy">
        <p className="eyebrow">Cat Detail</p>
        <h1>{item.name}</h1>
        <p>{item.description}</p>

        <dl className="detail-traits">
          {item.display_attributes.map((attr) => (
            <div key={`${item.token_id}-${attr.trait_type_id}`} className="detail-traits__row">
              <dt>{attr.trait_type_label}</dt>
              <dd>{attr.value_label}</dd>
            </div>
          ))}
        </dl>

        <div className="detail-meta">
          <p><strong>Variant key:</strong> {item.integrity.variant_key}</p>
          <p><strong>PNG24 SHA256:</strong> {item.integrity.final_png_24_sha256}</p>
        </div>

        <div className="cta-row">
          <Link href="/collection" className="button button--ghost">
            Back to Collection
          </Link>
        </div>
      </section>
    </div>
  );
}
