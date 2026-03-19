export default function AvisoLegal() {
  return (
    <div className="p-6 md:p-10 max-w-[800px] mx-auto space-y-8 text-sm leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold mb-1">Aviso Legal</h1>
        <p className="text-muted-foreground text-xs">Última actualización: marzo 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">1. Identificación del titular</h2>
        <p>
          El presente sitio web es titularidad de <strong>VIGILIA</strong>, proyecto comunitario de código abierto sin ánimo de lucro, cuyo objeto es facilitar el acceso ciudadano a información pública oficial sobre transparencia y rendición de cuentas en España.
        </p>
        <p>
          Dominio: <strong>vigilia.es</strong><br />
          Repositorio público: <a href="https://github.com/vitamina-k/es-acc" className="underline text-primary" target="_blank" rel="noopener noreferrer">github.com/vitamina-k/es-acc</a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">2. Objeto del sitio web</h2>
        <p>
          VIGILIA es un sistema de grafos de conocimiento que cruza bases de datos públicas oficiales españolas — BORME, PLACE, BOE, AEAT, Congreso, Senado, listas de sanciones internacionales — y las conecta para facilitar su consulta por parte de ciudadanos, periodistas, investigadores y organizaciones de la sociedad civil.
        </p>
        <p>
          Todos los datos mostrados provienen de fuentes públicas oficiales, son de acceso libre por mandato legal, y se presentan con fines exclusivamente informativos, de transparencia y de interés público.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">3. Marco legal de los datos</h2>
        <p>Los datos tratados por VIGILIA están amparados por:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li><strong className="text-foreground">CE Art. 105.b</strong> — Derecho constitucional de acceso a archivos y registros públicos.</li>
          <li><strong className="text-foreground">Ley 19/2013, de 9 de diciembre</strong> — Transparencia, acceso a la información pública y buen gobierno.</li>
          <li><strong className="text-foreground">Ley 9/2017, de 8 de noviembre (LCSP)</strong> — Contratos del Sector Público. Obliga a la publicidad activa de la contratación pública.</li>
          <li><strong className="text-foreground">Reglamento (UE) 2016/679 (RGPD)</strong> — Art. 6.1.e y 89: tratamiento de datos públicos con fines de archivo en interés público e investigación.</li>
          <li><strong className="text-foreground">LO 3/2018, de 5 de diciembre (LOPDGDD)</strong> — Ley Orgánica de Protección de Datos y Garantía de los Derechos Digitales.</li>
        </ul>
        <p>
          VIGILIA no publica información privada de ciudadanos particulares. Únicamente trata información relativa a personas que ejercen funciones públicas, administran entidades que contratan con la Administración o aparecen en registros públicos oficiales en razón de su actividad pública o empresarial.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">4. Propiedad intelectual</h2>
        <p>
          El código fuente de VIGILIA es software libre publicado bajo licencia de código abierto en el repositorio indicado. Los datos mostrados son de titularidad pública y no están sujetos a derechos de propiedad intelectual por parte de VIGILIA.
        </p>
        <p>
          Queda prohibida la reproducción del diseño, interfaz o código con fines comerciales sin autorización expresa del proyecto.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">5. Limitación de responsabilidad</h2>
        <p>
          VIGILIA actúa como agregador de información pública oficial. No elabora, interpreta ni valora jurídicamente los datos. La presentación de conexiones entre entidades refleja únicamente relaciones documentadas en registros públicos y <strong>no implica ningún juicio de valor, acusación ni declaración de culpabilidad</strong>.
        </p>
        <p>
          VIGILIA no garantiza la exactitud, integridad o actualización de los datos en tiempo real, al depender de la publicación periódica de las fuentes oficiales. El usuario asume la responsabilidad del uso que haga de la información consultada.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">6. Donaciones</h2>
        <p>
          VIGILIA es un proyecto sin ánimo de lucro financiado exclusivamente por aportaciones voluntarias de la comunidad a través de la plataforma Stripe. Las donaciones se destinan íntegramente al mantenimiento de infraestructura y al desarrollo del proyecto. No existe contraprestación económica asociada a las aportaciones.
        </p>
        <p>
          El procesamiento de pagos lo realiza <strong>Stripe, Inc.</strong> bajo sus propios términos y política de privacidad. VIGILIA no almacena datos de tarjetas ni información bancaria de los donantes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">7. Ley aplicable y jurisdicción</h2>
        <p>
          El presente aviso legal se rige por la legislación española. Para la resolución de cualquier controversia, las partes se someten a la jurisdicción de los juzgados y tribunales competentes conforme a derecho.
        </p>
      </section>
    </div>
  );
}
