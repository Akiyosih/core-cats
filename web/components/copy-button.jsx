"use client";

import { useEffect, useState } from "react";

export default function CopyButton({ value, idleLabel = "Copy", doneLabel = "Copied" }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timeout = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timeout);
  }, [copied]);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" className="button button--ghost button--inline" onClick={handleClick}>
      {copied ? doneLabel : idleLabel}
    </button>
  );
}
