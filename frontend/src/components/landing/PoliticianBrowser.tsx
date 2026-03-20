import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { type PoliticianCard, getPoliticians } from "@/api/client";
import { CitizenTipModal } from "./CitizenTipModal";
import styles from "./PoliticianBrowser.module.css";

const PARTY_COLORS: Record<string, string> = {
  PSOE: "#c0392b",
  PP: "#0a5eb0",
  VOX: "#4a9e3f",
  SUMAR: "#6a3fa0",
  PODEMOS: "#6a3fa0",
  CIUDADANOS: "#e07000",
  "CIUDADANOS-CS": "#e07000",
  ERC: "#d4a017",
  JUNTS: "#1a1a2e",
  PNV: "#007a56",
  "EH BILDU": "#5aac44",
  CUP: "#c0392b",
  BNG: "#00a0dd",
  "CC-PNC": "#f0a500",
  UPN: "#003580",
};

function getPartyColor(partido: string): string {
  const upper = partido.toUpperCase().trim();
  for (const [key, color] of Object.entries(PARTY_COLORS)) {
    if (upper.includes(key)) return color;
  }
  return "#4EA8DE";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function PoliticianCardItem({ p, onClick }: { p: PoliticianCard; onClick: () => void }) {
  const color = getPartyColor(p.partido);
  const initials = getInitials(p.name);
  const cargoLabel = p.cargo || (p.fuente === "congreso" ? "Diputado/a" : p.fuente === "senado_es" ? "Senador/a" : "Cargo público");

  return (
    <div className={styles.card} style={{ "--party-color": color } as React.CSSProperties}>
      <div className={styles.avatar} style={{ background: `linear-gradient(135deg, ${color}33, ${color}66)`, borderColor: color }}>
        <span className={styles.initials} style={{ color }}>{initials}</span>
        {p.activo && <span className={styles.activeDot} title="En activo" />}
      </div>

      <div className={styles.cardBody}>
        <p className={styles.name}>{p.name}</p>
        <span className={styles.partido} style={{ background: `${color}22`, color, borderColor: `${color}44` }}>
          {p.partido || "Independiente"}
        </span>
        <p className={styles.cargo}>{cargoLabel}</p>
        {p.circunscripcion && (
          <p className={styles.circunscripcion}>📍 {p.circunscripcion}</p>
        )}
        {p.grupo_parlamentario && (
          <p className={styles.grupo}>{p.grupo_parlamentario}</p>
        )}
      </div>

      <div className={styles.cardFooter}>
        <Link
          to={`/app/analysis/${p.id}`}
          className={styles.fichaBtn}
          style={{ borderColor: `${color}66`, color }}
          onClick={(e) => e.stopPropagation()}
        >
          Ver ficha →
        </Link>
      </div>
    </div>
  );
}

export function PoliticianBrowser() {
  const [politicians, setPoliticians] = useState<PoliticianCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [showTipModal, setShowTipModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPoliticians(1, 50)
      .then((data) => {
        setPoliticians(data.politicians);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });
  };

  if (!loading && politicians.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <div>
          <span className={styles.sectionLabel}>ESCRUTINIO PÚBLICO</span>
          <h2 className={styles.heading}>Representantes en el grafo</h2>
          <p className={styles.subheading}>
            {total > 0 ? `${total} representantes indexados` : "Políticos con datos públicos verificados"}
          </p>
        </div>
        <button className={styles.tipBtn} onClick={() => setShowTipModal(true)}>
          + Aportar información
        </button>
      </div>

      <div className={styles.scrollWrapper}>
        <button className={`${styles.scrollBtn} ${styles.scrollLeft}`} onClick={() => scroll("left")} aria-label="Anterior">‹</button>

        <div ref={scrollRef} className={styles.track}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.cardSkeleton} />
              ))
            : politicians.map((p) => (
                <PoliticianCardItem key={p.id} p={p} onClick={() => {}} />
              ))}
        </div>

        <button className={`${styles.scrollBtn} ${styles.scrollRight}`} onClick={() => scroll("right")} aria-label="Siguiente">›</button>
      </div>

      {showTipModal && <CitizenTipModal onClose={() => setShowTipModal(false)} />}
    </section>
  );
}
