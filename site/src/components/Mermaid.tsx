"use client";
import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let initialized = false;

export function Mermaid({ chart, id }: { chart: string; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "#375BD2",
          primaryTextColor: "#e6e9f2",
          primaryBorderColor: "#4f74ec",
          lineColor: "#7d97ff",
          background: "#0a0b14",
          mainBkg: "#11132080",
          secondaryColor: "#1a1f3a",
          tertiaryColor: "#0d1020",
          fontFamily: "Inter, sans-serif",
        },
      });
      initialized = true;
    }

    const renderId = `m-${id || Math.random().toString(36).slice(2, 9)}`;
    mermaid
      .render(renderId, chart)
      .then(({ svg }) => setSvg(svg))
      .catch(() => setSvg(`<pre>${chart}</pre>`));
  }, [chart, id]);

  return (
    <div
      ref={ref}
      className="mermaid-wrapper flex justify-center my-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
