"use client";

import dynamic from "next/dynamic";

const CatDetailBrowser = dynamic(() => import("./cat-detail-browser"), {
  ssr: false,
  loading: () => null,
});

export default function CatDetailLive(props) {
  return <CatDetailBrowser {...props} />;
}
