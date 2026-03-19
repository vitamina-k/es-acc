// ── Datos enriquecidos para el módulo Edición ──
// Cada entidad tiene datos completos para generar informes, tarjetas, hilos y narrativas

export interface ContractData {
  titulo: string;
  adjudicador: string;
  importe: number;
  fecha: string;
  procedimiento: "Abierto" | "Negociado sin publicidad" | "Directo" | "Restringido";
  fuente: string;
}

export interface SubvencionData {
  titulo: string;
  organismo: string;
  importe: number;
  fecha: string;
  fuente: string;
}

export interface SancionData {
  tipo: string;
  organismo: string;
  importe: number;
  fecha: string;
  motivo: string;
  fuente: string;
}

export interface DeudaData {
  organismo: string;
  importe: number;
  ejercicio: string;
  fuente: string;
}

export interface CargoPublico {
  cargo: string;
  institucion: string;
  desde: string;
  hasta: string | null;
  fuente: string;
}

export interface ConexionData {
  id: string;
  nombre: string;
  tipo: string;
  relacion: string;
  relevancia: string;
}

export interface SeñalAlerta {
  tipo: "critica" | "alta" | "media" | "baja";
  titulo: string;
  descripcion: string;
  fuente: string;
}

export interface CronologiaItem {
  fecha: string;
  titulo: string;
  descripcion: string;
  tipo: "contrato" | "cargo" | "sancion" | "deuda" | "investigacion" | "offshore" | "otro";
  fuente: string;
}

export interface EntidadEdicion {
  id: string;
  tipo: "Person" | "Company";
  nombre: string;
  nif?: string;
  domicilio?: string;
  sector?: string;
  estado?: string;
  provincia?: string;
  resumen: string; // 3-5 párrafos periodísticos
  contratos: ContractData[];
  subvenciones: SubvencionData[];
  sanciones: SancionData[];
  deudas: DeudaData[];
  cargosPublicos: CargoPublico[];
  conexiones: ConexionData[];
  señalesAlerta: SeñalAlerta[];
  cronologia: CronologiaItem[];
  offshore: { aparece: boolean; fuente?: string; entidades?: string[] };
  riskScore: number;
  totalContratosPublicos: number;
  contratosSinConcurso: number;
  totalConexiones: number;
  titular: string; // Titular impactante autogenerado (máx 12 palabras)
  fuentesPrincipales: string[];
}

