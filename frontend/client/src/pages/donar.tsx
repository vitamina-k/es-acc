import { Heart, Github, Shield, Database, Zap, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/PLACEHOLDER"; // sustituir por link real de Stripe

const TIERS = [
  { amount: "5€", label: "Colaborador", desc: "Un café para mantener los servidores encendidos.", once: true },
  { amount: "10€", label: "Ciudadano activo", desc: "Cubre parte del coste mensual de infraestructura.", once: true },
  { amount: "25€", label: "Periodista", desc: "Ayuda a mantener los pipelines de datos actualizados.", once: true },
  { amount: "50€", label: "Investigador", desc: "Financia el desarrollo de un nuevo pipeline ETL.", once: true },
];

const USES = [
  { icon: Database, text: "Servidores Neo4j y almacenamiento de datos" },
  { icon: Zap, text: "Pipelines ETL automáticos (actualizaciones diarias)" },
  { icon: Shield, text: "Mantenimiento y auditoría de seguridad" },
  { icon: Github, text: "Desarrollo de nuevas funcionalidades open source" },
];

export default function DonarPage() {
  const handleDonate = (amount?: string) => {
    const url = amount
      ? `${STRIPE_PAYMENT_LINK}?amount=${parseFloat(amount) * 100}`
      : STRIPE_PAYMENT_LINK;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="p-6 md:p-10 max-w-[720px] mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 flex items-center justify-center">
          <Heart className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold">Apoya VIGILIA</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          VIGILIA es un proyecto de código abierto sin ánimo de lucro. Sin financiación corporativa, sin intereses políticos. Solo ciudadanos que creen que la transparencia importa.
        </p>
        <Badge variant="outline" className="text-xs">100% open source · Sin publicidad · Sin inversores</Badge>
      </div>

      {/* Para qué se usa */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <p className="text-sm font-semibold">¿En qué se usan las donaciones?</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {USES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 shrink-0 text-primary" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cantidades */}
      <div className="grid sm:grid-cols-2 gap-3">
        {TIERS.map((tier) => (
          <Card
            key={tier.amount}
            className="cursor-pointer hover:border-primary/50 transition-colors group"
            onClick={() => handleDonate(tier.amount)}
          >
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold">{tier.amount}</span>
                <Badge variant="secondary" className="text-[10px]">{tier.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{tier.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA principal */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button size="lg" className="gap-2" onClick={() => handleDonate()}>
          <Heart className="w-4 h-4" />
          Donar con tarjeta (Stripe)
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </Button>
        <Button size="lg" variant="outline" className="gap-2" asChild>
          <a href="https://github.com/vitamina-k/es-acc" target="_blank" rel="noopener noreferrer">
            <Github className="w-4 h-4" />
            Contribuir con código
          </a>
        </Button>
      </div>

      {/* Nota legal */}
      <p className="text-center text-[11px] text-muted-foreground">
        Las donaciones son voluntarias y no conllevan contraprestación. El procesamiento de pagos lo realiza{" "}
        <a href="https://stripe.com/es/privacy" className="underline" target="_blank" rel="noopener noreferrer">Stripe, Inc.</a>{" "}
        VIGILIA no almacena datos de pago. Ver{" "}
        <a href="#/privacidad" className="underline">política de privacidad</a>.
      </p>
    </div>
  );
}
