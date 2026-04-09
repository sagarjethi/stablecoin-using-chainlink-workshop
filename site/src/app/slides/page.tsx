"use client";

import { useEffect, useRef } from "react";
import { slides, type Slide } from "@/content/slides";
import { Mermaid } from "@/components/Mermaid";
import "reveal.js/dist/reveal.css";
import "reveal.js/dist/theme/black.css";

export default function SlidesPage() {
  const deckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let deck: { destroy?: () => void } | null = null;
    let cancelled = false;
    (async () => {
      const Reveal = (await import("reveal.js")).default;
      if (cancelled || !deckRef.current) return;
      deck = new Reveal(deckRef.current, {
        hash: true,
        slideNumber: true,
        controls: true,
        progress: true,
        transition: "slide",
        width: 1280,
        height: 780,
        margin: 0.06,
      });
      // @ts-expect-error reveal types are loose
      deck.initialize();
    })();
    return () => {
      cancelled = true;
      try {
        deck?.destroy?.();
      } catch {
        /* noop */
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 top-[57px] bg-[#0a0b14]">
      <div ref={deckRef} className="reveal">
        <div className="slides">
          {slides.map((s) => (
            <section key={s.id} data-slide-id={s.id}>
              <SlideBody slide={s} />
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlideBody({ slide }: { slide: Slide }) {
  return (
    <div>
      {slide.title && <h2>{slide.title}</h2>}
      {slide.subtitle && (
        <p style={{ color: "#9bb0ff", fontSize: "0.75em", marginTop: "-0.2em" }}>
          {slide.subtitle}
        </p>
      )}

      {slide.quote && (
        <blockquote
          style={{
            borderLeft: "4px solid #7d97ff",
            padding: "0.6em 1em",
            fontSize: "0.62em",
            fontStyle: "italic",
            color: "#d6dcf0",
            background: "rgba(55,91,210,0.06)",
            margin: "0.6em 0",
          }}
        >
          {slide.quote}
        </blockquote>
      )}

      {slide.bullets && (
        <ul style={{ fontSize: "0.7em", lineHeight: 1.55 }}>
          {slide.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {slide.columns && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${slide.columns.length}, 1fr)`,
            gap: "1em",
            marginTop: "0.6em",
          }}
        >
          {slide.columns.map((c, i) => (
            <div
              key={i}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "1em",
                background: "rgba(55,91,210,0.08)",
              }}
            >
              <div style={{ color: "#7d97ff", fontWeight: 700, fontSize: "0.7em" }}>
                {c.title}
              </div>
              <div style={{ fontSize: "0.55em", marginTop: "0.4em", color: "#d6dcf0" }}>
                {c.body}
              </div>
            </div>
          ))}
        </div>
      )}

      {slide.table && (
        <table>
          <thead>
            <tr>
              {slide.table.headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slide.table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {slide.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.image.src}
          alt={slide.image.alt}
          style={{ width: slide.image.width ?? 200, marginTop: "0.6em" }}
        />
      )}

      {slide.mermaid && (
        <div style={{ marginTop: "0.5em" }}>
          <Mermaid chart={slide.mermaid} id={slide.id} />
        </div>
      )}

      {slide.code && (
        <pre>
          <code className={`language-${slide.code.language}`}>{slide.code.content}</code>
        </pre>
      )}

      {slide.code?.caption && (
        <div
          style={{
            fontSize: "0.5em",
            color: "#9bb0ff",
            marginTop: "0.4em",
          }}
        >
          {slide.code.caption}
        </div>
      )}

      {slide.cta && (
        <p style={{ marginTop: "1em" }}>
          <a
            href={slide.cta.href}
            style={{
              background: "#375BD2",
              padding: "0.4em 0.9em",
              borderRadius: 10,
              color: "#fff",
              fontSize: "0.7em",
              textDecoration: "none",
            }}
          >
            {slide.cta.label} →
          </a>
        </p>
      )}

      {slide.footer && (
        <div
          style={{
            marginTop: "1em",
            color: "#7d97ff",
            fontSize: "0.5em",
            fontStyle: "italic",
          }}
        >
          {slide.footer}
        </div>
      )}
    </div>
  );
}