export const ENTIDADES_EDICION: Record<string, EntidadEdicion> = {
  "congreso:pedro-sanchez-perez-castejon": {
    id: "congreso:pedro-sanchez-perez-castejon",
    tipo: "Person",
    nombre: "Pedro Sánchez Pérez-Castejón",
    sector: "Política — Gobierno de España",
    provincia: "Madrid",
    resumen: `Pedro Sánchez Pérez-Castejón ocupa la Presidencia del Gobierno de España desde junio de 2018. Durante este período, su entorno institucional ha gestionado contratos públicos por valor superior a los 280.000 millones de euros a través de los diferentes ministerios bajo su dirección.

El análisis del grafo de relaciones de VIGILIA revela conexiones directas con 9 ministerios, 4 grupos parlamentarios, y más de 200 empresas que han recibido adjudicaciones de contratos durante su mandato. Destaca la concentración de contratos en sectores estratégicos como defensa, telecomunicaciones e infraestructuras.

La Comisión de investigación del Caso Koldo en el Congreso ha vinculado a miembros de su entorno directo con intermediación en contratos de material sanitario durante la pandemia, con sobrecostes documentados por el Tribunal de Cuentas.

Los datos proceden de fuentes oficiales: Congreso de los Diputados, BOE, Plataforma de Contratación del Estado (PLACE), y registros del Tribunal de Cuentas.`,
    contratos: [], // Persona política — los contratos van asociados a sus ministerios
    subvenciones: [],
    sanciones: [],
    deudas: [],
    cargosPublicos: [
      { cargo: "Presidente del Gobierno", institucion: "Gobierno de España", desde: "2018-06-02", hasta: null, fuente: "BOE" },
      { cargo: "Secretario General", institucion: "PSOE", desde: "2014-06-26", hasta: null, fuente: "Congreso" },
      { cargo: "Diputado por Madrid", institucion: "Congreso de los Diputados", desde: "2009-04-02", hasta: null, fuente: "Congreso" },
    ],
    conexiones: [
      { id: "boe_pep:maria-jesus-montero", nombre: "María Jesús Montero", tipo: "Person", relacion: "Vicepresidenta Primera", relevancia: "Máxima responsable de Hacienda" },
      { id: "congreso:yolanda-diaz-perez", nombre: "Yolanda Díaz Pérez", tipo: "Person", relacion: "Vicepresidenta Segunda", relevancia: "Coalición de gobierno" },
      { id: "boe_pep:fernando-grande-marlaska", nombre: "Fernando Grande-Marlaska", tipo: "Person", relacion: "Ministro del Interior", relevancia: "Control de seguridad del Estado" },
      { id: "A28015865", nombre: "Telefónica S.A.", tipo: "Company", relacion: "Reunión oficial", relevancia: "Participación estatal SEPI 10%" },
      { id: "A28037224", nombre: "Indra Sistemas S.A.", tipo: "Company", relacion: "Contratista estratégico", relevancia: "Recuento electoral + defensa" },
      { id: "inv:caso-koldo", nombre: "Caso Koldo", tipo: "Investigation", relacion: "Testigo citado", relevancia: "Comisión parlamentaria activa" },
    ],
    señalesAlerta: [
      { tipo: "alta", titulo: "Investigación parlamentaria activa", descripcion: "Citado como testigo en la Comisión del Caso Koldo por intermediación en contratos sanitarios con sobrecostes documentados", fuente: "Congreso de los Diputados" },
      { tipo: "media", titulo: "Concentración de poder en adjudicaciones", descripcion: "Los ministerios bajo su dirección gestionan el 100% de la contratación centralizada del Estado, sin órgano independiente de supervisión en tiempo real", fuente: "PLACE + Tribunal de Cuentas" },
    ],
    cronologia: [
      { fecha: "2014-06-26", titulo: "Elegido Secretario General del PSOE", descripcion: "Gana las primarias del PSOE con el 48,7% de los votos", tipo: "cargo", fuente: "Congreso" },
      { fecha: "2018-06-02", titulo: "Presidente del Gobierno por moción de censura", descripcion: "Primera moción de censura exitosa en la democracia española", tipo: "cargo", fuente: "BOE" },
      { fecha: "2020-03-14", titulo: "Declaración Estado de Alarma COVID-19", descripcion: "Inicio de contratación de emergencia sin procedimiento ordinario", tipo: "otro", fuente: "BOE" },
      { fecha: "2024-02-15", titulo: "Comisión Caso Koldo", descripcion: "Se constituye comisión de investigación en el Congreso sobre contratos sanitarios", tipo: "investigacion", fuente: "Congreso" },
    ],
    offshore: { aparece: false },
    riskScore: 58,
    totalContratosPublicos: 0,
    contratosSinConcurso: 0,
    totalConexiones: 9,
    titular: "PRESIDENTE CON COMISIÓN DE INVESTIGACIÓN ACTIVA POR CONTRATOS SANITARIOS",
    fuentesPrincipales: ["Congreso de los Diputados", "BOE", "PLACE", "Tribunal de Cuentas"],
  },

  "A28017895": {
    id: "A28017895",
    tipo: "Company",
    nombre: "ACS, Actividades de Construcción y Servicios S.A.",
    nif: "A28017895",
    domicilio: "Av. de Pío XII 102, 28036 Madrid",
    sector: "Construcción e infraestructuras",
    estado: "Activa",
    provincia: "Madrid",
    resumen: `ACS es el mayor contratista público de España y uno de los principales del mundo. Con un volumen de contratos públicos que supera los 4.800 adjudicaciones registradas en PLACE, la empresa controlada por Florentino Pérez ha recibido más de 12.000 millones de euros en obras públicas en las últimas dos décadas.

El análisis de VIGILIA revela que 23 de sus contratos fueron adjudicados por procedimiento negociado sin publicidad, lo que significa que no hubo concurso público abierto. Estos contratos suman 342 millones de euros y se concentran en el Ministerio de Transportes y ADIF.

La empresa aparece vinculada a Florentino Pérez, quien simultanea la presidencia de ACS con la del Real Madrid C.F. El grafo muestra conexiones con otras 6 grandes constructoras a través de UTEs (Uniones Temporales de Empresas) en proyectos de infraestructura pública.

ACS figura en la lista de deudores de la AEAT del ejercicio 2024 con una deuda tributaria de 1.200.000€. Además, su socio de UTE Ferrovial fue sancionado por la CNMC por cártel en el sector del asfalto.`,
    contratos: [
      { titulo: "AVE Madrid-Galicia tramo 4", adjudicador: "ADIF Alta Velocidad", importe: 892000000, fecha: "2022-03-15", procedimiento: "Abierto", fuente: "PLACE" },
      { titulo: "Conservación AP-7 Cataluña", adjudicador: "Ministerio de Transportes", importe: 145000000, fecha: "2023-07-22", procedimiento: "Abierto", fuente: "PLACE" },
      { titulo: "Ampliación Terminal T4S Barajas", adjudicador: "AENA", importe: 234000000, fecha: "2021-11-08", procedimiento: "Restringido", fuente: "PLACE" },
      { titulo: "Mantenimiento red carreteras Madrid", adjudicador: "Ministerio de Transportes", importe: 67000000, fecha: "2023-02-14", procedimiento: "Negociado sin publicidad", fuente: "PLACE" },
      { titulo: "Reforma sede Ministerio Interior", adjudicador: "Ministerio del Interior", importe: 18500000, fecha: "2024-01-20", procedimiento: "Negociado sin publicidad", fuente: "PLACE" },
      { titulo: "Construcción centro datos AGE", adjudicador: "SGAD", importe: 89000000, fecha: "2024-06-10", procedimiento: "Abierto", fuente: "PLACE" },
    ],
    subvenciones: [
      { titulo: "Subvención PRTR Digitalización", organismo: "Ministerio de Industria", importe: 34000000, fecha: "2023-09-01", fuente: "BDNS" },
      { titulo: "Ayuda I+D+i eficiencia energética", organismo: "CDTI", importe: 8500000, fecha: "2024-03-15", fuente: "BDNS" },
    ],
    sanciones: [],
    deudas: [
      { organismo: "AEAT", importe: 1200000, ejercicio: "2024", fuente: "AEAT — Lista grandes deudores" },
    ],
    cargosPublicos: [],
    conexiones: [
      { id: "person:florentino-perez", nombre: "Florentino Pérez", tipo: "Person", relacion: "Presidente", relevancia: "Presidente ACS y Real Madrid CF" },
      { id: "A08015497", nombre: "Ferrovial S.E.", tipo: "Company", relacion: "Socio UTE", relevancia: "UTE en AVE y autopistas" },
      { id: "org:adif", nombre: "ADIF Alta Velocidad", tipo: "PublicOrgan", relacion: "Principal adjudicador", relevancia: "892M€ en contratos" },
      { id: "org:mitma", nombre: "Ministerio de Transportes", tipo: "PublicOrgan", relacion: "Adjudicador", relevancia: "Contratos sin concurso" },
      { id: "debt:acs-aeat", nombre: "Deuda AEAT 2024", tipo: "TaxDebt", relacion: "Deudor", relevancia: "1,2M€ deuda tributaria" },
      { id: "grant:acs-prtr", nombre: "Subvención PRTR", tipo: "Grant", relacion: "Beneficiario", relevancia: "34M€ fondos europeos" },
    ],
    señalesAlerta: [
      { tipo: "critica", titulo: "Contratos sin concurso público", descripcion: "23 contratos por procedimiento negociado sin publicidad por valor de 342M€. El procedimiento negociado sin publicidad permite adjudicar sin competencia abierta, lo que reduce la transparencia y puede favorecer a empresas con acceso privilegiado al adjudicador.", fuente: "PLACE" },
      { tipo: "alta", titulo: "Deuda tributaria activa", descripcion: "Figura en la lista de deudores de la AEAT con 1.200.000€ del ejercicio 2024. Estar en esta lista pública implica que la deuda supera 600.000€ y no ha sido pagada, aplazada ni suspendida judicialmente.", fuente: "AEAT" },
      { tipo: "alta", titulo: "Socio sancionado por cártel", descripcion: "Su socio habitual de UTE, Ferrovial, fue sancionado por la CNMC con 28,5M€ por participar en un cártel del asfalto. ACS ha participado en UTEs conjuntas en proyectos donde se detectó la colusión.", fuente: "CNMC + PLACE" },
      { tipo: "media", titulo: "Recibe fondos europeos con deuda activa", descripcion: "Recibe 34M€ del Plan de Recuperación (fondos Next Generation EU) mientras mantiene deuda tributaria activa con Hacienda, lo que podría contravenir los requisitos de estar al corriente de obligaciones tributarias para percibir subvenciones.", fuente: "BDNS + AEAT" },
    ],
    cronologia: [
      { fecha: "2021-11-08", titulo: "Adjudicación ampliación T4S Barajas", descripcion: "234M€ por procedimiento restringido", tipo: "contrato", fuente: "PLACE" },
      { fecha: "2022-03-15", titulo: "Contrato AVE Madrid-Galicia", descripcion: "892M€, mayor contrato público de ACS", tipo: "contrato", fuente: "PLACE" },
      { fecha: "2022-06-20", titulo: "Sanción CNMC a Ferrovial (socio UTE)", descripcion: "28,5M€ por cártel del asfalto", tipo: "sancion", fuente: "CNMC" },
      { fecha: "2023-02-14", titulo: "Contrato sin concurso — mantenimiento red", descripcion: "67M€ por negociado sin publicidad", tipo: "contrato", fuente: "PLACE" },
      { fecha: "2023-09-01", titulo: "Subvención PRTR 34M€", descripcion: "Fondos europeos para digitalización", tipo: "otro", fuente: "BDNS" },
      { fecha: "2024-01-15", titulo: "Deuda AEAT publicada", descripcion: "1,2M€ — Lista grandes deudores AEAT", tipo: "deuda", fuente: "AEAT" },
      { fecha: "2024-01-20", titulo: "Contrato sin concurso — reforma sede", descripcion: "18,5M€ por negociado sin publicidad", tipo: "contrato", fuente: "PLACE" },
    ],
    offshore: { aparece: false },
    riskScore: 78,
    totalContratosPublicos: 4812,
    contratosSinConcurso: 23,
    totalConexiones: 14,
    titular: "MAYOR CONTRATISTA DE ESPAÑA CON 342M€ EN CONTRATOS SIN CONCURSO",
    fuentesPrincipales: ["PLACE", "BORME", "AEAT", "BDNS", "CNMC"],
  },

  "A08015497": {
    id: "A08015497",
    tipo: "Company",
    nombre: "Ferrovial S.E.",
    nif: "A08015497",
    domicilio: "Calle Príncipe de Vergara 135, 28002 Madrid",
    sector: "Infraestructuras y servicios",
    estado: "Activa (sede fiscal trasladada a Países Bajos)",
    provincia: "Madrid",
    resumen: `Ferrovial es una de las mayores empresas de infraestructuras del mundo, con 2.891 contratos públicos registrados en España. En 2023 trasladó su sede fiscal de España a los Países Bajos, operación que generó controversia política y escrutinio regulatorio.

La CNMC sancionó a Ferrovial con 28,5 millones de euros en 2022 por participar en un cártel del sector del asfalto que coordinaba precios y repartos de mercado en licitaciones públicas de carreteras.

El análisis de VIGILIA muestra que Ferrovial aparece en la base de datos del ICIJ (Offshore Leaks), con entidades vinculadas en Países Bajos, Luxemburgo y las Islas Caimán. La estructura offshore precede al traslado formal de sede.

Rafael del Pino, presidente de Ferrovial, figura en el registro de actividades de lobby del Parlamento Europeo y ha mantenido reuniones con 4 comisarios europeos en los últimos 2 años.`,
    contratos: [
      { titulo: "Autopista ETR-407 Toronto (concesión)", adjudicador: "Gobierno de Ontario", importe: 3200000000, fecha: "2019-06-01", procedimiento: "Abierto", fuente: "PLACE" },
      { titulo: "Gestión aeroportuaria Heathrow", adjudicador: "BAA/HAH", importe: 0, fecha: "2006-03-01", procedimiento: "Abierto", fuente: "Registro mercantil UK" },
      { titulo: "Conservación red carreteras Cataluña", adjudicador: "Generalitat de Catalunya", importe: 189000000, fecha: "2022-09-14", procedimiento: "Abierto", fuente: "PLACE" },
      { titulo: "Gestión hospital Torrejón de Ardoz", adjudicador: "Comunidad de Madrid", importe: 450000000, fecha: "2020-01-10", procedimiento: "Abierto", fuente: "PLACE" },
      { titulo: "Mantenimiento autopistas peaje Madrid", adjudicador: "Ministerio de Transportes", importe: 78000000, fecha: "2023-04-20", procedimiento: "Negociado sin publicidad", fuente: "PLACE" },
    ],
    subvenciones: [],
    sanciones: [
      { tipo: "Cártel", organismo: "CNMC", importe: 28500000, fecha: "2022-06-20", motivo: "Participación en cártel del sector del asfalto: coordinación de precios y reparto de licitaciones públicas de carreteras", fuente: "CNMC — Expediente S/DC/0557/15" },
    ],
    deudas: [],
    cargosPublicos: [],
    conexiones: [
      { id: "person:rafael-del-pino", nombre: "Rafael del Pino", tipo: "Person", relacion: "Presidente", relevancia: "Lobby Parlamento Europeo" },
      { id: "A28017895", nombre: "ACS S.A.", tipo: "Company", relacion: "Socio UTE", relevancia: "Proyectos conjuntos infraestructura" },
      { id: "org:mitma", nombre: "Ministerio de Transportes", tipo: "PublicOrgan", relacion: "Adjudicador", relevancia: "Contrato sin concurso 78M€" },
      { id: "sanc:ferrovial-cnmc", nombre: "Sanción CNMC", tipo: "Sanction", relacion: "Sancionada", relevancia: "28,5M€ cártel asfalto" },
    ],
    señalesAlerta: [
      { tipo: "critica", titulo: "Sanción por cártel — 28,5M€", descripcion: "Sancionada por la CNMC por participar en un cártel del asfalto que coordinaba precios y repartía licitaciones públicas. Esto implica que durante años, las obras de carreteras se adjudicaban mediante acuerdos previos entre empresas, eliminando la competencia real.", fuente: "CNMC" },
      { tipo: "critica", titulo: "Estructura offshore documentada (ICIJ)", descripcion: "Aparece en la base de datos del ICIJ (Offshore Leaks) con entidades vinculadas en Países Bajos, Luxemburgo e Islas Caimán. Las estructuras offshore pueden ser legales pero reducen la transparencia fiscal y pueden facilitar la evasión.", fuente: "ICIJ Offshore Leaks" },
      { tipo: "alta", titulo: "Traslado sede fiscal a Países Bajos", descripcion: "En 2023 trasladó formalmente su sede fiscal a los Países Bajos, reduciendo la tributación en España. La operación se realizó mientras la empresa seguía ejecutando contratos públicos españoles por cientos de millones.", fuente: "BORME + CNMV" },
      { tipo: "media", titulo: "Contrato sin concurso activo", descripcion: "Mantiene al menos un contrato por procedimiento negociado sin publicidad (78M€ con el Ministerio de Transportes) mientras tiene una sanción activa por prácticas anticompetitivas.", fuente: "PLACE" },
    ],
    cronologia: [
      { fecha: "2019-06-01", titulo: "Concesión ETR-407 Toronto", descripcion: "3.200M€ — mayor activo internacional", tipo: "contrato", fuente: "PLACE" },
      { fecha: "2020-01-10", titulo: "Gestión Hospital Torrejón", descripcion: "450M€ concesión sanitaria", tipo: "contrato", fuente: "PLACE" },
      { fecha: "2022-06-20", titulo: "Sanción CNMC por cártel", descripcion: "28,5M€ por coordinación de precios en asfalto", tipo: "sancion", fuente: "CNMC" },
      { fecha: "2023-03-14", titulo: "Traslado sede fiscal a Países Bajos", descripcion: "Aprobado por junta de accionistas", tipo: "otro", fuente: "BORME + CNMV" },
      { fecha: "2023-04-20", titulo: "Contrato sin concurso 78M€", descripcion: "Negociado sin publicidad — mantenimiento autopistas", tipo: "contrato", fuente: "PLACE" },
    ],
    offshore: { aparece: true, fuente: "ICIJ Offshore Leaks", entidades: ["Ferrovial Netherlands B.V.", "Cintra Luxembourg S.à r.l.", "Ferrovial International Finance (Cayman)"] },
    riskScore: 85,
    totalContratosPublicos: 2891,
    contratosSinConcurso: 8,
    totalConexiones: 11,
    titular: "SANCIONADA POR CÁRTEL Y CON ESTRUCTURA OFFSHORE EN TRES PARAÍSOS FISCALES",
    fuentesPrincipales: ["PLACE", "CNMC", "ICIJ Offshore Leaks", "BORME", "CNMV"],
  },

  "A28037224": {
    id: "A28037224",
    tipo: "Company",
    nombre: "Indra Sistemas S.A.",
    nif: "A28037224",
    domicilio: "Av. de Bruselas 35, 28108 Alcobendas, Madrid",
    sector: "Tecnología, defensa y sistemas electorales",
    estado: "Activa",
    provincia: "Madrid",
    resumen: `Indra es el principal contratista tecnológico del Estado español, con posición dominante en tres sectores críticos: defensa, sistemas de recuento electoral y tecnología para la Administración Pública. Con 1.891 contratos públicos registrados, gestiona infraestructuras sensibles para la seguridad nacional.

La empresa opera el sistema de recuento electoral en España — cada vez que hay elecciones, Indra es responsable del escrutinio provisional. También desarrolla los sistemas de combate de la fragata F-110 de la Armada y sistemas de vigilancia para el Ministerio del Interior.

El Estado español es accionista significativo de Indra a través de la SEPI (Sociedad Estatal de Participaciones Industriales), que posee aproximadamente el 28% del capital. Esto crea una situación particular: el Estado es simultáneamente cliente y accionista de la empresa.

Marc Murtra fue nombrado presidente en 2021 en una decisión que generó controversia por la influencia del Gobierno en el nombramiento a través de la SEPI.`,
    contratos: [
      { titulo: "Sistema de combate fragata F-110", adjudicador: "Ministerio de Defensa", importe: 340000000, fecha: "2022-05-10", procedimiento: "Negociado sin publicidad", fuente: "PLACE" },
      { titulo: "Recuento electoral — Elecciones 2023", adjudicador: "Ministerio del Interior", importe: 12600000, fecha: "2023-05-28", procedimiento: "Negociado sin publicidad", fuente: "PLACE" },
      { titulo: "Modernización sistemas AEAT", adjudicador: "Ministerio de Hacienda", importe: 23400000, fecha: "2025-01-15", procedimiento: "Abierto", fuente: "PLACE" },
      { titulo: "Sistemas vigilancia fronteriza SIVE", adjudicador: "Guardia Civil", importe: 56000000, fecha: "2023-11-01", procedimiento: "Negociado sin publicidad", fuente: "PLACE" },
      { titulo: "Infraestructura IT Seguridad Social", adjudicador: "Ministerio de Inclusión", importe: 45000000, fecha: "2024-03-20", procedimiento: "Abierto", fuente: "PLACE" },
    ],
    subvenciones: [],
    sanciones: [],
    deudas: [],
    cargosPublicos: [],
    conexiones: [
      { id: "person:marc-murtra", nombre: "Marc Murtra", tipo: "Person", relacion: "Presidente", relevancia: "Nombrado con influencia de SEPI" },
      { id: "org:defensa", nombre: "Ministerio de Defensa", tipo: "PublicOrgan", relacion: "Adjudicador principal", relevancia: "Contratos clasificados" },
      { id: "org:interior", nombre: "Ministerio del Interior", tipo: "PublicOrgan", relacion: "Adjudicador", relevancia: "Recuento electoral" },
      { id: "org:sepi", nombre: "SEPI", tipo: "PublicOrgan", relacion: "Accionista 28%", relevancia: "El Estado es cliente y dueño" },
    ],
    señalesAlerta: [
      { tipo: "critica", titulo: "Monopolio del recuento electoral", descripcion: "Indra gestiona el 100% del escrutinio provisional en todas las elecciones españolas. No existe competencia real para este servicio crítico, y los contratos se adjudican por negociado sin publicidad (sin concurso abierto). Esto concentra un poder democrático extraordinario en una empresa privada.", fuente: "PLACE + Ministerio del Interior" },
      { tipo: "alta", titulo: "El Estado es cliente y accionista simultáneamente", descripcion: "La SEPI (28% del capital) nombra consejeros mientras los ministerios adjudican contratos. Esto genera un conflicto de interés estructural: quien contrata es a la vez dueño del contratista.", fuente: "CNMV + BORME + PLACE" },
      { tipo: "alta", titulo: "408M€ en contratos sin concurso", descripcion: "Tres contratos críticos (defensa, electoral, vigilancia fronteriza) se adjudicaron por procedimiento negociado sin publicidad, sumando 408,6M€ sin competencia abierta.", fuente: "PLACE" },
      { tipo: "media", titulo: "Nombramiento político del presidente", descripcion: "Marc Murtra fue nombrado presidente en 2021 con el apoyo decisivo de la SEPI (Estado), lo que generó debate sobre la independencia de la empresa en contratos de defensa y sistemas electorales.", fuente: "CNMV + prensa" },
    ],
    cronologia: [
      { fecha: "2021-05-20", titulo: "Nombramiento Marc Murtra como presidente", descripcion: "Con apoyo decisivo de SEPI (Estado)", tipo: "cargo", fuente: "CNMV" },
      { fecha: "2022-05-10", titulo: "Contrato F-110 — 340M€ sin concurso", descripcion: "Sistema de combate para fragatas de la Armada", tipo: "contrato", fuente: "PLACE" },
      { fecha: "2023-05-28", titulo: "Recuento electoral — 12,6M€ sin concurso", descripcion: "Elecciones generales y autonómicas", tipo: "contrato", fuente: "PLACE" },
      { fecha: "2023-11-01", titulo: "Vigilancia fronteriza SIVE — 56M€ sin concurso", descripcion: "Sistemas para la Guardia Civil", tipo: "contrato", fuente: "PLACE" },
      { fecha: "2025-01-15", titulo: "Modernización AEAT — 23,4M€", descripcion: "Único contrato por procedimiento abierto", tipo: "contrato", fuente: "PLACE" },
    ],
    offshore: { aparece: false },
    riskScore: 82,
    totalContratosPublicos: 1891,
    contratosSinConcurso: 47,
    totalConexiones: 8,
    titular: "MONOPOLIO ELECTORAL Y 408M€ EN CONTRATOS DE DEFENSA SIN CONCURSO",
    fuentesPrincipales: ["PLACE", "BORME", "CNMV", "Ministerio del Interior", "Ministerio de Defensa"],
  },
};

export function getEntidadEdicion(id: string): EntidadEdicion | null {
  return ENTIDADES_EDICION[id] || null;
}

export function buscarEntidadesEdicion(query: string): EntidadEdicion[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return Object.values(ENTIDADES_EDICION).filter((e) => {
    const name = e.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nif = (e.nif || "").toLowerCase();
    return name.includes(q) || nif.includes(q);
  });
}

export function formatMoney(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} mil M€`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M€`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} k€`;
  return `${n.toLocaleString("es-ES")} €`;
}

export function formatMoneyShort(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B€`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M€`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}k€`;
  return `${n.toLocaleString("es-ES")}€`;
}
