import { useState, useRef, useCallback, useEffect } from "react";
import { Link } from "wouter";
import {
  FileText,
  Instagram,
  Twitter,
  Linkedin,
  PenTool,
  FileCheck,
  GitCompare,
  Bell,
  Search,
  ChevronLeft,
  Download,
  Copy,
  Eye,
  Lock,
  ArrowLeft,
  Share2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  User,
  Scroll,
  ChevronRight,
  Zap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  type EntidadEdicion,
  buscarEntidadesEdicion,
  formatMoney,
  formatMoneyShort,
  ENTIDADES_EDICION,
} from "@/lib/edition-data";

// ── Canvas rendering utilities ──
function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 99
): number {
  const words = text.split(" ");
  let line = "";
  let linesDrawn = 0;
  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    if (ctx.measureText(testLine).width > maxWidth && line) {
      if (linesDrawn >= maxLines - 1 && i < words.length - 1) {
        ctx.fillText(line.trim() + "…", x, y);
        return linesDrawn + 1;
      }
      ctx.fillText(line.trim(), x, y);
      line = words[i] + " ";
      y += lineHeight;
      linesDrawn++;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, y);
  return linesDrawn + 1;
}

// ── Color helpers ──
const COLORS = {
  bg: "#0a0e1a",
  bgCard: "#111827",
  accent: "#3b82f6",
  alertHigh: "#dc2626",
  alertMedium: "#f59e0b",
  ok: "#10b981",
  text: "#f3f4f6",
  textSecondary: "#9ca3af",
  textMuted: "#6b7280",
  border: "#1f2937",
  surface: "#1e293b",
};

function getAlertColor(entity: EntidadEdicion): string {
  const hasCritical = entity.señalesAlerta.some((s) => s.tipo === "critica");
  const hasSanctions = entity.sanciones.length > 0;
  const hasOffshore = entity.offshore.aparece;
  if (hasCritical || hasSanctions || hasOffshore) return COLORS.alertHigh;
  if (entity.contratosSinConcurso > 0 || entity.deudas.length > 0)
    return COLORS.alertMedium;
  return COLORS.accent;
}

function getRiskBadge(score: number) {
  if (score >= 75) return { label: "Riesgo alto", color: COLORS.alertHigh };
  if (score >= 50) return { label: "Riesgo medio", color: COLORS.alertMedium };
  return { label: "Riesgo bajo", color: COLORS.ok };
}

// ── Module definitions ──
const MODULES = [
  { id: "social", label: "Kit Redes Sociales", icon: Instagram, pro: false, priority: true },
  { id: "informe", label: "Informe PDF", icon: FileText, pro: false },
  { id: "narrativa", label: "Narrativa IA", icon: PenTool, pro: false },
  { id: "twitter", label: "Hilo X/Twitter", icon: Twitter, pro: false },
  { id: "linkedin", label: "Post LinkedIn", icon: Linkedin, pro: true },
  { id: "denuncia", label: "Kit Denuncia", icon: FileCheck, pro: true },
  { id: "comparador", label: "Comparador", icon: GitCompare, pro: true },
  { id: "monitor", label: "Monitor", icon: Bell, pro: true },
];

