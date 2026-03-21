import { Suspense } from "react";
import { notFound } from "next/navigation";

import CatDetailLive from "../cat-detail-live.jsx";
import { getCollectionItem, getSummary } from "../../lib/viewer-data.js";

const PROJECT_REPOSITORY_URL = "https://github.com/Akiyosih/core-cats";
const RENDER_SCRIPT_URL = `${PROJECT_REPOSITORY_URL}/blob/main/scripts/ui/generate_viewer_data.mjs`;
const ONCHAIN_DATA_URL = `${PROJECT_REPOSITORY_URL}/blob/main/foxar/src/CoreCatsOnchainData.sol`;
const RENDERER_REFERENCE_URL = `${PROJECT_REPOSITORY_URL}/blob/main/foxar/src/CoreCatsMetadataRenderer.sol`;

export async function generateCatDetailStaticParams() {
  const summary = await getSummary();
  return Array.from({ length: Number(summary.total || 1000) }, (_, index) => ({
    tokenId: String(index + 1),
  }));
}

export default async function CatDetailPageContent({ tokenId, config }) {
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 1000) {
    notFound();
  }

  const item = await getCollectionItem(tokenId, config.launchState !== "public");

  if (!item) {
    notFound();
  }

  const detailImageSrc = item.image_svg_src || item.image_src || item.image_data_uri;
  const patternAttr = item.display_attributes.find((attr) => attr.trait_type_id === "Pattern");
  const colorVariationAttr = item.display_attributes.find((attr) => attr.trait_type_id === "Color Variation");
  const collarAttr = item.display_attributes.find((attr) => attr.trait_type_id === "Collar");
  const rarityTypeAttr = item.display_attributes.find((attr) => attr.trait_type_id === "Rarity Type");
  const renderRecipe = item.render_recipe || {};
  const colorTuple = Array.isArray(renderRecipe.color_tuple) ? renderRecipe.color_tuple.join(", ") : null;
  const slots = renderRecipe.slots == null ? null : String(renderRecipe.slots);

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
            collectionIndexUrl="/viewer_v2/collection-index.json"
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
          <p>
            <strong>Avatar PNG (transparent background):</strong>{" "}
            {item.image_preview_src ? (
              <a href={item.image_preview_src} target="_blank" rel="noreferrer" className="detail-external-link">
                Open 384x384 PNG
              </a>
            ) : (
              item.image_preview_file || "not available"
            )}
          </p>
          <p>
            <strong>Avatar PNG (white background):</strong>{" "}
            {item.image_preview_white_src ? (
              <a href={item.image_preview_white_src} target="_blank" rel="noreferrer" className="detail-external-link">
                Open 384x384 PNG
              </a>
            ) : (
              item.image_preview_white_file || "not available"
            )}
          </p>
        </div>

        <details className="mint-verify-details detail-verify-details">
          <summary>Render Recipe and Verification</summary>
          <div className="mint-verify-body detail-verify-body">
            <p>
              This preview can be regenerated from the public render script and on-chain data tables using the render
              recipe below.
            </p>
            <p className="detail-inline-note">
              The PNG SHA256 lets you confirm that the preview PNG file has not changed.
            </p>

            <div className="detail-verify-links">
              <a href={RENDER_SCRIPT_URL} target="_blank" rel="noreferrer" className="detail-external-link">
                Render script on GitHub
              </a>
              <a href={ONCHAIN_DATA_URL} target="_blank" rel="noreferrer" className="detail-external-link">
                On-chain data tables on GitHub
              </a>
              <a href={RENDERER_REFERENCE_URL} target="_blank" rel="noreferrer" className="detail-external-link">
                Renderer reference on GitHub
              </a>
            </div>

            <dl className="detail-traits detail-verify-list">
              <div className="detail-traits__row">
                <dt>Pattern</dt>
                <dd>
                  {patternAttr?.value_label || renderRecipe.pattern || "not available"}
                  {patternAttr?.value_id && patternAttr.value_id !== patternAttr.value_label ? (
                    <span className="detail-meta__short"> ({patternAttr.value_id})</span>
                  ) : null}
                </dd>
              </div>
              <div className="detail-traits__row">
                <dt>Color Variation</dt>
                <dd>
                  {colorVariationAttr?.value_label || renderRecipe.palette_id || "not available"}
                  {colorVariationAttr?.value_id && colorVariationAttr.value_id !== colorVariationAttr.value_label ? (
                    <span className="detail-meta__short"> ({colorVariationAttr.value_id})</span>
                  ) : null}
                </dd>
              </div>
              <div className="detail-traits__row">
                <dt>Color tuple</dt>
                <dd>{colorTuple || "not used for this render"}</dd>
              </div>
              <div className="detail-traits__row">
                <dt>Collar</dt>
                <dd>
                  {collarAttr?.value_label || item.trait_values?.collar || "not available"}
                  {collarAttr?.value_id && collarAttr.value_id !== collarAttr.value_label ? (
                    <span className="detail-meta__short"> ({collarAttr.value_id})</span>
                  ) : null}
                </dd>
              </div>
              <div className="detail-traits__row">
                <dt>Rare Feature</dt>
                <dd>
                  {rarityTypeAttr?.value_label || item.trait_values?.rarity_type || "not available"}
                  {rarityTypeAttr?.value_id && rarityTypeAttr.value_id !== rarityTypeAttr.value_label ? (
                    <span className="detail-meta__short"> ({rarityTypeAttr.value_id})</span>
                  ) : null}
                </dd>
              </div>
              <div className="detail-traits__row">
                <dt>Slots</dt>
                <dd>{slots || "not used for this render"}</dd>
              </div>
              <div className="detail-traits__row">
                <dt>Variant key</dt>
                <dd>{item.integrity.variant_key}</dd>
              </div>
              <div className="detail-traits__row">
                <dt>Preview PNG SHA256</dt>
                <dd>{item.integrity.final_png_24_sha256}</dd>
              </div>
            </dl>
          </div>
        </details>
      </section>
    </div>
  );
}
