// Re-export the shared static cat detail page so teaser builds stay aligned with the main app.
export const dynamic = "force-static";
export const dynamicParams = false;

export { default, generateStaticParams } from "../../../../web/app/cats/[tokenId]/page.js";