// ════════════════════════════════════════
// MODULE: Instagram Denuncia Card (1080×1080)
// ════════════════════════════════════════
function renderDenunciaCard(
  canvas: HTMLCanvasElement,
  entity: EntidadEdicion
) {
  const S = 1080;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const alertColor = getAlertColor(entity);

  // Background
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, S, S);

  // Left alert stripe
  ctx.fillStyle = alertColor;
  ctx.fillRect(0, 0, 12, S);

  // Subtle grid pattern
  ctx.strokeStyle = "rgba(59,130,246,0.04)";
  ctx.lineWidth = 1;
  for (let i = 0; i < S; i += 40) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
  }

  // Top bar background
  ctx.fillStyle = "rgba(17,24,39,0.9)";
  ctx.fillRect(12, 0, S - 12, 80);
  ctx.fillStyle = alertColor;
  ctx.fillRect(12, 78, S - 12, 2);

  // Logo VIGILIA (top left)
  ctx.fillStyle = COLORS.accent;
  ctx.beginPath();
  ctx.arc(52, 40, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(52, 40, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = "bold 20px Inter, system-ui, sans-serif";
  ctx.fillStyle = COLORS.text;
  ctx.fillText("VIGILIA", 76, 46);

  // Source badge (top right)
  const badgeText = "DATOS OFICIALES";
  ctx.font = "bold 14px Inter, system-ui, sans-serif";
  const badgeW = ctx.measureText(badgeText).width + 24;
  drawRoundedRect(ctx, S - badgeW - 40, 24, badgeW, 32, 4);
  ctx.fillStyle = "rgba(59,130,246,0.15)";
  ctx.fill();
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = COLORS.accent;
  ctx.fillText(badgeText, S - badgeW - 28, 46);

  // Entity type icon area
  const iconY = 130;
  ctx.fillStyle = alertColor + "15";
  drawRoundedRect(ctx, 60, iconY, 80, 80, 12);
  ctx.fill();
  ctx.strokeStyle = alertColor + "40";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Entity icon
  ctx.fillStyle = alertColor;
  ctx.font = "40px Inter, system-ui, sans-serif";
  ctx.fillText(entity.tipo === "Person" ? "👤" : "🏢", 76, iconY + 56);

  // Entity name
  ctx.fillStyle = COLORS.text;
  ctx.font = "bold 36px Inter, system-ui, sans-serif";
  wrapText(ctx, entity.nombre, 160, iconY + 36, S - 220, 44, 2);

  // Risk score badge
  const risk = getRiskBadge(entity.riskScore);
  const riskY = iconY + 68;
  drawRoundedRect(ctx, 160, riskY, 140, 28, 14);
  ctx.fillStyle = risk.color + "20";
  ctx.fill();
  ctx.strokeStyle = risk.color;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = risk.color;
  ctx.font = "bold 14px Inter, system-ui, sans-serif";
  ctx.fillText(`● ${risk.label} — ${entity.riskScore}/100`, 172, riskY + 19);

  // Sector / domicilio
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = "18px Inter, system-ui, sans-serif";
  if (entity.sector) ctx.fillText(entity.sector, 160, riskY + 56);

  // ── TITULAR IMPACTANTE ──
  const titularY = 320;
  ctx.fillStyle = alertColor + "08";
  ctx.fillRect(40, titularY - 10, S - 80, 140);
  ctx.fillStyle = alertColor;
  ctx.fillRect(40, titularY - 10, 4, 140);

  ctx.fillStyle = COLORS.text;
  ctx.font = "bold 34px Inter, system-ui, sans-serif";
  wrapText(ctx, entity.titular, 60, titularY + 34, S - 120, 42, 3);

  // ── 3 Key data points ──
  const dataY = 510;
  const dataItems = [
    {
      icon: "💰",
      label: "Contratos públicos",
      value: entity.totalContratosPublicos > 0
        ? `${entity.totalContratosPublicos.toLocaleString("es-ES")} adj.`
        : "N/A (cargo político)",
    },
    {
      icon: "⚠️",
      label: "Sin concurso",
      value: entity.contratosSinConcurso > 0
        ? `${entity.contratosSinConcurso} contratos`
        : "Sin datos",
    },
    {
      icon: "🔗",
      label: "Conexiones detectadas",
      value: `${entity.totalConexiones} entidades`,
    },
  ];

  dataItems.forEach((item, i) => {
    const y = dataY + i * 80;
    // Background card
    drawRoundedRect(ctx, 40, y, S - 80, 68, 8);
    ctx.fillStyle = COLORS.bgCard + "cc";
    ctx.fill();
    ctx.strokeStyle = COLORS.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = "28px Inter, system-ui, sans-serif";
    ctx.fillText(item.icon, 60, y + 44);

    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = "16px Inter, system-ui, sans-serif";
    ctx.fillText(item.label, 104, y + 28);

    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 22px Inter, system-ui, sans-serif";
    ctx.fillText(item.value, 104, y + 54);
  });

  // ── Alert signals summary ──
  const alertY = 770;
  if (entity.señalesAlerta.length > 0) {
    const topAlerts = entity.señalesAlerta.slice(0, 2);
    topAlerts.forEach((alerta, i) => {
      const y = alertY + i * 50;
      const dotColor =
        alerta.tipo === "critica" ? COLORS.alertHigh :
        alerta.tipo === "alta" ? COLORS.alertMedium :
        COLORS.accent;
      ctx.fillStyle = dotColor;
      ctx.beginPath();
      ctx.arc(56, y + 16, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.text;
      ctx.font = "bold 16px Inter, system-ui, sans-serif";
      ctx.fillText(alerta.titulo, 74, y + 20);
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = "13px Inter, system-ui, sans-serif";
      ctx.fillText(`Fuente: ${alerta.fuente}`, 74, y + 38);
    });
  }

  // ── Bottom bar ──
  ctx.fillStyle = COLORS.bgCard;
  ctx.fillRect(0, S - 80, S, 80);
  ctx.fillStyle = COLORS.border;
  ctx.fillRect(0, S - 80, S, 1);

  // Bottom left — VIGILIA branding
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = "14px Inter, system-ui, sans-serif";
  ctx.fillText("vigilia.es", 40, S - 48);
  ctx.fillStyle = COLORS.textSecondary;
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillText(
    `Fuentes: ${entity.fuentesPrincipales.slice(0, 4).join(", ")}`,
    40, S - 28
  );

  // Bottom right — date
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = "12px Inter, system-ui, sans-serif";
  const date = new Date().toLocaleDateString("es-ES", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
  ctx.textAlign = "right";
  ctx.fillText(`Generado: ${date}`, S - 40, S - 36);
  ctx.textAlign = "left";
}

// ════════════════════════════════════════
// MODULE: Carousel slides (1080×1080 each)
// ════════════════════════════════════════
function renderCarouselSlide(
  canvas: HTMLCanvasElement,
  entity: EntidadEdicion,
  slideNum: number,
  totalSlides: number
) {
  const S = 1080;
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d")!;
  const alertColor = getAlertColor(entity);

  // Base
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, S, S);
  // Subtle grid
  ctx.strokeStyle = "rgba(59,130,246,0.03)";
  ctx.lineWidth = 1;
  for (let i = 0; i < S; i += 60) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(S, i); ctx.stroke();
  }

  // Top fixed elements
  // Logo
  ctx.fillStyle = COLORS.accent;
  ctx.font = "bold 16px Inter, system-ui, sans-serif";
  ctx.fillText("VIGILIA", 40, 44);
  // Slide number
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = "14px Inter, system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(`${slideNum} / ${totalSlides}`, S - 40, 44);
  ctx.textAlign = "left";

  // Bottom alert stripe
  ctx.fillStyle = alertColor;
  ctx.fillRect(0, S - 6, S, 6);

  // ── Slide content ──
  const contentY = 80;
  const pad = 60;

  switch (slideNum) {
    case 1: { // Portada
      ctx.fillStyle = alertColor;
      ctx.fillRect(pad, contentY + 100, 60, 4);
      ctx.fillStyle = COLORS.text;
      ctx.font = "bold 52px Inter, system-ui, sans-serif";
      wrapText(ctx, entity.nombre, pad, contentY + 180, S - pad * 2, 60, 3);

      ctx.fillStyle = alertColor;
      ctx.font = "bold 28px Inter, system-ui, sans-serif";
      wrapText(ctx, entity.titular, pad, contentY + 360, S - pad * 2, 36, 4);

      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = "22px Inter, system-ui, sans-serif";
      ctx.fillText("Desliza para ver la investigación →", pad, S - 120);

      ctx.fillStyle = COLORS.textMuted;
      ctx.font = "16px Inter, system-ui, sans-serif";
      ctx.fillText("Datos de fuentes públicas oficiales", pad, S - 80);
      break;
    }
    case 2: { // ¿Quién es?
      ctx.fillStyle = alertColor;
      ctx.font = "bold 36px Inter, system-ui, sans-serif";
      ctx.fillText("¿Quién es?", pad, contentY + 60);
      ctx.fillStyle = alertColor;
      ctx.fillRect(pad, contentY + 72, 120, 3);

      ctx.fillStyle = COLORS.text;
      ctx.font = "bold 28px Inter, system-ui, sans-serif";
      ctx.fillText(entity.nombre, pad, contentY + 140);

      const fields = [
        ["Tipo", entity.tipo === "Person" ? "Persona" : "Empresa"],
        ["Sector", entity.sector || "—"],
        ["Provincia", entity.provincia || "—"],
        entity.nif ? ["NIF", entity.nif] : null,
        entity.estado ? ["Estado", entity.estado] : null,
      ].filter(Boolean) as string[][];

      fields.forEach(([label, val], i) => {
        const y = contentY + 200 + i * 70;
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = "16px Inter, system-ui, sans-serif";
        ctx.fillText(label, pad, y);
        ctx.fillStyle = COLORS.text;
        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        wrapText(ctx, val, pad, y + 30, S - pad * 2, 28, 2);
      });

      if (entity.cargosPublicos.length > 0) {
        const cy = contentY + 200 + fields.length * 70 + 20;
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = "16px Inter, system-ui, sans-serif";
        ctx.fillText("Cargos públicos", pad, cy);
        entity.cargosPublicos.slice(0, 2).forEach((c, i) => {
          ctx.fillStyle = COLORS.text;
          ctx.font = "bold 20px Inter, system-ui, sans-serif";
          ctx.fillText(`${c.cargo}`, pad, cy + 30 + i * 50);
          ctx.fillStyle = COLORS.textSecondary;
          ctx.font = "16px Inter, system-ui, sans-serif";
          ctx.fillText(`${c.institucion} · Desde ${c.desde.substring(0, 4)}`, pad, cy + 52 + i * 50);
        });
      }
      break;
    }
    case 3: { // Los contratos
      ctx.fillStyle = alertColor;
      ctx.font = "bold 36px Inter, system-ui, sans-serif";
      ctx.fillText("Los contratos", pad, contentY + 60);
      ctx.fillStyle = alertColor;
      ctx.fillRect(pad, contentY + 72, 160, 3);

      // Summary stats
      const total = entity.contratos.reduce((s, c) => s + c.importe, 0);
      ctx.fillStyle = COLORS.text;
      ctx.font = "bold 56px Inter, system-ui, sans-serif";
      ctx.fillText(formatMoney(total), pad, contentY + 170);
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = "18px Inter, system-ui, sans-serif";
      ctx.fillText(`en ${entity.contratos.length} contratos documentados`, pad, contentY + 206);

      // Top contracts
      entity.contratos.slice(0, 4).forEach((c, i) => {
        const y = contentY + 260 + i * 120;
        drawRoundedRect(ctx, pad, y, S - pad * 2, 100, 8);
        ctx.fillStyle = COLORS.bgCard;
        ctx.fill();
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = COLORS.text;
        ctx.font = "bold 18px Inter, system-ui, sans-serif";
        wrapText(ctx, c.titulo, pad + 16, y + 30, S - pad * 2 - 200, 24, 2);

        ctx.fillStyle = alertColor;
        ctx.font = "bold 20px Inter, system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(formatMoneyShort(c.importe), S - pad - 16, y + 34);
        ctx.textAlign = "left";

        ctx.fillStyle = COLORS.textMuted;
        ctx.font = "14px Inter, system-ui, sans-serif";
        ctx.fillText(`${c.adjudicador} · ${c.fecha.substring(0, 4)}`, pad + 16, y + 74);

        if (c.procedimiento.includes("Negociado") || c.procedimiento === "Directo") {
          drawRoundedRect(ctx, pad + 16, y + 52, 110, 20, 4);
          ctx.fillStyle = COLORS.alertHigh + "20";
          ctx.fill();
          ctx.fillStyle = COLORS.alertHigh;
          ctx.font = "bold 11px Inter, system-ui, sans-serif";
          ctx.fillText("SIN CONCURSO", pad + 24, y + 66);
        }
      });
      break;
    }
    case 4: { // Sin concurso
      ctx.fillStyle = COLORS.alertMedium;
      ctx.font = "bold 36px Inter, system-ui, sans-serif";
      ctx.fillText("¿Sin concurso?", pad, contentY + 60);
      ctx.fillStyle = COLORS.alertMedium;
      ctx.fillRect(pad, contentY + 72, 180, 3);

      const sinConcurso = entity.contratos.filter(
        (c) => c.procedimiento.includes("Negociado") || c.procedimiento === "Directo"
      );
      const totalSC = sinConcurso.reduce((s, c) => s + c.importe, 0);

      ctx.fillStyle = COLORS.alertHigh;
      ctx.font = "bold 56px Inter, system-ui, sans-serif";
      ctx.fillText(sinConcurso.length > 0 ? formatMoney(totalSC) : "Sin datos", pad, contentY + 170);

      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = "18px Inter, system-ui, sans-serif";
      ctx.fillText(
        sinConcurso.length > 0
          ? `${sinConcurso.length} contratos adjudicados sin licitación abierta`
          : `${entity.contratosSinConcurso} contratos sin concurso registrados en PLACE`,
        pad, contentY + 206
      );

      // Explanation box
      drawRoundedRect(ctx, pad, contentY + 250, S - pad * 2, 160, 8);
      ctx.fillStyle = COLORS.alertMedium + "10";
      ctx.fill();
      ctx.strokeStyle = COLORS.alertMedium + "40";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = COLORS.alertMedium;
      ctx.fillRect(pad, contentY + 250, 4, 160);

      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = "16px Inter, system-ui, sans-serif";
      wrapText(
        ctx,
        "El procedimiento negociado sin publicidad permite adjudicar contratos sin competencia abierta. Esto reduce la transparencia y puede favorecer a empresas con acceso privilegiado al adjudicador.",
        pad + 20, contentY + 286, S - pad * 2 - 40, 24, 5
      );

      // List
      sinConcurso.slice(0, 3).forEach((c, i) => {
        const y = contentY + 450 + i * 90;
        ctx.fillStyle = COLORS.alertHigh;
        ctx.beginPath();
        ctx.arc(pad + 8, y + 16, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.text;
        ctx.font = "bold 18px Inter, system-ui, sans-serif";
        wrapText(ctx, c.titulo, pad + 24, y + 20, S - pad * 2 - 180, 24, 2);
        ctx.fillStyle = COLORS.alertHigh;
        ctx.font = "bold 18px Inter, system-ui, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(formatMoneyShort(c.importe), S - pad, y + 20);
        ctx.textAlign = "left";
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = "14px Inter, system-ui, sans-serif";
        ctx.fillText(c.adjudicador, pad + 24, y + 50);
      });
      break;
    }
    case 5: { // Conexiones
      ctx.fillStyle = COLORS.accent;
      ctx.font = "bold 36px Inter, system-ui, sans-serif";
      ctx.fillText("Las conexiones", pad, contentY + 60);
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(pad, contentY + 72, 180, 3);

      ctx.fillStyle = COLORS.text;
      ctx.font = "bold 48px Inter, system-ui, sans-serif";
      ctx.fillText(`${entity.totalConexiones}`, pad, contentY + 160);
      ctx.fillStyle = COLORS.textSecondary;
      ctx.font = "18px Inter, system-ui, sans-serif";
      ctx.fillText("entidades vinculadas en el grafo", pad + 80, contentY + 158);

      entity.conexiones.slice(0, 6).forEach((c, i) => {
        const y = contentY + 210 + i * 100;
        drawRoundedRect(ctx, pad, y, S - pad * 2, 84, 8);
        ctx.fillStyle = COLORS.bgCard;
        ctx.fill();
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1;
        ctx.stroke();

        const typeColor =
          c.tipo === "Person" ? COLORS.accent :
          c.tipo === "Company" ? COLORS.ok :
          c.tipo === "Investigation" ? COLORS.alertHigh :
          COLORS.alertMedium;

        ctx.fillStyle = typeColor;
        ctx.beginPath();
        ctx.arc(pad + 24, y + 42, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = COLORS.text;
        ctx.font = "bold 18px Inter, system-ui, sans-serif";
        ctx.fillText(c.nombre, pad + 44, y + 34);
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = "14px Inter, system-ui, sans-serif";
        ctx.fillText(`${c.relacion} · ${c.relevancia}`, pad + 44, y + 58);
      });
      break;
    }
    case 6: { // Deudas y sanciones
      ctx.fillStyle = COLORS.alertHigh;
      ctx.font = "bold 36px Inter, system-ui, sans-serif";
      ctx.fillText("Deudas y sanciones", pad, contentY + 60);
      ctx.fillStyle = COLORS.alertHigh;
      ctx.fillRect(pad, contentY + 72, 220, 3);

      let cy = contentY + 130;

      if (entity.deudas.length > 0) {
        ctx.fillStyle = COLORS.text;
        ctx.font = "bold 24px Inter, system-ui, sans-serif";
        ctx.fillText("Deuda tributaria", pad, cy);
        cy += 10;
        entity.deudas.forEach((d) => {
          cy += 50;
          drawRoundedRect(ctx, pad, cy, S - pad * 2, 100, 8);
          ctx.fillStyle = COLORS.alertHigh + "10";
          ctx.fill();
          ctx.strokeStyle = COLORS.alertHigh + "30";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = COLORS.alertHigh;
          ctx.font = "bold 32px Inter, system-ui, sans-serif";
          ctx.fillText(formatMoney(d.importe), pad + 20, cy + 42);
          ctx.fillStyle = COLORS.textSecondary;
          ctx.font = "16px Inter, system-ui, sans-serif";
          ctx.fillText(`${d.organismo} · Ejercicio ${d.ejercicio}`, pad + 20, cy + 72);
          ctx.fillText(`Fuente: ${d.fuente}`, pad + 20, cy + 92);
          cy += 100;
        });
      } else {
        ctx.fillStyle = COLORS.ok;
        ctx.font = "18px Inter, system-ui, sans-serif";
        ctx.fillText("✓ Sin deudas tributarias registradas", pad, cy + 40);
        cy += 60;
      }

      cy += 30;
      if (entity.sanciones.length > 0) {
        ctx.fillStyle = COLORS.text;
        ctx.font = "bold 24px Inter, system-ui, sans-serif";
        ctx.fillText("Sanciones", pad, cy);
        entity.sanciones.forEach((s) => {
          cy += 50;
          drawRoundedRect(ctx, pad, cy, S - pad * 2, 140, 8);
          ctx.fillStyle = COLORS.alertHigh + "10";
          ctx.fill();
          ctx.fillStyle = COLORS.alertHigh;
          ctx.font = "bold 28px Inter, system-ui, sans-serif";
          ctx.fillText(formatMoney(s.importe), pad + 20, cy + 36);
          ctx.fillStyle = COLORS.text;
          ctx.font = "bold 16px Inter, system-ui, sans-serif";
          ctx.fillText(`${s.tipo} — ${s.organismo}`, pad + 20, cy + 64);
          ctx.fillStyle = COLORS.textSecondary;
          ctx.font = "14px Inter, system-ui, sans-serif";
          wrapText(ctx, s.motivo, pad + 20, cy + 88, S - pad * 2 - 40, 20, 3);
          cy += 140;
        });
      } else {
        ctx.fillStyle = COLORS.ok;
        ctx.font = "18px Inter, system-ui, sans-serif";
        ctx.fillText("✓ Sin sanciones activas registradas", pad, cy + 30);
      }
      break;
    }
    case 7: { // Offshore
      ctx.fillStyle = entity.offshore.aparece ? COLORS.alertHigh : COLORS.ok;
      ctx.font = "bold 36px Inter, system-ui, sans-serif";
      ctx.fillText("Offshore", pad, contentY + 60);
      ctx.fillRect(pad, contentY + 72, 100, 3);

      if (entity.offshore.aparece) {
        ctx.fillStyle = COLORS.alertHigh;
        ctx.font = "bold 52px Inter, system-ui, sans-serif";
        ctx.fillText("⚠️ DETECTADO", pad, contentY + 180);

        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = "18px Inter, system-ui, sans-serif";
        ctx.fillText(`Fuente: ${entity.offshore.fuente}`, pad, contentY + 220);

        ctx.fillStyle = COLORS.text;
        ctx.font = "bold 22px Inter, system-ui, sans-serif";
        ctx.fillText("Entidades vinculadas:", pad, contentY + 290);

        (entity.offshore.entidades || []).forEach((e, i) => {
          const y = contentY + 330 + i * 70;
          drawRoundedRect(ctx, pad, y, S - pad * 2, 56, 8);
          ctx.fillStyle = COLORS.alertHigh + "10";
          ctx.fill();
          ctx.strokeStyle = COLORS.alertHigh + "30";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = COLORS.text;
          ctx.font = "bold 18px Inter, system-ui, sans-serif";
          ctx.fillText(e, pad + 20, y + 36);
        });

        // Explanation
        drawRoundedRect(ctx, pad, contentY + 580, S - pad * 2, 120, 8);
        ctx.fillStyle = COLORS.alertMedium + "10";
        ctx.fill();
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = "15px Inter, system-ui, sans-serif";
        wrapText(
          ctx,
          "Las estructuras offshore pueden ser legales pero reducen la transparencia fiscal y pueden facilitar prácticas de evasión. Datos procedentes de la base de datos del ICIJ.",
          pad + 16, contentY + 610, S - pad * 2 - 32, 22, 5
        );
      } else {
        ctx.fillStyle = COLORS.ok;
        ctx.font = "bold 48px Inter, system-ui, sans-serif";
        ctx.fillText("✓", pad, contentY + 180);
        ctx.fillStyle = COLORS.text;
        ctx.font = "bold 28px Inter, system-ui, sans-serif";
        ctx.fillText("Sin presencia offshore detectada", pad + 60, contentY + 178);
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = "18px Inter, system-ui, sans-serif";
        wrapText(
          ctx,
          "No se han encontrado entidades vinculadas en la base de datos del ICIJ (Offshore Leaks, Papeles de Panamá, Pandora Papers).",
          pad, contentY + 240, S - pad * 2, 26, 4
        );
      }
      break;
    }
    case 8: { // Cargo público
      ctx.fillStyle = COLORS.accent;
      ctx.font = "bold 36px Inter, system-ui, sans-serif";
      ctx.fillText("El cargo público", pad, contentY + 60);
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(pad, contentY + 72, 200, 3);

      if (entity.cargosPublicos.length > 0) {
        entity.cargosPublicos.forEach((c, i) => {
          const y = contentY + 130 + i * 160;
          drawRoundedRect(ctx, pad, y, S - pad * 2, 140, 8);
          ctx.fillStyle = COLORS.bgCard;
          ctx.fill();
          ctx.strokeStyle = COLORS.accent + "40";
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = COLORS.accent;
          ctx.font = "bold 24px Inter, system-ui, sans-serif";
          ctx.fillText(c.cargo, pad + 20, y + 36);
          ctx.fillStyle = COLORS.text;
          ctx.font = "18px Inter, system-ui, sans-serif";
          ctx.fillText(c.institucion, pad + 20, y + 66);
          ctx.fillStyle = COLORS.textMuted;
          ctx.font = "16px Inter, system-ui, sans-serif";
          ctx.fillText(
            `${c.desde.substring(0, 4)} — ${c.hasta ? c.hasta.substring(0, 4) : "Actualidad"}`,
            pad + 20, y + 94
          );
          ctx.fillText(`Fuente: ${c.fuente}`, pad + 20, y + 118);
        });

        if (entity.contratos.length > 0 && entity.cargosPublicos.length > 0) {
          const overlapY = contentY + 130 + entity.cargosPublicos.length * 160 + 30;
          drawRoundedRect(ctx, pad, overlapY, S - pad * 2, 120, 8);
          ctx.fillStyle = COLORS.alertMedium + "15";
          ctx.fill();
          ctx.fillStyle = COLORS.alertMedium;
          ctx.fillRect(pad, overlapY, 4, 120);
          ctx.font = "bold 18px Inter, system-ui, sans-serif";
          ctx.fillText("⚠️ Solapamiento temporal detectado", pad + 20, overlapY + 36);
          ctx.fillStyle = COLORS.textSecondary;
          ctx.font = "16px Inter, system-ui, sans-serif";
          wrapText(
            ctx,
            "Durante su mandato, entidades de su entorno recibieron contratos públicos adjudicados por los organismos bajo su dirección.",
            pad + 20, overlapY + 66, S - pad * 2 - 40, 22, 3
          );
        }
      } else {
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = "18px Inter, system-ui, sans-serif";
        ctx.fillText("Sin cargos públicos registrados", pad, contentY + 160);
        ctx.font = "16px Inter, system-ui, sans-serif";
        wrapText(
          ctx,
          "Esta entidad no consta con cargos en instituciones públicas en las bases de datos consultadas (BOE, Congreso, Senado).",
          pad, contentY + 200, S - pad * 2, 24, 3
        );
      }
      break;
    }
    case 9: { // Mapa de red (simplified)
      ctx.fillStyle = COLORS.accent;
      ctx.font = "bold 36px Inter, system-ui, sans-serif";
      ctx.fillText("Mapa de red", pad, contentY + 60);
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(pad, contentY + 72, 160, 3);

      // Draw a simplified network visualization
      const centerX = S / 2;
      const centerY = S / 2 + 40;
      const radius = 260;

      // Center node
      ctx.fillStyle = alertColor;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.text;
      ctx.font = "bold 14px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      const shortName = entity.nombre.split(" ").slice(0, 2).join(" ");
      ctx.fillText(shortName, centerX, centerY + 5);
      ctx.textAlign = "left";

      // Connection nodes
      entity.conexiones.slice(0, 8).forEach((c, i) => {
        const angle = (i / Math.min(entity.conexiones.length, 8)) * Math.PI * 2 - Math.PI / 2;
        const nx = centerX + radius * Math.cos(angle);
        const ny = centerY + radius * Math.sin(angle);

        // Edge
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        // Node
        const nodeColor =
          c.tipo === "Person" ? COLORS.accent :
          c.tipo === "Company" ? COLORS.ok :
          c.tipo === "Investigation" ? COLORS.alertHigh :
          c.tipo.includes("Sanction") ? COLORS.alertHigh :
          COLORS.alertMedium;

        ctx.fillStyle = nodeColor;
        ctx.beginPath();
        ctx.arc(nx, ny, 24, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = COLORS.text;
        ctx.font = "bold 11px Inter, system-ui, sans-serif";
        ctx.textAlign = "center";
        const label = c.nombre.split(" ").slice(0, 2).join(" ");
        ctx.fillText(label, nx, ny + 4);
        ctx.textAlign = "left";
      });

      // Legend
      const legendY = S - 140;
      const legendItems = [
        { color: COLORS.accent, label: "Persona" },
        { color: COLORS.ok, label: "Empresa" },
        { color: COLORS.alertHigh, label: "Sanción/Invest." },
        { color: COLORS.alertMedium, label: "Organismo" },
      ];
      legendItems.forEach((item, i) => {
        const lx = pad + i * 200;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(lx + 8, legendY + 8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = "14px Inter, system-ui, sans-serif";
        ctx.fillText(item.label, lx + 22, legendY + 13);
      });
      break;
    }
    case 10: { // Fuentes
      ctx.fillStyle = COLORS.accent;
      ctx.font = "bold 36px Inter, system-ui, sans-serif";
      ctx.fillText("Fuentes", pad, contentY + 60);
      ctx.fillStyle = COLORS.accent;
      ctx.fillRect(pad, contentY + 72, 100, 3);

      const sources = [
        { name: "BORME", desc: "Boletín Oficial del Registro Mercantil" },
        { name: "PLACE", desc: "Plataforma de Contratación del Estado" },
        { name: "BOE", desc: "Boletín Oficial del Estado" },
        { name: "AEAT", desc: "Agencia Estatal de Administración Tributaria" },
        { name: "CNMC", desc: "Comisión Nacional de los Mercados y la Competencia" },
        { name: "ICIJ", desc: "International Consortium of Investigative Journalists" },
        { name: "Congreso", desc: "Congreso de los Diputados" },
        { name: "CNMV", desc: "Comisión Nacional del Mercado de Valores" },
      ];

      sources.forEach((s, i) => {
        const y = contentY + 120 + i * 68;
        ctx.fillStyle = COLORS.accent;
        ctx.font = "bold 20px Inter, system-ui, sans-serif";
        ctx.fillText(s.name, pad, y + 20);
        ctx.fillStyle = COLORS.textSecondary;
        ctx.font = "16px Inter, system-ui, sans-serif";
        ctx.fillText(s.desc, pad, y + 46);
      });

      // CTA
      const ctaY = S - 200;
      drawRoundedRect(ctx, pad, ctaY, S - pad * 2, 80, 8);
      ctx.fillStyle = COLORS.accent + "15";
      ctx.fill();
      ctx.strokeStyle = COLORS.accent;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = COLORS.text;
      ctx.font = "bold 24px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Investiga en vigilia.es", S / 2, ctaY + 48);
      ctx.textAlign = "left";

      // Disclaimer
      ctx.fillStyle = COLORS.textMuted;
      ctx.font = "13px Inter, system-ui, sans-serif";
      wrapText(
        ctx,
        "Datos de fuentes públicas oficiales. No constituye acusación. Verificar antes de publicar.",
        pad, S - 90, S - pad * 2, 18, 2
      );
      break;
    }
  }
}

// ════════════════════════════════════════
// MODULE: Twitter Thread Generator
// ════════════════════════════════════════
function generateTwitterThread(entity: EntidadEdicion): string[] {
  const tweets: string[] = [];
  const total = entity.contratos.reduce((s, c) => s + c.importe, 0);

  tweets.push(
    `🧵 HILO: ${entity.nombre} y sus vínculos con la contratación pública.\nUn hilo con datos oficiales. Fuentes al final. 👇`
  );

  const basicInfo = entity.tipo === "Person"
    ? `📋 ${entity.nombre}\n🏛️ ${entity.cargosPublicos.length > 0 ? entity.cargosPublicos[0].cargo : "Sin cargo público"}\n📍 ${entity.provincia || "España"}\n[Fuente: ${entity.fuentesPrincipales[0]}]`
    : `📋 NIF: ${entity.nif}\n🏢 Sector: ${entity.sector}\n📍 ${entity.domicilio || entity.provincia || "España"}\n[Fuente: BORME]`;
  tweets.push(basicInfo);

  if (entity.totalContratosPublicos > 0 || entity.contratos.length > 0) {
    tweets.push(
      `Contratos públicos:\n💰 Total: ${formatMoney(total)}\n📄 Nº adjudicaciones: ${entity.totalContratosPublicos.toLocaleString("es-ES")}\n${entity.contratos.length > 0 ? `🏛️ Principal adjudicador: ${entity.contratos[0].adjudicador}` : ""}\n[Fuente: PLACE]`
    );
  }

  if (entity.contratosSinConcurso > 0) {
    const sinConcurso = entity.contratos.filter(
      (c) => c.procedimiento.includes("Negociado") || c.procedimiento === "Directo"
    );
    const totalSC = sinConcurso.reduce((s, c) => s + c.importe, 0);
    tweets.push(
      `⚠️ ${entity.contratosSinConcurso} contratos adjudicados SIN CONCURSO por un total de ${formatMoney(totalSC)}.\nAdjudicados por procedimiento negociado sin publicidad: sin competencia abierta.\n[Fuente: PLACE]`
    );
  }

  entity.contratos.slice(0, 3).forEach((c) => {
    const scTag = (c.procedimiento.includes("Negociado") || c.procedimiento === "Directo") ? " ⚠️ SIN CONCURSO" : "";
    tweets.push(
      `📄 "${c.titulo}"\n💰 ${formatMoney(c.importe)}\n🏛️ ${c.adjudicador} · ${c.fecha.substring(0, 4)}${scTag}\n[Fuente: ${c.fuente}]`
    );
  });

  if (entity.deudas.length > 0) {
    entity.deudas.forEach((d) => {
      tweets.push(
        `🔴 Deuda tributaria: ${formatMoney(d.importe)}\n${d.organismo} · Ejercicio ${d.ejercicio}\n[Fuente: ${d.fuente}]`
      );
    });
  }

  if (entity.sanciones.length > 0) {
    entity.sanciones.forEach((s) => {
      tweets.push(
        `🔴 Sanción: ${formatMoney(s.importe)}\n${s.tipo} — ${s.organismo}\n${s.motivo.substring(0, 180)}\n[Fuente: ${s.fuente}]`
      );
    });
  }

  if (entity.offshore.aparece) {
    tweets.push(
      `🌍 Aparece en ${entity.offshore.fuente}.\nEntidades vinculadas: ${(entity.offshore.entidades || []).join(", ")}\n[Fuente: ICIJ]`
    );
  }

  tweets.push(
    `⚠️ Señales de alerta detectadas:\n${entity.señalesAlerta.slice(0, 3).map((s) => `• ${s.titulo}`).join("\n")}\nTodos los datos son públicos y verificables.`
  );

  tweets.push(
    `🔍 Investigación completa en:\nvigilia.es/entidad/${entity.id}\n\n#Transparencia #DatosAbiertos #España`
  );

  return tweets;
}

// ════════════════════════════════════════
// MODULE: LinkedIn Post Generator
// ════════════════════════════════════════
function generateLinkedInPost(entity: EntidadEdicion): string {
  const total = entity.contratos.reduce((s, c) => s + c.importe, 0);
  const sinConcurso = entity.contratos.filter(
    (c) => c.procedimiento.includes("Negociado") || c.procedimiento === "Directo"
  );
  const totalSC = sinConcurso.reduce((s, c) => s + c.importe, 0);
  const topAlert = entity.señalesAlerta[0];

  let post = "";

  // Hook paragraph
  if (topAlert) {
    post += `${topAlert.titulo}: lo que los datos públicos revelan sobre ${entity.nombre}.\n\n`;
  } else {
    post += `¿Qué dicen los datos públicos sobre ${entity.nombre}? Un análisis basado exclusivamente en fuentes oficiales.\n\n`;
  }

  // Context
  if (entity.tipo === "Company") {
    post += `${entity.nombre} (NIF: ${entity.nif}) opera en el sector de ${entity.sector?.toLowerCase() || "actividad empresarial"} con domicilio en ${entity.domicilio || entity.provincia || "España"}. `;
    if (entity.totalContratosPublicos > 0) {
      post += `Cuenta con ${entity.totalContratosPublicos.toLocaleString("es-ES")} adjudicaciones registradas en la Plataforma de Contratación del Estado.\n\n`;
    }
  } else {
    post += `${entity.nombre} ${entity.cargosPublicos.length > 0 ? `ocupa el cargo de ${entity.cargosPublicos[0].cargo} en ${entity.cargosPublicos[0].institucion}` : "es una figura pública"}. `;
    post += `El análisis de su red de conexiones revela vínculos con ${entity.totalConexiones} entidades en el grafo de VIGILIA.\n\n`;
  }

  // Data
  if (entity.contratos.length > 0) {
    post += `📊 Datos clave de contratación:\n`;
    post += `• Volumen total documentado: ${formatMoney(total)}\n`;
    if (sinConcurso.length > 0) {
      post += `• Contratos sin concurso abierto: ${sinConcurso.length} (${formatMoney(totalSC)})\n`;
    }
    post += `• Principal adjudicador: ${entity.contratos[0].adjudicador}\n\n`;
  }

  if (entity.señalesAlerta.length > 0) {
    post += `⚠️ Señales de alerta identificadas:\n`;
    entity.señalesAlerta.forEach((s) => {
      post += `• ${s.titulo} [${s.fuente}]\n`;
    });
    post += `\n`;
  }

  // Reflection
  post += `La transparencia institucional no es un lujo, es una condición necesaria para la democracia. Herramientas como VIGILIA permiten que cualquier ciudadano acceda a los mismos datos que antes solo estaban al alcance de investigadores especializados.\n\n`;
  post += `Todos estos datos proceden de fuentes públicas oficiales: ${entity.fuentesPrincipales.join(", ")}.\n\n`;
  post += `⚖️ Disclaimer: Datos de fuentes públicas oficiales. No constituye acusación. Verificar antes de publicar.\n\n`;
  post += `🔍 Investigación completa: vigilia.es\n\n`;
  post += `#Transparencia #Accountability #DatosAbiertos #España #Contratación`;

  return post;
}

// ════════════════════════════════════════
// MODULE: Narrative Generator
// ════════════════════════════════════════
type NarrativeMode = "prensa" | "denuncia" | "ciudadana" | "osint" | "instagram" | "pie";

function generateNarrative(entity: EntidadEdicion, mode: NarrativeMode): string {
  const total = entity.contratos.reduce((s, c) => s + c.importe, 0);
  const sinConcurso = entity.contratos.filter(
    (c) => c.procedimiento.includes("Negociado") || c.procedimiento === "Directo"
  );
  const totalSC = sinConcurso.reduce((s, c) => s + c.importe, 0);

  switch (mode) {
    case "prensa":
      return generatePressRelease(entity, total, sinConcurso, totalSC);
    case "denuncia":
      return generateComplaintSummary(entity, total, sinConcurso, totalSC);
    case "ciudadana":
      return generateCitizenExplanation(entity, total, sinConcurso, totalSC);
    case "osint":
      return generateOSINTReport(entity, total, sinConcurso, totalSC);
    case "instagram":
      return generateInstagramCaption(entity, total, sinConcurso, totalSC);
    case "pie":
      return generatePhotoCaption(entity, total, totalSC);
  }
}

function generatePressRelease(entity: EntidadEdicion, total: number, sinConcurso: any[], totalSC: number): string {
  let text = `NOTA DE PRENSA — ${new Date().toLocaleDateString("es-ES")}\n\n`;
  text += `${entity.titular}\n\n`;
  text += entity.resumen + "\n\n";
  if (entity.contratos.length > 0) {
    text += `Según los registros de la Plataforma de Contratación del Estado (PLACE), ${entity.nombre} acumula contratos por valor de ${formatMoney(total)}. `;
    if (sinConcurso.length > 0) {
      text += `De estos, ${sinConcurso.length} fueron adjudicados por procedimiento negociado sin publicidad, sumando ${formatMoney(totalSC)} sin competencia abierta.\n\n`;
    }
  }
  entity.señalesAlerta.forEach((s) => {
    text += `• ${s.titulo}: ${s.descripcion} [${s.fuente}]\n`;
  });
  text += `\nFuentes: ${entity.fuentesPrincipales.join(", ")}\n`;
  text += `\nDisclaimer: Datos de fuentes públicas oficiales. No constituye acusación. Verificar antes de publicar.`;
  return text;
}

function generateComplaintSummary(entity: EntidadEdicion, total: number, sinConcurso: any[], totalSC: number): string {
  let text = `RESUMEN PARA DENUNCIA\nEntidad: ${entity.nombre}\nIdentificador: ${entity.nif || entity.id}\nFecha de elaboración: ${new Date().toLocaleDateString("es-ES")}\n\n`;
  text += `HECHOS DOCUMENTADOS:\n\n`;
  entity.cronologia.forEach((c, i) => {
    text += `${i + 1}. ${c.fecha} — ${c.titulo}\n   ${c.descripcion}\n   Fuente: ${c.fuente}\n\n`;
  });
  if (sinConcurso.length > 0) {
    text += `CONTRATOS SIN CONCURSO PÚBLICO:\n`;
    text += `Total: ${sinConcurso.length} contratos por ${formatMoney(totalSC)}\n\n`;
    sinConcurso.forEach((c) => {
      text += `- "${c.titulo}" · ${formatMoney(c.importe)} · ${c.adjudicador} · ${c.fecha}\n  Procedimiento: ${c.procedimiento}\n  Fuente: ${c.fuente}\n\n`;
    });
  }
  text += `SEÑALES DE ALERTA:\n`;
  entity.señalesAlerta.forEach((s) => {
    text += `- [${s.tipo.toUpperCase()}] ${s.titulo}\n  ${s.descripcion}\n  Fuente: ${s.fuente}\n\n`;
  });
  text += `\nNota: Todos los datos proceden de fuentes públicas oficiales. No se emite valoración jurídica alguna.`;
  return text;
}

function generateCitizenExplanation(entity: EntidadEdicion, total: number, sinConcurso: any[], totalSC: number): string {
  let text = `¿QUÉ SABEMOS DE ${entity.nombre.toUpperCase()}?\n\nExplicado de forma sencilla:\n\n`;
  if (entity.tipo === "Company") {
    text += `${entity.nombre} es una empresa del sector de ${entity.sector?.toLowerCase() || "actividades empresariales"}. `;
    if (entity.totalContratosPublicos > 0) {
      text += `Ha recibido ${entity.totalContratosPublicos.toLocaleString("es-ES")} contratos del Estado — es decir, trabajos pagados con dinero público, el dinero de todos.\n\n`;
    }
  } else {
    text += `${entity.nombre} es ${entity.cargosPublicos.length > 0 ? entity.cargosPublicos[0].cargo : "una figura pública en España"}.\n\n`;
  }
  if (sinConcurso.length > 0) {
    text += `Lo que llama la atención: ${sinConcurso.length} de sus contratos se dieron "sin concurso". Esto significa que no hubo una competición abierta donde otras empresas pudieran presentar ofertas. El total de estos contratos sin competencia: ${formatMoney(totalSC)}.\n\n`;
    text += `¿Por qué importa? Cuando no hay concurso, no sabemos si el precio fue justo o si otra empresa podría haberlo hecho mejor y más barato.\n\n`;
  }
  entity.señalesAlerta.slice(0, 3).forEach((s) => {
    text += `⚠️ ${s.titulo}\n${s.descripcion}\n\n`;
  });
  text += `Todo esto viene de bases de datos públicas oficiales (${entity.fuentesPrincipales.join(", ")}). No es una acusación — son datos. Pero merece atención.\n\n`;
  text += `Más información: vigilia.es`;
  return text;
}

function generateOSINTReport(entity: EntidadEdicion, total: number, sinConcurso: any[], totalSC: number): string {
  let text = `OSINT REPORT — ${entity.nombre}\nGenerated: ${new Date().toISOString()}\nEntity ID: ${entity.id}\nNIF: ${entity.nif || "N/A"}\nType: ${entity.tipo}\nRisk Score: ${entity.riskScore}/100\n\n`;
  text += `=== DATA SOURCES ===\n`;
  entity.fuentesPrincipales.forEach((f) => {
    text += `[+] ${f}\n`;
  });
  text += `\n=== CONTRACTS ===\nTotal volume: ${formatMoney(total)}\nNo-bid contracts: ${sinConcurso.length} (${formatMoney(totalSC)})\nTotal adjudications: ${entity.totalContratosPublicos}\n\n`;
  text += `=== CONNECTIONS ===\n`;
  entity.conexiones.forEach((c) => {
    text += `[${c.tipo}] ${c.nombre} — ${c.relacion} (${c.relevancia})\n`;
  });
  text += `\n=== RISK SIGNALS ===\n`;
  entity.señalesAlerta.forEach((s) => {
    text += `[${s.tipo.toUpperCase()}] ${s.titulo}\n  Detail: ${s.descripcion}\n  Source: ${s.fuente}\n\n`;
  });
  text += `\n=== TIMELINE ===\n`;
  entity.cronologia.forEach((c) => {
    text += `${c.fecha} | ${c.titulo} | ${c.descripcion} [${c.fuente}]\n`;
  });
  text += `\n=== OFFSHORE ===\n`;
  text += entity.offshore.aparece
    ? `DETECTED — ${entity.offshore.fuente}\nEntities: ${(entity.offshore.entidades || []).join(", ")}\n`
    : `NOT DETECTED in ICIJ databases\n`;
  return text;
}

function generateInstagramCaption(entity: EntidadEdicion, total: number, sinConcurso: any[], totalSC: number): string {
  let text = `🔍 ${entity.titular}\n\n`;
  text += `${entity.nombre} — lo que dicen los datos oficiales:\n\n`;
  if (total > 0) text += `💰 ${formatMoney(total)} en contratos públicos\n`;
  if (sinConcurso.length > 0) text += `⚠️ ${sinConcurso.length} contratos SIN CONCURSO (${formatMoney(totalSC)})\n`;
  text += `🔗 ${entity.totalConexiones} conexiones detectadas\n`;
  if (entity.sanciones.length > 0) text += `🔴 ${entity.sanciones.length} sanción(es) activa(s)\n`;
  if (entity.offshore.aparece) text += `🌍 Presencia offshore detectada (ICIJ)\n`;
  text += `\n`;
  entity.señalesAlerta.slice(0, 2).forEach((s) => {
    text += `• ${s.titulo}\n`;
  });
  text += `\nTodos los datos de fuentes públicas oficiales.\n\n`;
  text += `🔗 Link en bio: vigilia.es\n\n`;
  text += `#Transparencia #DatosAbiertos #España #Contratación #Accountability`;
  return text;
}

function generatePhotoCaption(entity: EntidadEdicion, total: number, totalSC: number): string {
  const topAlert = entity.señalesAlerta[0];
  if (topAlert) {
    return `${entity.nombre}: ${topAlert.titulo.toLowerCase()}. Datos oficiales en vigilia.es`;
  }
  if (total > 0) {
    return `${entity.nombre}: ${formatMoney(total)} en contratos públicos. Datos oficiales.`;
  }
  return `${entity.nombre}: ${entity.totalConexiones} conexiones en el grafo de VIGILIA. Datos oficiales.`;
}

// ════════════════════════════════════════
// MODULE: PDF Report Generator
// ════════════════════════════════════════
async function generatePDFReport(entity: EntidadEdicion) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 20;
  const contentW = W - margin * 2;
  let y = 20;

  const addPage = () => { doc.addPage(); y = 20; };
  const checkPage = (needed: number) => { if (y + needed > 275) addPage(); };

  // ── Cover Page ──
  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, W, 297, "F");

  // Logo area
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.circle(W / 2, 60, 20);
  doc.circle(W / 2, 60, 8);
  doc.setFillColor(59, 130, 246);
  doc.circle(W / 2, 60, 3, "F");

  doc.setTextColor(243, 244, 246);
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.text("VIGILIA", W / 2, 95, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(156, 163, 175);
  doc.text("Informe de Investigación", W / 2, 105, { align: "center" });

  // Entity name
  doc.setFontSize(20);
  doc.setTextColor(243, 244, 246);
  doc.setFont("helvetica", "bold");
  const nameLines = doc.splitTextToSize(entity.nombre, contentW);
  doc.text(nameLines, W / 2, 140, { align: "center" });

  // Ref number
  const refNum = `VIG-${Date.now().toString(36).toUpperCase()}`;
  doc.setFontSize(10);
  doc.setTextColor(107, 114, 128);
  doc.text(`Referencia: ${refNum}`, W / 2, 170, { align: "center" });
  doc.text(
    `Fecha: ${new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}`,
    W / 2, 178, { align: "center" }
  );

  // Risk score
  const risk = getRiskBadge(entity.riskScore);
  doc.setFontSize(14);
  doc.setTextColor(
    risk.color === COLORS.alertHigh ? 220 : risk.color === COLORS.alertMedium ? 245 : 16,
    risk.color === COLORS.alertHigh ? 38 : risk.color === COLORS.alertMedium ? 158 : 185,
    risk.color === COLORS.alertHigh ? 38 : risk.color === COLORS.alertMedium ? 11 : 129,
  );
  doc.text(`${risk.label} — ${entity.riskScore}/100`, W / 2, 200, { align: "center" });

  // Disclaimer
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  const disclaimer = "Datos de fuentes públicas oficiales. No constituye acusación. Verificar antes de publicar.";
  doc.text(disclaimer, W / 2, 275, { align: "center" });

  // ── Page 2: Executive Summary ──
  addPage();
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, W, 297, "F");

  doc.setTextColor(10, 14, 26);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen ejecutivo", margin, y);
  y += 3;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 40, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(55, 65, 81);
  const summaryLines = doc.splitTextToSize(entity.resumen, contentW);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 10;

  // Identity card
  checkPage(60);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(10, 14, 26);
  doc.text("Ficha de identidad", margin, y);
  y += 8;

  const idFields = [
    ["Nombre", entity.nombre],
    ["Tipo", entity.tipo === "Person" ? "Persona" : "Empresa"],
    ["NIF", entity.nif || "N/A"],
    ["Sector", entity.sector || "N/A"],
    ["Domicilio", entity.domicilio || "N/A"],
    ["Provincia", entity.provincia || "N/A"],
    ["Estado", entity.estado || "N/A"],
  ];

  idFields.forEach(([label, value]) => {
    checkPage(8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text(value || "—", margin + 35, y);
    y += 6;
  });
  y += 6;

  // Contracts table
  if (entity.contratos.length > 0) {
    checkPage(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 14, 26);
    doc.text("Contratos públicos", margin, y);
    y += 8;

    // Table header
    doc.setFillColor(243, 244, 246);
    doc.rect(margin, y, contentW, 7, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    doc.text("Título", margin + 2, y + 5);
    doc.text("Adjudicador", margin + 72, y + 5);
    doc.text("Importe", margin + 120, y + 5);
    doc.text("Proced.", margin + 145, y + 5);
    y += 9;

    entity.contratos.forEach((c) => {
      checkPage(12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const isSC = c.procedimiento.includes("Negociado") || c.procedimiento === "Directo";
      doc.setTextColor(55, 65, 81);
      const titleLines = doc.splitTextToSize(c.titulo, 68);
      doc.text(titleLines, margin + 2, y);
      doc.text(doc.splitTextToSize(c.adjudicador, 45), margin + 72, y);
      doc.text(formatMoney(c.importe), margin + 120, y);
      if (isSC) {
        doc.setTextColor(220, 38, 38);
        doc.setFont("helvetica", "bold");
      }
      doc.text(c.procedimiento, margin + 145, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(55, 65, 81);
      y += Math.max(titleLines.length * 4, 6) + 2;
    });
    y += 6;
  }

  // Risk signals
  checkPage(30);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(10, 14, 26);
  doc.text("Señales de alerta", margin, y);
  y += 8;

  entity.señalesAlerta.forEach((s) => {
    checkPage(24);
    const dotColor =
      s.tipo === "critica" ? [220, 38, 38] :
      s.tipo === "alta" ? [245, 158, 11] :
      [16, 185, 129];
    doc.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
    doc.circle(margin + 3, y - 1, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 14, 26);
    doc.text(s.titulo, margin + 8, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    const descLines = doc.splitTextToSize(s.descripcion, contentW - 8);
    doc.text(descLines, margin + 8, y);
    y += descLines.length * 4;
    doc.setTextColor(107, 114, 128);
    doc.setFontSize(7);
    doc.text(`Fuente: ${s.fuente}`, margin + 8, y);
    y += 7;
  });

  // Timeline
  if (entity.cronologia.length > 0) {
    checkPage(30);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 14, 26);
    doc.text("Cronología", margin, y);
    y += 8;

    entity.cronologia.forEach((c) => {
      checkPage(14);
      doc.setFillColor(59, 130, 246);
      doc.circle(margin + 3, y, 1.5, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(59, 130, 246);
      doc.text(c.fecha, margin + 8, y + 1);
      doc.setTextColor(10, 14, 26);
      doc.text(c.titulo, margin + 32, y + 1);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(7);
      doc.text(`${c.descripcion} [${c.fuente}]`, margin + 32, y + 1);
      y += 7;
    });
  }

  // Sources
  checkPage(30);
  y += 4;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(10, 14, 26);
  doc.text("Fuentes y referencias", margin, y);
  y += 8;

  entity.fuentesPrincipales.forEach((f) => {
    checkPage(8);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(75, 85, 99);
    doc.text(`• ${f}`, margin + 4, y);
    y += 5;
  });

  // Footer disclaimer on last page
  doc.setFontSize(7);
  doc.setTextColor(156, 163, 175);
  doc.text(disclaimer, W / 2, 288, { align: "center" });

  // Save
  const filename = `VIGILIA_informe_${entity.nombre.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().substring(0, 10)}.pdf`;
  doc.save(filename);
}

// ════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════
export default function EdicionPage() {
  const [activeModule, setActiveModule] = useState("social");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<EntidadEdicion[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<EntidadEdicion | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Social submodule
  const [socialTab, setSocialTab] = useState<"tarjeta" | "carrusel" | "story">("tarjeta");
  const [carouselSlide, setCarouselSlide] = useState(1);

  // Narrative mode
  const [narrativeMode, setNarrativeMode] = useState<NarrativeMode>("prensa");

  // Canvas refs
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);
  const carouselCanvasRef = useRef<HTMLCanvasElement>(null);

  const { toast } = useToast();

  // Search handler
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const results = buscarEntidadesEdicion(searchQuery);
      setSearchResults(results);
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  }, [searchQuery]);

  // Render canvas when entity/tab changes
  useEffect(() => {
    if (!selectedEntity) return;
    if (activeModule === "social" && socialTab === "tarjeta" && cardCanvasRef.current) {
      renderDenunciaCard(cardCanvasRef.current, selectedEntity);
    }
  }, [selectedEntity, activeModule, socialTab]);

  useEffect(() => {
    if (!selectedEntity) return;
    if (activeModule === "social" && socialTab === "carrusel" && carouselCanvasRef.current) {
      renderCarouselSlide(carouselCanvasRef.current, selectedEntity, carouselSlide, 10);
    }
  }, [selectedEntity, activeModule, socialTab, carouselSlide]);

  const selectEntity = (entity: EntidadEdicion) => {
    setSelectedEntity(entity);
    setSearchQuery("");
    setShowSearch(false);
  };

  const downloadCanvas = useCallback((canvas: HTMLCanvasElement | null, filename: string) => {
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Descargado", description: filename });
    }, "image/png");
  }, [toast]);

  const downloadAllCarousel = useCallback(() => {
    if (!selectedEntity) return;
    const tmpCanvas = document.createElement("canvas");
    for (let i = 1; i <= 10; i++) {
      renderCarouselSlide(tmpCanvas, selectedEntity, i, 10);
      tmpCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `VIGILIA_carrusel_${i.toString().padStart(2, "0")}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    }
    toast({ title: "Descargando 10 slides", description: "Los archivos se descargarán individualmente" });
  }, [selectedEntity, toast]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copiado", description: `${label} copiado al portapapeles` });
    }).catch(() => {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast({ title: "Copiado", description: `${label} copiado al portapapeles` });
    });
  }, [toast]);

  const downloadText = useCallback((text: string, filename: string) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Descargado", description: filename });
  }, [toast]);

  // ── RENDER ──
  return (
    <div className="flex h-screen bg-[#0a0e1a] text-gray-100 overflow-hidden">
      {/* ── Module Sidebar ── */}
      <aside
        className={`flex flex-col border-r border-gray-800/60 bg-[#0d1117] transition-all duration-200 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800/60">
          <Link href="/" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span className="text-xs font-medium">Volver</span>}
          </Link>
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="ml-auto text-gray-500 hover:text-gray-300 transition-colors"
            data-testid="btn-toggle-sidebar"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-b border-gray-800/60">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold tracking-wide text-gray-200">EDICIÓN</span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Material publicable</p>
          </div>
        )}

        {/* Module list */}
        <ScrollArea className="flex-1">
          <nav className="px-2 py-3 space-y-0.5">
            {MODULES.map((mod) => {
              const active = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  data-testid={`module-${mod.id}`}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 border border-transparent"
                  }`}
                >
                  <mod.icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-blue-400" : ""}`} />
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{mod.label}</span>
                      {mod.priority && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-blue-500/30 text-blue-400 bg-blue-500/5">
                          PRIOR.
                        </Badge>
                      )}
                      {mod.pro && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-400 bg-amber-500/5">
                          PRO
                        </Badge>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Plan info */}
        {!sidebarCollapsed && (
          <div className="px-4 py-3 border-t border-gray-800/60">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Shield className="w-3.5 h-3.5" />
              <span>Plan Básico</span>
            </div>
            <button className="mt-2 w-full text-xs text-center py-1.5 rounded border border-blue-500/30 text-blue-400 hover:bg-blue-500/10 transition-colors">
              Actualizar a Pro — 29€/mes
            </button>
          </div>
        )}
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar with search */}
        <header className="flex items-center gap-3 px-6 py-3 border-b border-gray-800/60 bg-[#0d1117]/80 backdrop-blur-sm">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar entidad (nombre o NIF)..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-900/80 border border-gray-700/60 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
              data-testid="input-entity-search"
            />
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#111827] border border-gray-700/60 rounded-lg shadow-xl z-50 overflow-hidden">
                {searchResults.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => selectEntity(e)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800/50 transition-colors text-left"
                    data-testid={`result-${e.id}`}
                  >
                    {e.tipo === "Person" ? (
                      <User className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    ) : (
                      <Building2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{e.nombre}</p>
                      <p className="text-xs text-gray-500">{e.sector} · Riesgo: {e.riskScore}/100</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedEntity && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/40">
              {selectedEntity.tipo === "Person" ? (
                <User className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="text-sm font-medium text-gray-300 truncate max-w-[200px]">
                {selectedEntity.nombre}
              </span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5"
                style={{
                  borderColor: getRiskBadge(selectedEntity.riskScore).color + "40",
                  color: getRiskBadge(selectedEntity.riskScore).color,
                }}
              >
                {selectedEntity.riskScore}/100
              </Badge>
            </div>
          )}
        </header>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {!selectedEntity ? (
              /* ── No entity selected ── */
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-6">
                  <Search className="w-8 h-8 text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-200 mb-2">Selecciona una entidad</h2>
                <p className="text-sm text-gray-500 max-w-md mb-8">
                  Busca una persona o empresa en la barra superior. Todos los módulos de edición trabajarán sobre la entidad seleccionada.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                  {Object.values(ENTIDADES_EDICION).map((e) => (
                    <button
                      key={e.id}
                      onClick={() => selectEntity(e)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-900/50 border border-gray-800/60 hover:border-blue-500/30 hover:bg-gray-800/50 transition-all text-left"
                      data-testid={`quick-select-${e.id}`}
                    >
                      {e.tipo === "Person" ? (
                        <User className="w-5 h-5 text-blue-400" />
                      ) : (
                        <Building2 className="w-5 h-5 text-emerald-400" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-300 truncate">{e.nombre}</p>
                        <p className="text-[11px] text-gray-500">{e.sector}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Module content ── */
              <div>
                {/* ══ SOCIAL MEDIA KIT ══ */}
                {activeModule === "social" && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-lg font-bold text-gray-200">Kit de Redes Sociales</h2>
                        <p className="text-xs text-gray-500 mt-1">
                          Contenido visual listo para publicar en Instagram, X/Twitter y LinkedIn
                        </p>
                      </div>
                    </div>

                    <Tabs value={socialTab} onValueChange={(v) => setSocialTab(v as any)}>
                      <TabsList className="bg-gray-900/80 border border-gray-700/40 mb-6">
                        <TabsTrigger value="tarjeta" className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400">
                          Tarjeta 1080×1080
                        </TabsTrigger>
                        <TabsTrigger value="carrusel" className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400">
                          Carrusel (10 slides)
                        </TabsTrigger>
                        <TabsTrigger value="story" className="text-xs data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400">
                          Historia 1080×1920
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    {socialTab === "tarjeta" && (
                      <div className="flex flex-col lg:flex-row gap-6">
                        <div className="flex-1 flex justify-center">
                          <div className="relative" style={{ maxWidth: 540 }}>
                            <canvas
                              ref={cardCanvasRef}
                              className="w-full rounded-lg border border-gray-700/40 shadow-2xl"
                              style={{ aspectRatio: "1/1" }}
                            />
                          </div>
                        </div>
                        <div className="w-full lg:w-72 space-y-3">
                          <Button
                            onClick={() => downloadCanvas(cardCanvasRef.current, `VIGILIA_tarjeta_${selectedEntity.nombre.replace(/\s/g, "_")}.png`)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            data-testid="btn-download-card"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Descargar PNG
                          </Button>
                          <div className="rounded-lg bg-gray-900/50 border border-gray-700/30 p-4">
                            <p className="text-xs text-gray-400 mb-2 font-medium">Formato</p>
                            <p className="text-sm text-gray-300">1080×1080 px — Instagram / LinkedIn Feed</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Color de alerta: {getAlertColor(selectedEntity) === COLORS.alertHigh ? "Rojo (sanciones/offshore)" : getAlertColor(selectedEntity) === COLORS.alertMedium ? "Naranja (irregularidades)" : "Azul (informativo)"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {socialTab === "carrusel" && (
                      <div>
                        <div className="flex flex-col lg:flex-row gap-6">
                          <div className="flex-1 flex justify-center">
                            <div className="relative" style={{ maxWidth: 540 }}>
                              <canvas
                                ref={carouselCanvasRef}
                                className="w-full rounded-lg border border-gray-700/40 shadow-2xl"
                                style={{ aspectRatio: "1/1" }}
                              />
                              {/* Navigation */}
                              <div className="flex items-center justify-between mt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={carouselSlide <= 1}
                                  onClick={() => setCarouselSlide((s) => Math.max(1, s - 1))}
                                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                  data-testid="btn-prev-slide"
                                >
                                  <ChevronLeft className="w-4 h-4 mr-1" />
                                  Anterior
                                </Button>
                                <span className="text-sm text-gray-400 font-medium">
                                  {carouselSlide} / 10
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={carouselSlide >= 10}
                                  onClick={() => setCarouselSlide((s) => Math.min(10, s + 1))}
                                  className="border-gray-700 text-gray-300 hover:bg-gray-800"
                                  data-testid="btn-next-slide"
                                >
                                  Siguiente
                                  <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                              </div>
                              {/* Slide dots */}
                              <div className="flex justify-center gap-1.5 mt-3">
                                {Array.from({ length: 10 }, (_, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setCarouselSlide(i + 1)}
                                    className={`w-2 h-2 rounded-full transition-all ${
                                      carouselSlide === i + 1 ? "bg-blue-400 w-4" : "bg-gray-600 hover:bg-gray-500"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="w-full lg:w-72 space-y-3">
                            <Button
                              onClick={downloadAllCarousel}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                              data-testid="btn-download-carousel"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Descargar 10 slides (PNG)
                            </Button>
                            <div className="rounded-lg bg-gray-900/50 border border-gray-700/30 p-4 space-y-2">
                              <p className="text-xs text-gray-400 font-medium">Estructura del carrusel</p>
                              {["Portada", "¿Quién es?", "Los contratos", "¿Sin concurso?", "Conexiones", "Deudas y sanciones", "Offshore", "Cargo público", "Mapa de red", "Fuentes"].map((title, i) => (
                                <button
                                  key={i}
                                  onClick={() => setCarouselSlide(i + 1)}
                                  className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
                                    carouselSlide === i + 1
                                      ? "bg-blue-500/10 text-blue-400"
                                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"
                                  }`}
                                >
                                  <span className="text-gray-600 mr-2">{i + 1}.</span>
                                  {title}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {socialTab === "story" && (
                      <StoryModule entity={selectedEntity} downloadCanvas={downloadCanvas} />
                    )}
                  </div>
                )}

                {/* ══ TWITTER THREAD ══ */}
                {activeModule === "twitter" && (
                  <TwitterModule entity={selectedEntity} copyToClipboard={copyToClipboard} downloadText={downloadText} />
                )}

                {/* ══ LINKEDIN ══ */}
                {activeModule === "linkedin" && (
                  <LinkedInModule entity={selectedEntity} copyToClipboard={copyToClipboard} downloadText={downloadText} />
                )}

                {/* ══ PDF REPORT ══ */}
                {activeModule === "informe" && (
                  <PDFModule entity={selectedEntity} />
                )}

                {/* ══ NARRATIVE ══ */}
                {activeModule === "narrativa" && (
                  <NarrativaModule
                    entity={selectedEntity}
                    mode={narrativeMode}
                    setMode={setNarrativeMode}
                    copyToClipboard={copyToClipboard}
                    downloadText={downloadText}
                  />
                )}

                {/* ══ DENUNCIA KIT ══ */}
                {activeModule === "denuncia" && (
                  <DenunciaModule entity={selectedEntity} copyToClipboard={copyToClipboard} downloadText={downloadText} />
                )}

                {/* ══ COMPARADOR ══ */}
                {activeModule === "comparador" && (
                  <ComparadorModule entities={Object.values(ENTIDADES_EDICION)} />
                )}

                {/* ══ MONITOR ══ */}
                {activeModule === "monitor" && (
                  <MonitorModule entity={selectedEntity} />
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Story Module ──
function StoryModule({
  entity,
  downloadCanvas,
}: {
  entity: EntidadEdicion;
  downloadCanvas: (canvas: HTMLCanvasElement | null, filename: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const alertColor = getAlertColor(entity);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d")!;
    const W = 1080;
    const H = 1920;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, COLORS.bg);
    grad.addColorStop(0.5, "#0f172a");
    grad.addColorStop(1, COLORS.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(59,130,246,0.03)";
    for (let i = 0; i < W; i += 60) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
    }
    for (let i = 0; i < H; i += 60) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
    }

    // Logo
    ctx.fillStyle = COLORS.accent;
    ctx.font = "bold 24px Inter, system-ui, sans-serif";
    ctx.fillText("VIGILIA", 60, 80);

    // Main stat (biggest number)
    const total = entity.contratos.reduce((s, c) => s + c.importe, 0);
    const mainStat = total > 0 ? formatMoney(total) : `${entity.totalConexiones} conexiones`;
    const mainLabel = total > 0 ? "en contratos públicos" : "detectadas en el grafo";

    ctx.fillStyle = alertColor;
    ctx.font = "bold 100px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(mainStat, W / 2, H / 2 - 40);

    ctx.fillStyle = COLORS.text;
    ctx.font = "28px Inter, system-ui, sans-serif";
    ctx.fillText(mainLabel, W / 2, H / 2 + 30);
    ctx.textAlign = "left";

    // Entity name
    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 36px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    wrapText(ctx, entity.nombre, W / 2 - 400, H / 2 + 120, 800, 44, 2);
    ctx.textAlign = "left";

    // Titular
    ctx.fillStyle = COLORS.textSecondary;
    ctx.font = "24px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    wrapText(ctx, entity.titular, 60, H / 2 + 260, W - 120, 32, 3);
    ctx.textAlign = "left";

    // Bottom
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = "20px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Más datos en vigilia.es", W / 2, H - 140);
    ctx.fillText(`Fuentes: ${entity.fuentesPrincipales.slice(0, 3).join(", ")}`, W / 2, H - 100);
    ctx.textAlign = "left";

    // Alert stripe bottom
    ctx.fillStyle = alertColor;
    ctx.fillRect(0, H - 8, W, 8);
  }, [entity, alertColor]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div>
        <h2 className="text-lg font-bold text-gray-200 mb-1">Historia de Instagram</h2>
        <p className="text-xs text-gray-500">Formato 1080×1920 — Stories / Reels cover</p>
      </div>
      <div style={{ maxWidth: 300 }}>
        <canvas
          ref={canvasRef}
          className="w-full rounded-lg border border-gray-700/40 shadow-2xl"
          style={{ aspectRatio: "9/16" }}
        />
      </div>
      <Button
        onClick={() =>
          downloadCanvas(canvasRef.current, `VIGILIA_story_${entity.nombre.replace(/\s/g, "_")}.png`)
        }
        className="bg-blue-600 hover:bg-blue-700 text-white"
        data-testid="btn-download-story"
      >
        <Download className="w-4 h-4 mr-2" />
        Descargar PNG (1080×1920)
      </Button>
    </div>
  );
}

// ── Twitter Module ──
function TwitterModule({
  entity,
  copyToClipboard,
  downloadText,
}: {
  entity: EntidadEdicion;
  copyToClipboard: (text: string, label: string) => void;
  downloadText: (text: string, filename: string) => void;
}) {
  const tweets = generateTwitterThread(entity);
  const fullThread = tweets.map((t, i) => `[${i + 1}/${tweets.length}] ${t}`).join("\n\n");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-200">Hilo de X/Twitter</h2>
          <p className="text-xs text-gray-500 mt-1">{tweets.length} tweets · Solo hechos documentados con fuentes</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(fullThread, "Hilo completo")}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            data-testid="btn-copy-thread"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copiar todo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadText(fullThread, `VIGILIA_hilo_${entity.nombre.replace(/\s/g, "_")}.txt`)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            data-testid="btn-download-thread"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            .txt
          </Button>
        </div>
      </div>

      <div className="space-y-3 max-w-2xl">
        {tweets.map((tweet, i) => (
          <div
            key={i}
            className="rounded-lg bg-gray-900/50 border border-gray-700/30 p-4 group hover:border-blue-500/20 transition-colors"
          >
            <div className="flex items-start justify-between">
              <span className="text-[10px] text-gray-600 font-mono">[{i + 1}/{tweets.length}]</span>
              <button
                onClick={() => copyToClipboard(`[${i + 1}/${tweets.length}] ${tweet}`, `Tweet ${i + 1}`)}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-all"
                data-testid={`btn-copy-tweet-${i}`}
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap mt-1">{tweet}</p>
            <div className="flex justify-end mt-2">
              <span className={`text-[10px] ${tweet.length > 280 ? "text-red-400" : "text-gray-600"}`}>
                {tweet.length}/280
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── LinkedIn Module ──
function LinkedInModule({
  entity,
  copyToClipboard,
  downloadText,
}: {
  entity: EntidadEdicion;
  copyToClipboard: (text: string, label: string) => void;
  downloadText: (text: string, filename: string) => void;
}) {
  const post = generateLinkedInPost(entity);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-200">Post LinkedIn</h2>
          <p className="text-xs text-gray-500 mt-1">Formato ejecutivo · {post.length} caracteres</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(post, "Post LinkedIn")}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            data-testid="btn-copy-linkedin"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copiar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadText(post, `VIGILIA_linkedin_${entity.nombre.replace(/\s/g, "_")}.txt`)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            data-testid="btn-download-linkedin"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            .txt
          </Button>
        </div>
      </div>

      <div className="max-w-2xl rounded-lg bg-gray-900/50 border border-gray-700/30 p-6">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-800/50">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Linkedin className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-300">VIGILIA</p>
            <p className="text-[11px] text-gray-500">Transparencia + IA</p>
          </div>
        </div>
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{post}</p>
      </div>
    </div>
  );
}

// ── PDF Module ──
function PDFModule({ entity }: { entity: EntidadEdicion }) {
  const [generating, setGenerating] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-200">Informe PDF Profesional</h2>
          <p className="text-xs text-gray-500 mt-1">Documento formal de investigación con todos los datos de la entidad</p>
        </div>
      </div>

      <div className="max-w-2xl space-y-4">
        {/* Preview of what the PDF contains */}
        <div className="rounded-lg bg-gray-900/50 border border-gray-700/30 p-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-300">Contenido del informe:</h3>
          {[
            { icon: FileText, label: "Portada con logo VIGILIA y referencia única" },
            { icon: Scroll, label: "Resumen ejecutivo (redacción periodística)" },
            { icon: User, label: "Ficha de identidad: datos registrales, NIF, sector" },
            { icon: Building2, label: `Tabla de contratos públicos (${entity.contratos.length} registrados)` },
            { icon: AlertTriangle, label: `Señales de alerta (${entity.señalesAlerta.length} detectadas)` },
            { icon: Clock, label: `Cronología de hechos (${entity.cronologia.length} eventos)` },
            { icon: Share2, label: "Fuentes y referencias con URLs" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm text-gray-400">
              <item.icon className="w-4 h-4 text-gray-600 flex-shrink-0" />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={async () => {
            setGenerating(true);
            try {
              await generatePDFReport(entity);
            } finally {
              setGenerating(false);
            }
          }}
          disabled={generating}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          data-testid="btn-generate-pdf"
        >
          <FileText className="w-4 h-4 mr-2" />
          {generating ? "Generando..." : "Generar y descargar PDF"}
        </Button>

        <p className="text-[11px] text-gray-600">
          Nombre: VIGILIA_informe_{entity.nombre.replace(/[^a-zA-Z0-9]/g, "_")}_{new Date().toISOString().substring(0, 10)}.pdf
        </p>
      </div>
    </div>
  );
}

// ── Narrativa Module ──
function NarrativaModule({
  entity,
  mode,
  setMode,
  copyToClipboard,
  downloadText,
}: {
  entity: EntidadEdicion;
  mode: NarrativeMode;
  setMode: (m: NarrativeMode) => void;
  copyToClipboard: (text: string, label: string) => void;
  downloadText: (text: string, filename: string) => void;
}) {
  const modes: { id: NarrativeMode; label: string; desc: string }[] = [
    { id: "prensa", label: "Nota de prensa", desc: "Periodístico formal, pirámide invertida" },
    { id: "denuncia", label: "Resumen para denuncia", desc: "Neutral, jurídico, sin calificativos" },
    { id: "ciudadana", label: "Explicación ciudadana", desc: "Sencillo, sin jerga, accesible" },
    { id: "osint", label: "Ficha OSINT", desc: "Técnico, con timestamps" },
    { id: "instagram", label: "Caption Instagram", desc: "Directo, impactante, con emojis" },
    { id: "pie", label: "Pie de foto", desc: "Máx 280 chars, dato clave" },
  ];

  const narrative = generateNarrative(entity, mode);
  const currentMode = modes.find((m) => m.id === mode)!;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-200">Generador de Narrativa</h2>
          <p className="text-xs text-gray-500 mt-1">Texto explicativo basado en datos del grafo · 6 modos</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(narrative, currentMode.label)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            data-testid="btn-copy-narrative"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copiar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadText(narrative, `VIGILIA_${mode}_${entity.nombre.replace(/\s/g, "_")}.txt`)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            data-testid="btn-download-narrative"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            .txt
          </Button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6 max-w-2xl">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`text-left px-3 py-2.5 rounded-lg border transition-all ${
              mode === m.id
                ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                : "bg-gray-900/30 border-gray-800/50 text-gray-400 hover:text-gray-300 hover:bg-gray-800/30"
            }`}
            data-testid={`btn-mode-${m.id}`}
          >
            <p className="text-sm font-medium">{m.label}</p>
            <p className="text-[10px] mt-0.5 opacity-60">{m.desc}</p>
          </button>
        ))}
      </div>

      {/* Output */}
      <div className="max-w-2xl rounded-lg bg-gray-900/50 border border-gray-700/30 p-6">
        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{narrative}</p>
      </div>

      <p className="text-[10px] text-gray-600 mt-3 max-w-2xl">
        Disclaimer: Datos de fuentes públicas oficiales. No constituye acusación. El texto generado debe verificarse antes de su publicación.
      </p>
    </div>
  );
}

// ── Denuncia Module ──
function DenunciaModule({
  entity,
  copyToClipboard,
  downloadText,
}: {
  entity: EntidadEdicion;
  copyToClipboard: (text: string, label: string) => void;
  downloadText: (text: string, filename: string) => void;
}) {
  const sinConcurso = entity.contratos.filter(
    (c) => c.procedimiento.includes("Negociado") || c.procedimiento === "Directo"
  );
  const totalSC = sinConcurso.reduce((s, c) => s + c.importe, 0);

  const denunciaText = `AL JUZGADO DE INSTRUCCIÓN / A LA FISCALÍA ANTICORRUPCIÓN

DENUNCIA

DENUNCIANTE: [Nombre y apellidos del denunciante]
DNI: [DNI del denunciante]
Domicilio: [Dirección del denunciante]

DENUNCIADO/A: ${entity.nombre}
${entity.nif ? `NIF: ${entity.nif}` : ""}
${entity.domicilio ? `Domicilio fiscal: ${entity.domicilio}` : ""}

HECHOS

${entity.cronologia.map((c, i) => `${i + 1}º.- Con fecha ${c.fecha}, ${c.descripcion.toLowerCase()}. [Fuente: ${c.fuente}]`).join("\n\n")}

${sinConcurso.length > 0 ? `${entity.cronologia.length + 1}º.- Consta que ${entity.nombre} ha recibido ${sinConcurso.length} contratos públicos adjudicados por procedimiento negociado sin publicidad, por un importe total de ${formatMoney(totalSC)}, sin que mediara concurso público abierto. [Fuente: PLACE]` : ""}

FUNDAMENTOS JURÍDICOS

Los hechos descritos podrían ser constitutivos de los siguientes tipos delictivos:

- Artículo 404 del Código Penal — Prevaricación administrativa: aplicable si se acredita que las adjudicaciones se realizaron a sabiendas de su injusticia.

- Artículos 419 a 427 del Código Penal — Cohecho: aplicable si se determina que existió contraprestación o beneficio particular vinculado a las adjudicaciones.

- Artículo 390 del Código Penal — Falsedad documental: aplicable si se demuestra la manipulación de documentos en los procedimientos de contratación.

- Artículos 432-433 del Código Penal — Malversación: aplicable si se acredita desvío de fondos públicos.

- Artículo 436 del Código Penal — Fraude en contratación pública: aplicable si se demuestra la concertación previa entre funcionario y contratista.

PRUEBAS DOCUMENTALES

Se acompañan como prueba documental:

${entity.fuentesPrincipales.map((f, i) => `${i + 1}. Consulta a la base de datos ${f} (fecha de acceso: ${new Date().toLocaleDateString("es-ES")})`).join("\n")}

OTROSÍ DIGO

Que para el caso de que se considere procedente, se solicita la adopción de medidas cautelares, en particular la suspensión de los contratos públicos vigentes con la entidad denunciada y el bloqueo preventivo de los importes pendientes de cobro.

Por lo expuesto,

SUPLICO que teniendo por presentado este escrito, se sirva admitirlo, y en su virtud tenga por formulada DENUNCIA contra ${entity.nombre}, y tras los trámites legales oportunos, se proceda a la investigación de los hechos relatados.

En [ciudad], a [fecha]

[Firma del denunciante]`;

  const whereToFile = [
    { organ: "Fiscalía Anticorrupción", condition: "Si supera 50.000€ en contratos irregulares", url: "https://www.fiscal.es" },
    { organ: "Tribunal de Cuentas", condition: "Malversación de fondos públicos", url: "https://www.tcu.es" },
    { organ: "OLAF", condition: "Si hay fondos europeos implicados", url: "https://anti-fraud.ec.europa.eu" },
    { organ: "Juzgado de Instrucción local", condition: "Casos menores", url: "" },
    { organ: "Agencia Tributaria", condition: "Fraude fiscal", url: "https://www.agenciatributaria.es" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-200">Kit de Denuncia Formal</h2>
          <p className="text-xs text-gray-500 mt-1">
            Documento en formato denuncia para autoridades españolas y europeas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => copyToClipboard(denunciaText, "Denuncia")}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            data-testid="btn-copy-denuncia"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copiar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadText(denunciaText, `VIGILIA_denuncia_${entity.nombre.replace(/\s/g, "_")}.txt`)}
            className="border-gray-700 text-gray-300 hover:bg-gray-800"
            data-testid="btn-download-denuncia"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            .txt
          </Button>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Document preview */}
        <div className="rounded-lg bg-white/[0.02] border border-gray-700/30 p-6">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">{denunciaText}</pre>
        </div>

        {/* Where to file */}
        <div className="rounded-lg bg-gray-900/50 border border-gray-700/30 p-5">
          <h3 className="text-sm font-bold text-gray-300 mb-3">¿Dónde presentarla?</h3>
          <div className="space-y-2">
            {whereToFile.map((w, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-blue-400 mt-0.5">→</span>
                <div>
                  <span className="font-medium text-gray-300">{w.organ}</span>
                  <span className="text-gray-500 ml-2">— {w.condition}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Checklist */}
        <div className="rounded-lg bg-gray-900/50 border border-gray-700/30 p-5">
          <h3 className="text-sm font-bold text-gray-300 mb-3">Checklist de documentos a adjuntar</h3>
          {[
            "Copia del DNI del denunciante",
            "Capturas de las fuentes oficiales citadas",
            "Informe VIGILIA en PDF (genéralo en el módulo Informe PDF)",
            "Extracto de contratos de PLACE",
            "Copia del BOE/BORME relevante",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-400 py-1">
              <div className="w-4 h-4 rounded border border-gray-600 flex-shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Comparador Module ──
function ComparadorModule({ entities }: { entities: EntidadEdicion[] }) {
  const [entityA, setEntityA] = useState<EntidadEdicion | null>(null);
  const [entityB, setEntityB] = useState<EntidadEdicion | null>(null);

  return (
    <div>
      <h2 className="text-lg font-bold text-gray-200 mb-1">Comparador de Entidades</h2>
      <p className="text-xs text-gray-500 mb-6">Compara dos entidades en paralelo</p>

      <div className="grid grid-cols-2 gap-4 mb-8 max-w-2xl">
        {[{ selected: entityA, set: setEntityA, label: "Entidad A" }, { selected: entityB, set: setEntityB, label: "Entidad B" }].map(({ selected, set, label }) => (
          <div key={label}>
            <p className="text-xs text-gray-500 mb-2">{label}</p>
            <div className="space-y-1">
              {entities.map((e) => (
                <button
                  key={e.id}
                  onClick={() => set(e)}
                  className={`w-full text-left text-xs px-3 py-2 rounded transition-colors ${
                    selected?.id === e.id
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "text-gray-400 hover:text-gray-300 bg-gray-900/30 border border-gray-800/40 hover:bg-gray-800/30"
                  }`}
                >
                  {e.nombre}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {entityA && entityB && (
        <div className="grid grid-cols-2 gap-6 max-w-4xl">
          {[entityA, entityB].map((e) => {
            const risk = getRiskBadge(e.riskScore);
            const total = e.contratos.reduce((s, c) => s + c.importe, 0);
            return (
              <div key={e.id} className="rounded-lg bg-gray-900/50 border border-gray-700/30 p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-200">{e.nombre}</h3>
                  <p className="text-xs text-gray-500">{e.sector}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: risk.color }}
                  />
                  <span className="text-sm font-medium" style={{ color: risk.color }}>
                    {risk.label} — {e.riskScore}/100
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Contratos públicos</span>
                    <span className="text-gray-200 font-medium">{(e.totalContratosPublicos ?? 0).toLocaleString("es-ES")}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Volumen documentado</span>
                    <span className="text-gray-200 font-medium">{formatMoney(total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Sin concurso</span>
                    <span className="text-amber-400 font-medium">{e.contratosSinConcurso}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Conexiones</span>
                    <span className="text-gray-200 font-medium">{e.totalConexiones}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Sanciones</span>
                    <span className={`font-medium ${e.sanciones.length > 0 ? "text-red-400" : "text-green-400"}`}>
                      {e.sanciones.length > 0 ? e.sanciones.length : "Ninguna"}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Offshore</span>
                    <span className={`font-medium ${e.offshore.aparece ? "text-red-400" : "text-green-400"}`}>
                      {e.offshore.aparece ? "Detectado" : "No detectado"}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium mb-1">Señales de alerta</p>
                  {e.señalesAlerta.slice(0, 3).map((s, i) => (
                    <p key={i} className="text-[11px] text-gray-400 py-0.5">
                      • {s.titulo}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Common connections */}
          {(() => {
            const idsA = new Set(entityA.conexiones.map((c) => c.id));
            const common = entityB.conexiones.filter((c) => idsA.has(c.id));
            if (common.length === 0) return null;
            return (
              <div className="col-span-2 rounded-lg bg-blue-500/5 border border-blue-500/20 p-5">
                <h4 className="text-sm font-bold text-blue-400 mb-2">
                  Conexiones comunes ({common.length})
                </h4>
                {common.map((c, i) => (
                  <p key={i} className="text-sm text-gray-300 py-1">
                    {c.nombre} — {c.relacion}
                  </p>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Monitor Module ──
function MonitorModule({ entity }: { entity: EntidadEdicion }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-gray-200 mb-1">Monitor y Alertas</h2>
      <p className="text-xs text-gray-500 mb-6">Seguimiento continuo de entidades</p>

      <div className="max-w-2xl space-y-6">
        {/* Current entity tracking */}
        <div className="rounded-lg bg-gray-900/50 border border-gray-700/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-300">Entidades en vigilancia</h3>
            <Badge variant="outline" className="text-[10px] border-gray-700 text-gray-500">
              1 / 3 (Plan Básico)
            </Badge>
          </div>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/30 border border-gray-700/30">
            {entity.tipo === "Person" ? (
              <User className="w-4 h-4 text-blue-400" />
            ) : (
              <Building2 className="w-4 h-4 text-emerald-400" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-300">{entity.nombre}</p>
              <p className="text-[11px] text-gray-500">Vigilando desde hoy</p>
            </div>
            <div
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: getRiskBadge(entity.riskScore).color }}
            />
          </div>
        </div>

        {/* Alert types */}
        <div className="rounded-lg bg-gray-900/50 border border-gray-700/30 p-5">
          <h3 className="text-sm font-bold text-gray-300 mb-3">Alertas configuradas</h3>
          {[
            { label: "Nuevo contrato publicado", active: true },
            { label: "Nueva sanción registrada", active: true },
            { label: "Nuevo cargo público en BOE", active: true },
            { label: "Nueva entrada BORME", active: true },
            { label: "Resumen semanal por email", active: false, pro: true },
          ].map((alert, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-800/30 last:border-0">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-sm text-gray-400">{alert.label}</span>
                {alert.pro && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-500/30 text-amber-400">
                    PRO
                  </Badge>
                )}
              </div>
              <div
                className={`w-8 h-4 rounded-full transition-colors ${
                  alert.active ? "bg-blue-500" : "bg-gray-700"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mt-[1px] ${
                    alert.active ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Recent activity feed */}
        <div className="rounded-lg bg-gray-900/50 border border-gray-700/30 p-5">
          <h3 className="text-sm font-bold text-gray-300 mb-3">Actividad reciente</h3>
          {entity.cronologia.slice(-3).reverse().map((c, i) => (
            <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-800/30 last:border-0">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 ${
                  c.tipo === "sancion" ? "bg-red-400" :
                  c.tipo === "contrato" ? "bg-amber-400" :
                  c.tipo === "cargo" ? "bg-blue-400" :
                  "bg-gray-500"
                }`}
              />
              <div>
                <p className="text-sm text-gray-300">{c.titulo}</p>
                <p className="text-[11px] text-gray-500">{c.fecha} · {c.fuente}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
