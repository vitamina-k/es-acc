import { useState } from "react";
import { type TipSubmission, submitTip } from "@/api/client";
import styles from "./CitizenTipModal.module.css";

interface Props {
  onClose: () => void;
}

export function CitizenTipModal({ onClose }: Props) {
  const [form, setForm] = useState<TipSubmission>({
    description: "",
    source_hint: "",
    contact: "",
  });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [tipId, setTipId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setStatus("sending");
    try {
      const res = await submitTip(form);
      setTipId(res.tip_id);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Aportar información">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">×</button>

        <div className={styles.header}>
          <span className={styles.icon}>🔍</span>
          <h2 className={styles.title}>Aportar información</h2>
          <p className={styles.subtitle}>
            Tu aportación será revisada de forma confidencial. Si aportás documentación pública
            o datos verificables, nos ayudas a construir el grafo de transparencia.
          </p>
        </div>

        {status === "done" ? (
          <div className={styles.success}>
            <span className={styles.successIcon}>✓</span>
            <p className={styles.successTitle}>Información recibida</p>
            <p className={styles.successText}>
              Tu referencia de seguimiento es <code className={styles.tipCode}>{tipId}</code>
            </p>
            <p className={styles.successNote}>
              Guarda este código. Cuando nuestros analistas lo procesen, los datos verificados
              se publicarán en el grafo.
            </p>
            <button className={styles.doneBtn} onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              ¿Qué información aportas? *
              <textarea
                className={styles.textarea}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe la información que quieres aportar. Puede ser un contrato público, una declaración de bienes, un nombramiento, una relación entre entidades..."
                rows={5}
                required
                maxLength={2000}
              />
              <span className={styles.charCount}>{form.description.length}/2000</span>
            </label>

            <label className={styles.label}>
              Fuente o referencia (opcional)
              <input
                className={styles.input}
                type="text"
                value={form.source_hint}
                onChange={(e) => setForm({ ...form, source_hint: e.target.value })}
                placeholder="URL, BOE, diario oficial, expediente..."
                maxLength={500}
              />
            </label>

            <label className={styles.label}>
              Contacto (opcional, solo si quieres seguimiento)
              <input
                className={styles.input}
                type="email"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                placeholder="tu@email.com"
                maxLength={200}
              />
            </label>

            <div className={styles.privacyNote}>
              🔒 Tu aportación se procesa de forma confidencial. No se publica directamente
              ni se asocia a tu identidad. Solo datos verificados llegan al grafo público.
            </div>

            {status === "error" && (
              <p className={styles.errorMsg}>Error al enviar. Inténtalo de nuevo.</p>
            )}

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={status === "sending" || !form.description.trim()}
            >
              {status === "sending" ? "Enviando..." : "Enviar información"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
