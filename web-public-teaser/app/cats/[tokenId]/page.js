// Re-export the shared static cat detail page so teaser builds stay aligned with the main app.
// This local file is also used to trigger Cloudflare rebuilds when shared cat detail behavior changes.
export const dynamic = "force-static";
export const dynamicParams = false;

export { default, generateStaticParams } from "../../../../web/app/cats/[tokenId]/page.js";
