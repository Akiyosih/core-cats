import { Suspense } from "react";
import { notFound } from "next/navigation";

import CatDetailLive from "../../../components/cat-detail-live";
import { getCollectionItem, getSummary } from "../../../lib/viewer-data";
import { getCorePublicConfig } from "../../../lib/server/core-env";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const summary = await getSummary();
  return Array.from({ length: Number(summary.total || 1000) }, (_, index) => ({
    tokenId: String(index + 1),
  }));
}

export default async function CatDetailPage({ params }) {
  const routeParams = await params;
  const tokenId = Number(routeParams?.tokenId);

  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 1000) {
    notFound();
  }

  const [item, config] = await Promise.all([getCollectionItem(tokenId), getCorePublicConfig()]);

  if (!item) {
    notFound();
  }

  const detailImageSrc = item.image_svg_src || item.image_src || item.image_data_uri;

  return (
    <div className="detail-layout">
      <section className="detail-art">
        <div className="detail-art__frame">
          <img src={detailImageSrc} alt={item.name} width="480" height="480" className="pixel-art" />
        </div>
      </section>

      <section className="detail-copy">
        <p className="eyebrow">Cat Detail</p>
        <h1>{item.name}</h1>
        <p>{item.description}</p>

        <Suspense fallback={null}>
          <CatDetailLive
            tokenId={tokenId}
            teaserEnabled={config.launchState !== "public"}
            statusSnapshotUrl={config.statusSnapshotUrl}
            collectionIndexUrl="/viewer_v1/collection-index.json"
            explorerBaseUrl={config.explorerBaseUrl}
            coreCatsAddress={config.coreCatsAddress}
          />
        </Suspense>

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
          <p>
            <strong>Preview SVG:</strong>{" "}
            {detailImageSrc ? (
              <a href={detailImageSrc} target="_blank" rel="noreferrer" className="detail-external-link">
                Open preview SVG
              </a>
            ) : (
              item.image_svg_file || "not available"
            )}
          </p>
        </div>
      </section>
    </div>
  );
}
