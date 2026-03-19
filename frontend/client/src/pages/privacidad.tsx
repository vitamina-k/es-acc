export default function Privacidad() {
  return (
    <div className="p-6 md:p-10 max-w-[800px] mx-auto space-y-8 text-sm leading-relaxed">
      <div>
        <h1 className="text-2xl font-bold mb-1">Política de Privacidad y Cookies</h1>
        <p className="text-muted-foreground text-xs">Última actualización: marzo 2026</p>
      </div>

      {/* PRIVACIDAD */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">1. Responsable del tratamiento</h2>
        <p>
          <strong>VIGILIA</strong> — proyecto comunitario de código abierto sin ánimo de lucro.<br />
          Dominio: vigilia.es<br />
          Contacto: a través del repositorio público en <a href="https://github.com/vitamina-k/es-acc" className="underline text-primary" target="_blank" rel="noopener noreferrer">github.com/vitamina-k/es-acc</a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">2. Datos que tratamos y por qué</h2>

        <h3 className="font-medium mt-2">2.1 Datos de personas públicas en el grafo</h3>
        <p>
          VIGILIA muestra información sobre personas que ejercen funciones públicas (cargos electos, altos cargos, administradores de empresas que contratan con el Estado) extraída exclusivamente de fuentes oficiales (BORME, BOE, Congreso, Senado, AEAT, etc.).
        </p>
        <p>
          Base legal: <strong>Art. 6.1.e RGPD</strong> — tratamiento necesario para el cumplimiento de una misión de interés público (transparencia y rendición de cuentas) y <strong>Art. 89 RGPD</strong> — fines de archivo en interés público e investigación.
        </p>
        <p>
          VIGILIA <strong>no publica datos personales de ciudadanos particulares</strong> que no ejerzan funciones públicas ni administren entidades que operen con fondos públicos.
        </p>

        <h3 className="font-medium mt-2">2.2 Datos de visitantes del sitio</h3>
        <p>
          VIGILIA <strong>no recopila datos personales de los usuarios que visitan el sitio</strong>. No hay registro de usuarios, no hay cuentas, no hay formularios de contacto que almacenen datos y no se utilizan herramientas de analítica de terceros que identifiquen al usuario.
        </p>

        <h3 className="font-medium mt-2">2.3 Donaciones mediante Stripe</h3>
        <p>
          Si realizas una donación, serás redirigido a la plataforma de pago <strong>Stripe, Inc.</strong> VIGILIA no almacena ningún dato de pago (número de tarjeta, cuenta bancaria, etc.). El tratamiento de tus datos de pago lo realiza Stripe bajo sus propios términos y política de privacidad, disponibles en <a href="https://stripe.com/es/privacy" className="underline text-primary" target="_blank" rel="noopener noreferrer">stripe.com/es/privacy</a>.
        </p>
        <p>
          En el proceso de donación, Stripe puede solicitar una dirección de correo electrónico para enviar el recibo. Esos datos los gestiona Stripe, no VIGILIA.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">3. Derechos del interesado</h2>
        <p>
          Si apareces en el grafo en tu condición de figura pública y consideras que algún dato es incorrecto o desactualizado, puedes solicitarnos su revisión a través del repositorio de GitHub (abriendo un <em>issue</em>). Atenderemos las solicitudes conforme al marco del RGPD y la Ley 19/2013 de Transparencia.
        </p>
        <p>
          Los ciudadanos particulares no aparecen en el grafo. Si crees que tus datos han sido incluidos por error, contacta con nosotros por el mismo canal y procederemos a su eliminación inmediata.
        </p>
        <p>
          También tienes derecho a presentar una reclamación ante la <strong>Agencia Española de Protección de Datos (AEPD)</strong> en <a href="https://www.aepd.es" className="underline text-primary" target="_blank" rel="noopener noreferrer">aepd.es</a>.
        </p>
      </section>

      {/* COOKIES */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">4. Política de cookies</h2>
        <p>
          VIGILIA utiliza únicamente <strong>cookies técnicas estrictamente necesarias</strong> para el funcionamiento del sitio (preferencia de modo claro/oscuro almacenada en <code className="bg-muted px-1 rounded text-xs">localStorage</code>). No se utilizan cookies de seguimiento, publicidad ni analítica de terceros.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-2 font-semibold">Nombre</th>
                <th className="text-left p-2 font-semibold">Tipo</th>
                <th className="text-left p-2 font-semibold">Finalidad</th>
                <th className="text-left p-2 font-semibold">Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="p-2 font-mono">vigilia-theme</td>
                <td className="p-2">Técnica (localStorage)</td>
                <td className="p-2">Guardar preferencia de tema claro/oscuro</td>
                <td className="p-2">Persistente (local)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Al no utilizar cookies de terceros ni con fines de seguimiento, no es necesario mostrar un banner de consentimiento de cookies conforme a la normativa vigente (LSSI-CE y directrices de la AEPD).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">5. Cambios en esta política</h2>
        <p>
          VIGILIA puede actualizar esta política en cualquier momento. La fecha de última actualización aparece al inicio del documento. Te recomendamos revisarla periódicamente.
        </p>
      </section>
    </div>
  );
}
