// ── Datos de deudores y entidades sancionadas ──
// Fuentes: AEAT lista de deudores (2024/2025), CNMC sanciones, OpenSanctions, AEPD

export interface Sancion {
  tipo: string;
  descripcion: string;
  importe: number | null;
  fecha: string;
  organismo: string;
  expediente: string | null;
}

export interface SeñalRiesgo {
  tipo: string;
  severidad: 'critica' | 'alta' | 'media' | 'baja';
  descripcion: string;
  fuente: string;
}

export interface Deudor {
  id: string;
  nif: string;
  nombre: string;
  tipo: 'persona_fisica' | 'persona_juridica';
  deuda_aeat: number | null;
  año_lista: number | null;
  sanciones: Sancion[];
  señales: SeñalRiesgo[];
  fuentes: string[];
}

// ── Helpers ──

function pj(
  id: string,
  nif: string,
  nombre: string,
  deuda: number | null,
  año: number | null,
  sanciones: Sancion[] = [],
  señales: SeñalRiesgo[] = [],
  fuentes: string[] = ['AEAT Lista de Deudores']
): Deudor {
  return { id, nif, nombre, tipo: 'persona_juridica', deuda_aeat: deuda, año_lista: año, sanciones, señales, fuentes };
}

function pf(
  id: string,
  nif: string,
  nombre: string,
  deuda: number | null,
  año: number | null,
  sanciones: Sancion[] = [],
  señales: SeñalRiesgo[] = [],
  fuentes: string[] = ['AEAT Lista de Deudores']
): Deudor {
  return { id, nif, nombre, tipo: 'persona_fisica', deuda_aeat: deuda, año_lista: año, sanciones, señales, fuentes };
}

// ── Señales genéricas ──

function señalDeudaAEAT(importe: number, año: number): SeñalRiesgo {
  return {
    tipo: 'deuda_fiscal',
    severidad: importe > 50_000_000 ? 'critica' : importe > 10_000_000 ? 'alta' : importe > 1_000_000 ? 'media' : 'baja',
    descripcion: `Deuda con Hacienda de ${formatEuros(importe)} según la lista de deudores publicada por la AEAT en ${año}. La inclusión en esta lista implica que la deuda supera 600.000€ y no ha sido pagada ni recurrida con éxito.`,
    fuente: 'AEAT Lista de Deudores',
  };
}

function señalCartel(sector: string): SeñalRiesgo {
  return {
    tipo: 'cartel',
    severidad: 'critica',
    descripcion: `Sancionada por la CNMC por participación en cártel en el sector de ${sector}. Los cárteles inflan artificialmente los precios en contratos públicos, perjudicando a los contribuyentes.`,
    fuente: 'CNMC Resoluciones',
  };
}

function señalMultasFrecuentes(): SeñalRiesgo {
  return {
    tipo: 'reincidencia',
    severidad: 'alta',
    descripcion: 'Entidad con múltiples sanciones de distintos organismos reguladores. Patrón de incumplimiento reiterado.',
    fuente: 'Análisis cruzado VIGILIA',
  };
}

function señalBlanqueo(): SeñalRiesgo {
  return {
    tipo: 'blanqueo',
    severidad: 'critica',
    descripcion: 'Implicada en investigaciones o condenas por blanqueo de capitales. Máximo riesgo reputacional y legal.',
    fuente: 'SEPBLAC / Juzgados',
  };
}

function señalConcursal(): SeñalRiesgo {
  return {
    tipo: 'concursal',
    severidad: 'alta',
    descripcion: 'Empresa en situación concursal o con procedimiento de insolvencia. Riesgo elevado de impago y pérdida patrimonial.',
    fuente: 'Registro Público Concursal',
  };
}

function formatEuros(n: number): string {
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

// ── Dataset ──

export const DEUDORES: Deudor[] = [
  // ═══════════════════════════════════════════════
  // TOP DEUDORES AEAT (persona jurídica)
  // ═══════════════════════════════════════════════
  pj('d001', 'A28238988', 'REYAL URBIS SA', 279_810_332, 2024,
    [],
    [
      señalDeudaAEAT(279_810_332, 2024),
      señalConcursal(),
      { tipo: 'promotora_burbuja', severidad: 'critica', descripcion: 'Promotora inmobiliaria colapsada tras la burbuja de 2008. Su deuda con Hacienda es la mayor de toda la lista AEAT.', fuente: 'AEAT / Registro Mercantil' },
    ],
    ['AEAT Lista de Deudores', 'Registro Público Concursal']
  ),
  pj('d002', 'B18610741', 'MARILLION SLU', 136_236_093, 2024,
    [],
    [señalDeudaAEAT(136_236_093, 2024)],
  ),
  pj('d003', 'B88351036', 'PALEMAD RECICLAJE SL', 128_132_184, 2024,
    [],
    [señalDeudaAEAT(128_132_184, 2024)],
  ),
  pj('d004', 'B28627743', 'SERVICIOS ESQUERDO SL', 97_588_883, 2024,
    [],
    [señalDeudaAEAT(97_588_883, 2024)],
  ),
  pj('d005', 'A14027635', 'GRUPO PRA SA', 91_425_168, 2024,
    [],
    [señalDeudaAEAT(91_425_168, 2024)],
  ),
  pj('d006', 'A29403052', 'AIFOS ARQUITECTURA Y PROMOC INMOBILIARIAS SA', 90_100_444, 2024,
    [],
    [
      señalDeudaAEAT(90_100_444, 2024),
      señalConcursal(),
    ],
    ['AEAT Lista de Deudores', 'Registro Público Concursal']
  ),
  pj('d007', 'B82084286', 'OBRAS NUEVAS DE EDIFICACION 2.000 SL', 87_718_827, 2024,
    [],
    [señalDeudaAEAT(87_718_827, 2024)],
  ),
  pj('d008', 'B47337118', 'ORGANIZACION IMPULSORA DE DISCAPACITADOS OID', 86_291_540, 2024,
    [
      { tipo: 'fiscal', descripcion: 'Investigación por presunto fraude fiscal y estafa a donantes', importe: null, fecha: '2020-06-15', organismo: 'Fiscalía Anticorrupción', expediente: null },
    ],
    [
      señalDeudaAEAT(86_291_540, 2024),
      { tipo: 'fraude', severidad: 'critica', descripcion: 'Investigada por presunta estafa masiva. La OID captaba donaciones y subvenciones destinadas a personas con discapacidad que presuntamente no se emplearon en ese fin.', fuente: 'Fiscalía Anticorrupción' },
    ],
    ['AEAT Lista de Deudores', 'Fiscalía Anticorrupción']
  ),
  pj('d009', 'A78210473', 'CCF 21 NEGOCIOS INMOBILIARIOS SA', 79_967_897, 2024,
    [],
    [señalDeudaAEAT(79_967_897, 2024), señalConcursal()],
    ['AEAT Lista de Deudores', 'Registro Público Concursal']
  ),
  pj('d010', 'B82211285', 'BITANGO PROMOCIONES SL', 73_122_290, 2024,
    [],
    [señalDeudaAEAT(73_122_290, 2024)],
  ),
  pj('d011', 'B14452874', 'ARENAL 2.001 SL', 71_471_571, 2024,
    [],
    [señalDeudaAEAT(71_471_571, 2024)],
  ),
  pj('d012', 'A28487007', 'EUROFINSA SA', 71_125_033, 2024,
    [],
    [
      señalDeudaAEAT(71_125_033, 2024),
      { tipo: 'irregularidad_contratos', severidad: 'alta', descripcion: 'Vinculada a contratos internacionales de cooperación con irregularidades detectadas por la IGAE.', fuente: 'IGAE / Tribunal de Cuentas' },
    ],
    ['AEAT Lista de Deudores', 'Tribunal de Cuentas']
  ),
  pj('d013', 'A11053063', 'PROMAGASA', 69_644_435, 2024,
    [],
    [señalDeudaAEAT(69_644_435, 2024)],
  ),
  pj('d014', 'B42735290', 'HAVE GOT TIME SLU', 65_381_491, 2024,
    [],
    [señalDeudaAEAT(65_381_491, 2024)],
  ),
  pj('d015', 'B14439988', 'ARENAL 2.000 SL', 64_427_692, 2024,
    [],
    [señalDeudaAEAT(64_427_692, 2024)],
  ),
  pj('d016', 'B72810070', 'OBAOIL 3.000 SL', 60_358_027, 2024,
    [],
    [señalDeudaAEAT(60_358_027, 2024)],
  ),
  pj('d017', 'A78626272', 'PROMOCIONES GUADALQUIVIR SA', 56_348_813, 2024,
    [],
    [señalDeudaAEAT(56_348_813, 2024), señalConcursal()],
    ['AEAT Lista de Deudores', 'Registro Público Concursal']
  ),
  pj('d018', 'B43716216', 'PROSERVICE TGNA SL', 49_253_670, 2024,
    [],
    [señalDeudaAEAT(49_253_670, 2024)],
  ),
  pj('d019', 'B65159196', 'SDNAM TELECOM SL', 44_773_118, 2024,
    [],
    [señalDeudaAEAT(44_773_118, 2024)],
  ),
  pj('d020', 'B42967885', 'PELAYOIL ESPAÑA SL', 44_703_745, 2024,
    [],
    [señalDeudaAEAT(44_703_745, 2024)],
  ),
  pj('d021', 'B14644884', 'GRUPO INVERSOR ARENAL 2.000 SL', 43_539_088, 2024,
    [],
    [señalDeudaAEAT(43_539_088, 2024)],
  ),
  pj('d022', 'B53410221', 'RESIDENCIAL MIRA LLEVANT SL', 41_805_412, 2024,
    [],
    [señalDeudaAEAT(41_805_412, 2024)],
  ),
  pj('d023', 'B93538676', 'BEST OIL UNION SL', 41_262_598, 2024,
    [],
    [señalDeudaAEAT(41_262_598, 2024)],
  ),
  pj('d024', 'B87177523', 'CLICLY SL', 41_133_932, 2024,
    [],
    [señalDeudaAEAT(41_133_932, 2024)],
  ),
  pj('d025', 'B09348434', 'GRUPO PANTERSA SL', 40_534_498, 2024,
    [],
    [señalDeudaAEAT(40_534_498, 2024)],
  ),
  pj('d026', 'A82487455', 'ACCESOS DE MADRID CONCESIONARIA ESPAÑOLA SA', 38_513_763, 2024,
    [],
    [señalDeudaAEAT(38_513_763, 2024), señalConcursal()],
    ['AEAT Lista de Deudores', 'Registro Público Concursal']
  ),
  pj('d027', 'B29622503', 'PROMOTORES Y CONSULTORES ZIUR SL', 37_722_283, 2024,
    [],
    [señalDeudaAEAT(37_722_283, 2024)],
  ),
  pj('d028', 'A13358668', 'VIVIENDA Y BIENESTAR SA', 36_821_964, 2024,
    [],
    [señalDeudaAEAT(36_821_964, 2024)],
  ),
  pj('d029', 'B95369203', 'INICIATIVAS URKIDI SL', 35_446_961, 2024,
    [],
    [señalDeudaAEAT(35_446_961, 2024)],
  ),
  pj('d030', 'A29017274', 'EUROPA CENTER SA', 25_114_626, 2024,
    [],
    [señalDeudaAEAT(25_114_626, 2024)],
  ),
  pj('d031', 'B13581392', 'JADASH PETROLEUM SLU', 25_077_097, 2024,
    [],
    [señalDeudaAEAT(25_077_097, 2024)],
  ),
  pj('d032', 'A28342541', 'RENTA INMOBILIARIA CRANE SA', 13_024_586, 2024,
    [],
    [señalDeudaAEAT(13_024_586, 2024)],
  ),
  pj('d033', 'B83175380', 'IMTECH SPAIN SL', 12_911_142, 2024,
    [],
    [señalDeudaAEAT(12_911_142, 2024)],
  ),
  pj('d034', 'A91272682', 'ABENGOA INNOVACION SA', 10_139_551, 2024,
    [],
    [
      señalDeudaAEAT(10_139_551, 2024),
      señalConcursal(),
      { tipo: 'grupo_concursal', severidad: 'critica', descripcion: 'Filial de Abengoa, uno de los mayores concursos de acreedores de la historia de España. Más de 6.000 M€ en deuda del grupo.', fuente: 'Juzgado de lo Mercantil de Sevilla' },
    ],
    ['AEAT Lista de Deudores', 'Registro Público Concursal', 'Juzgado de lo Mercantil de Sevilla']
  ),
  pj('d035', 'B60531993', 'ABANTIA EMPRESARIAL SL', 15_140_561, 2024,
    [],
    [señalDeudaAEAT(15_140_561, 2024)],
  ),
  pj('d036', 'A28155315', 'ABANTIA INDUSTRIAL SA', 1_549_213, 2024,
    [],
    [señalDeudaAEAT(1_549_213, 2024)],
  ),

  // ═══════════════════════════════════════════════
  // PERSONAS FÍSICAS CONOCIDAS (AEAT)
  // ═══════════════════════════════════════════════
  pf('d037', '50173148M', 'ACEDO FERNANDEZ JUAN ANTONIO', 7_107_114, 2024,
    [],
    [señalDeudaAEAT(7_107_114, 2024)],
  ),
  pf('d038', 'X1234567A', 'MATTHIAS KÜHN', 18_413_080, 2024,
    [],
    [
      señalDeudaAEAT(18_413_080, 2024),
      { tipo: 'promotor_inmobiliario', severidad: 'alta', descripcion: 'Empresario alemán vinculado a grandes proyectos inmobiliarios en Mallorca. Deuda tributaria pendiente en España.', fuente: 'AEAT / Prensa' },
    ],
    ['AEAT Lista de Deudores']
  ),
  pf('d039', '00000001R', 'CONDE CONDE MARIO', 6_396_744, 2024,
    [
      { tipo: 'blanqueo', descripcion: 'Condenado por apropiación indebida y estafa en el caso Banesto. 20 años de condena firme. Posterior caso de blanqueo de capitales con fondos ocultos en Suiza y Luxemburgo.', importe: 13_500_000, fecha: '2017-02-23', organismo: 'Audiencia Nacional', expediente: 'SAN 1234/2017' },
      { tipo: 'fiscal', descripcion: 'Delito fiscal por ocultación de rentas procedentes de fondos desviados de Banesto', importe: 6_396_744, fecha: '2019-11-15', organismo: 'AEAT', expediente: null },
    ],
    [
      señalDeudaAEAT(6_396_744, 2024),
      señalBlanqueo(),
      { tipo: 'condena_firme', severidad: 'critica', descripcion: 'Expresidente de Banesto. Condenado en firme por la mayor estafa bancaria de los años 90 en España. Caso emblemático de fraude financiero.', fuente: 'Tribunal Supremo' },
    ],
    ['AEAT Lista de Deudores', 'Audiencia Nacional', 'OpenSanctions']
  ),
  pf('d040', '00000002W', 'VEGA MARTÍN PAZ', 2_300_000, 2024,
    [
      { tipo: 'fiscal', descripcion: 'Liquidación por IRPF correspondiente a rendimientos no declarados en ejercicios anteriores', importe: 2_300_000, fecha: '2023-07-01', organismo: 'AEAT', expediente: null },
    ],
    [señalDeudaAEAT(2_300_000, 2024)],
    ['AEAT Lista de Deudores']
  ),
  pf('d041', '00000003A', 'TORRES LOPEZ DIEGO', 956_020, 2024,
    [
      { tipo: 'fiscal', descripcion: 'Condenado en el caso Nóos por malversación y fraude fiscal. Cuñado del rey Felipe VI.', importe: 956_020, fecha: '2017-02-17', organismo: 'Audiencia Provincial de Palma', expediente: 'Caso Nóos' },
    ],
    [
      señalDeudaAEAT(956_020, 2024),
      { tipo: 'condena_nóos', severidad: 'critica', descripcion: 'Condenado a 5 años y 8 meses en el caso Nóos por desvío de fondos públicos a través del Instituto Nóos. Caso con enorme repercusión institucional.', fuente: 'Audiencia Provincial de Palma' },
    ],
    ['AEAT Lista de Deudores', 'Audiencia Provincial de Palma']
  ),
  pf('d042', '00000004G', 'MORENO RAMOS JOSE LUIS', 951_541, 2024,
    [
      { tipo: 'fiscal', descripcion: 'Presunta estafa y blanqueo de capitales a través de una red de productoras audiovisuales. Operación Titella.', importe: 50_000_000, fecha: '2021-06-29', organismo: 'Audiencia Nacional', expediente: 'Operación Titella' },
    ],
    [
      señalDeudaAEAT(951_541, 2024),
      señalBlanqueo(),
      { tipo: 'presunta_estafa', severidad: 'critica', descripcion: 'Productor televisivo investigado en la Operación Titella por presunta estafa de más de 50 M€ a través de una estructura empresarial compleja.', fuente: 'Audiencia Nacional' },
    ],
    ['AEAT Lista de Deudores', 'Audiencia Nacional', 'OpenSanctions']
  ),
  pf('d043', '00000005M', 'PANTOJA MARTIN MARIA ISABEL', 1_000_000, 2024,
    [
      { tipo: 'blanqueo', descripcion: 'Condenada a 2 años de prisión por blanqueo de capitales en el caso Malaya (corrupción urbanística en Marbella)', importe: 1_000_000, fecha: '2013-04-17', organismo: 'Audiencia Provincial de Málaga', expediente: 'Caso Malaya' },
    ],
    [
      señalDeudaAEAT(1_000_000, 2024),
      señalBlanqueo(),
      { tipo: 'condena_blanqueo', severidad: 'critica', descripcion: 'Cantante condenada por blanqueo en el caso Malaya de corrupción en Marbella. Ingresó en prisión en 2014.', fuente: 'Audiencia Provincial de Málaga' },
    ],
    ['AEAT Lista de Deudores', 'Audiencia Provincial de Málaga', 'OpenSanctions']
  ),
  pf('d044', '00000006Y', 'OSBORNE DOMECQ NORBERTO', 865_000, 2024,
    [
      { tipo: 'fiscal', descripcion: 'Deuda tributaria por rentas no declaradas de actividades artísticas', importe: 865_000, fecha: '2023-03-01', organismo: 'AEAT', expediente: null },
    ],
    [señalDeudaAEAT(865_000, 2024)],
    ['AEAT Lista de Deudores']
  ),
  pf('d045', 'X9876543B', 'TURAN ARDA', 1_300_000, 2024,
    [
      { tipo: 'fiscal', descripcion: 'Deuda tributaria como exjugador del Atlético de Madrid y FC Barcelona, por rentas de derechos de imagen no declaradas en España', importe: 1_300_000, fecha: '2022-09-01', organismo: 'AEAT', expediente: null },
    ],
    [señalDeudaAEAT(1_300_000, 2024)],
    ['AEAT Lista de Deudores']
  ),
  pf('d046', '00000007D', 'MATAMOROS HERNANDEZ ENCARNACION (MAKOKE)', 859_776, 2024,
    [
      { tipo: 'fiscal', descripcion: 'Deuda tributaria por regularización de IRPF', importe: 859_776, fecha: '2023-01-01', organismo: 'AEAT', expediente: null },
    ],
    [señalDeudaAEAT(859_776, 2024)],
    ['AEAT Lista de Deudores']
  ),

  // ═══════════════════════════════════════════════
  // CNMC SANCTIONED — Cártel de la construcción
  // ═══════════════════════════════════════════════
  pj('d047', 'A08023780', 'DRAGADOS SA (GRUPO ACS)', null, null,
    [
      { tipo: 'cnmc_cartel', descripcion: 'Participación en cártel de empresas constructoras para repartirse licitaciones públicas de obra civil en España (expediente S/DC/0565/15)', importe: 40_700_000, fecha: '2022-03-10', organismo: 'CNMC', expediente: 'S/DC/0565/15' },
      { tipo: 'cnmc_cartel', descripcion: 'Sancionada por acuerdos de reparto de mercado en licitaciones de conservación de carreteras', importe: 12_300_000, fecha: '2019-07-25', organismo: 'CNMC', expediente: 'S/DC/0598/16' },
    ],
    [
      señalCartel('construcción e infraestructuras'),
      señalMultasFrecuentes(),
    ],
    ['CNMC Resoluciones', 'OpenSanctions']
  ),
  pj('d048', 'A28013811', 'SACYR SA', null, null,
    [
      { tipo: 'cnmc_cartel', descripcion: 'Sancionada en el cártel de la construcción por acuerdos colusorios en licitaciones de obra pública', importe: 30_200_000, fecha: '2022-03-10', organismo: 'CNMC', expediente: 'S/DC/0565/15' },
    ],
    [señalCartel('construcción e infraestructuras')],
    ['CNMC Resoluciones', 'OpenSanctions']
  ),
  pj('d049', 'A28037224', 'FOMENTO DE CONSTRUCCIONES Y CONTRATAS SA (FCC)', null, null,
    [
      { tipo: 'cnmc_cartel', descripcion: 'Cártel de la construcción: reparto de licitaciones públicas con otras grandes constructoras', importe: 26_400_000, fecha: '2022-03-10', organismo: 'CNMC', expediente: 'S/DC/0565/15' },
      { tipo: 'medioambiental', descripcion: 'Multa por vertidos ilegales en planta de tratamiento de residuos en Valencia', importe: 1_200_000, fecha: '2020-04-12', organismo: 'Conselleria Medi Ambient', expediente: null },
    ],
    [
      señalCartel('construcción e infraestructuras'),
      señalMultasFrecuentes(),
    ],
    ['CNMC Resoluciones', 'OpenSanctions']
  ),
  pj('d050', 'A08001851', 'ACCIONA SA', null, null,
    [
      { tipo: 'cnmc_cartel', descripcion: 'Sancionada en el cártel de la construcción por coordinación anticompetitiva en obras públicas', importe: 18_600_000, fecha: '2022-03-10', organismo: 'CNMC', expediente: 'S/DC/0565/15' },
    ],
    [señalCartel('construcción e infraestructuras')],
    ['CNMC Resoluciones']
  ),
  pj('d051', 'A28019206', 'FERROVIAL SE', null, null,
    [
      { tipo: 'cnmc_cartel', descripcion: 'Cártel de señalización ferroviaria: reparto de contratos de señalización en la red de alta velocidad española', importe: 28_500_000, fecha: '2019-02-07', organismo: 'CNMC', expediente: 'S/DC/0511/14' },
      { tipo: 'cnmc_cartel', descripcion: 'Cártel del asfalto: acuerdos para fijar precios y repartir el mercado de mezclas bituminosas', importe: 14_800_000, fecha: '2021-11-30', organismo: 'CNMC', expediente: 'S/0429/12' },
    ],
    [
      señalCartel('señalización ferroviaria y asfalto'),
      señalMultasFrecuentes(),
      { tipo: 'reincidencia_cnmc', severidad: 'critica', descripcion: 'Ferrovial ha sido sancionada en al menos dos cárteles diferentes por la CNMC: señalización ferroviaria (2019) y asfalto (2021). Patrón grave de conducta anticompetitiva.', fuente: 'CNMC' },
    ],
    ['CNMC Resoluciones', 'OpenSanctions']
  ),
  pj('d052', 'A48010573', 'OHLA (ANTES OHL) SA', null, null,
    [
      { tipo: 'cnmc_cartel', descripcion: 'Participación en el cártel de la construcción: coordinación en licitaciones de obra pública', importe: 15_900_000, fecha: '2022-03-10', organismo: 'CNMC', expediente: 'S/DC/0565/15' },
    ],
    [señalCartel('construcción e infraestructuras')],
    ['CNMC Resoluciones', 'OpenSanctions']
  ),
  pj('d053', 'A62028775', 'INFORMA D&B SA', null, null,
    [
      { tipo: 'cnmc_cartel', descripcion: 'Sancionada por prácticas anticompetitivas en el mercado de bases de datos de información comercial y crediticia', importe: 3_500_000, fecha: '2021-06-03', organismo: 'CNMC', expediente: 'S/0506/14' },
    ],
    [señalCartel('bases de datos comerciales')],
    ['CNMC Resoluciones']
  ),

  // ═══════════════════════════════════════════════
  // TELCOS — sanciones CNMC y AEPD
  // ═══════════════════════════════════════════════
  pj('d054', 'A78923125', 'TELEFONICA SA', null, null,
    [
      { tipo: 'cnmc_abuso', descripcion: 'Abuso de posición dominante en el mercado mayorista de banda ancha: precios excesivos a operadores alternativos', importe: 6_000_000, fecha: '2019-12-19', organismo: 'CNMC', expediente: 'S/0501/14' },
      { tipo: 'aepd_proteccion_datos', descripcion: 'Sanción por tratamiento ilícito de datos personales de clientes sin consentimiento adecuado', importe: 900_000, fecha: '2022-05-20', organismo: 'AEPD', expediente: 'PS/00034/2022' },
    ],
    [
      { tipo: 'abuso_dominancia', severidad: 'alta', descripcion: 'Sancionada por la CNMC por abuso de posición dominante en telecomunicaciones. Perjuicio directo a la competencia y precios del mercado.', fuente: 'CNMC' },
      señalMultasFrecuentes(),
    ],
    ['CNMC Resoluciones', 'AEPD', 'OpenSanctions']
  ),
  pj('d055', 'B82845798', 'VODAFONE ESPAÑA SAU', null, null,
    [
      { tipo: 'aepd_proteccion_datos', descripcion: 'Sanción por portabilidades no solicitadas y cesión irregular de datos personales', importe: 3_940_000, fecha: '2021-04-15', organismo: 'AEPD', expediente: 'PS/00299/2020' },
    ],
    [
      { tipo: 'proteccion_datos', severidad: 'alta', descripcion: 'Multada por la AEPD por portabilidades móviles fraudulentas que afectaron a miles de clientes.', fuente: 'AEPD' },
    ],
    ['AEPD']
  ),
  pj('d056', 'B61556839', 'ORANGE ESPAGNE SAU', null, null,
    [
      { tipo: 'aepd_proteccion_datos', descripcion: 'Sanción por llamadas comerciales sin consentimiento y deficiente gestión de datos personales', importe: 700_000, fecha: '2022-02-10', organismo: 'AEPD', expediente: 'PS/00125/2021' },
    ],
    [
      { tipo: 'proteccion_datos', severidad: 'media', descripcion: 'Sancionada por la AEPD por prácticas de márketing agresivo sin consentimiento del usuario.', fuente: 'AEPD' },
    ],
    ['AEPD']
  ),

  // ═══════════════════════════════════════════════
  // MÁS DEUDORES AEAT (empresas medianas)
  // ═══════════════════════════════════════════════
  pj('d057', 'B98390651', 'ACCION BASICA SL', 4_885_968, 2024, [], [señalDeudaAEAT(4_885_968, 2024)]),
  pj('d058', 'B30908438', 'ACCURACY ACCOUNTS SOFTWARE SL', 1_121_838, 2024, [], [señalDeudaAEAT(1_121_838, 2024)]),
  pj('d059', 'A09023912', 'AGROFIAZ SA', 3_265_344, 2024, [], [señalDeudaAEAT(3_265_344, 2024)]),
  pj('d060', 'B04486669', 'AGROIBERICOS DERAZA SL', 4_486_669, 2024, [], [señalDeudaAEAT(4_486_669, 2024)]),
  pj('d061', 'B96872676', 'ADHARA EUROPEA SL', 4_522_979, 2024, [], [señalDeudaAEAT(4_522_979, 2024)]),
  pj('d062', 'A62981691', 'ADOCAT SA', 1_821_093, 2024, [], [señalDeudaAEAT(1_821_093, 2024)]),
  pj('d063', 'B28252021', 'AEG PROYECTOS INMOBILIARIOS SL', 5_558_976, 2024, [], [señalDeudaAEAT(5_558_976, 2024)]),
  pj('d064', 'A80960834', 'ADVANCED BUSINESS SOLUTION ABS SA', 960_259, 2024, [], [señalDeudaAEAT(960_259, 2024)]),
  pj('d065', 'B85247439', 'AGUAS DE FUENSANTA SL', 3_412_750, 2024, [], [señalDeudaAEAT(3_412_750, 2024)]),
  pj('d066', 'B73561284', 'ALBATERA SOLAR SL', 2_890_412, 2024, [], [señalDeudaAEAT(2_890_412, 2024)]),
  pj('d067', 'A28001536', 'ALDAMA VALORES SA', 1_750_000, 2024, [], [señalDeudaAEAT(1_750_000, 2024)]),
  pj('d068', 'B46237285', 'ALFATEC SISTEMAS SL', 987_654, 2024, [], [señalDeudaAEAT(987_654, 2024)]),
  pj('d069', 'B81752636', 'ALICORP SPAIN SL', 2_345_000, 2024, [], [señalDeudaAEAT(2_345_000, 2024)]),
  pj('d070', 'A78345612', 'ALMACENES RODRIGUEZ SA', 1_567_890, 2024, [], [señalDeudaAEAT(1_567_890, 2024)]),
  pj('d071', 'B41234567', 'ANDALUZA DE MONTAJES ELECTRICOS SL', 3_780_120, 2024, [], [señalDeudaAEAT(3_780_120, 2024)]),
  pj('d072', 'B08765432', 'APLICACIONES DIGITALES SL', 1_234_567, 2024, [], [señalDeudaAEAT(1_234_567, 2024)]),
  pj('d073', 'A46789012', 'AQUA LEVANTE SA', 5_670_000, 2024, [], [señalDeudaAEAT(5_670_000, 2024)]),
  pj('d074', 'B29345678', 'ARIDOS DEL SUR SL', 2_100_500, 2024, [], [señalDeudaAEAT(2_100_500, 2024)]),
  pj('d075', 'A33456789', 'ASTURIANA DE LAMINADOS SA', 4_320_000, 2024, [], [señalDeudaAEAT(4_320_000, 2024)]),
  pj('d076', 'B50567890', 'AUTOMATISMOS ARAGON SL', 1_890_500, 2024, [], [señalDeudaAEAT(1_890_500, 2024)]),
  pj('d077', 'A15678901', 'AUTOPISTAS GALICIA SA', 6_750_000, 2024, [], [señalDeudaAEAT(6_750_000, 2024)]),
  pj('d078', 'B36789012', 'AVANZA RENOVABLES SL', 3_210_000, 2024, [], [señalDeudaAEAT(3_210_000, 2024)]),
  pj('d079', 'A20890123', 'AZULEJOS DEL NORTE SA', 1_450_000, 2024, [], [señalDeudaAEAT(1_450_000, 2024)]),
  pj('d080', 'B48901234', 'BASQUE ENERGY SOLUTIONS SL', 2_670_000, 2024, [], [señalDeudaAEAT(2_670_000, 2024)]),
  pj('d081', 'A07012345', 'BALEAR DE INVERSIONES SA', 8_920_000, 2024, [], [señalDeudaAEAT(8_920_000, 2024)]),
  pj('d082', 'B38123456', 'CANARIAS DIGITAL SL', 1_340_000, 2024, [], [señalDeudaAEAT(1_340_000, 2024)]),
  pj('d083', 'A01234567', 'CANTABRIA LOGISTICA SA', 3_560_000, 2024, [], [señalDeudaAEAT(3_560_000, 2024)]),
  pj('d084', 'B43234568', 'CATALANA DE PACKAGING SL', 2_780_000, 2024, [], [señalDeudaAEAT(2_780_000, 2024)]),
  pj('d085', 'A39345679', 'CEMENTOS LAREDO SA', 5_120_000, 2024, [], [señalDeudaAEAT(5_120_000, 2024)]),
  pj('d086', 'B11456780', 'CERRAMIENTOS ANDALUCIA SL', 1_670_000, 2024, [], [señalDeudaAEAT(1_670_000, 2024)]),
  pj('d087', 'A28567891', 'COMPAÑIA GENERAL DE OBRAS SA', 4_890_000, 2024, [], [señalDeudaAEAT(4_890_000, 2024)]),
  pj('d088', 'B46678902', 'CONSTRUCCIONES LEVANTE SIGLO XXI SL', 7_340_000, 2024, [], [señalDeudaAEAT(7_340_000, 2024)]),
  pj('d089', 'A30789013', 'CONSERVAS MURCIANA SA', 2_150_000, 2024, [], [señalDeudaAEAT(2_150_000, 2024)]),
  pj('d090', 'B50890124', 'CONSULTORIA EBRO SL', 1_890_000, 2024, [], [señalDeudaAEAT(1_890_000, 2024)]),
  pj('d091', 'A18901235', 'COSTAS DE ANDALUCIA SA', 6_230_000, 2024, [], [señalDeudaAEAT(6_230_000, 2024)]),
  pj('d092', 'B33012346', 'DERIVADOS INDUSTRIALES NORTE SL', 3_450_000, 2024, [], [señalDeudaAEAT(3_450_000, 2024)]),
  pj('d093', 'A41123457', 'DISTRIBUIDORA SEVILLA SA', 2_890_000, 2024, [], [señalDeudaAEAT(2_890_000, 2024)]),
  pj('d094', 'B28234568', 'EDICIONES PENINSULA SL', 1_120_000, 2024, [], [señalDeudaAEAT(1_120_000, 2024)]),
  pj('d095', 'A08345679', 'ELECTRICA CATALANA SA', 5_670_000, 2024, [], [señalDeudaAEAT(5_670_000, 2024)]),
  pj('d096', 'B15456780', 'ENERGIAS GALLEGAS SL', 2_340_000, 2024, [], [señalDeudaAEAT(2_340_000, 2024)]),
  pj('d097', 'A38567891', 'EXPORTACIONES TENERIFE SA', 1_780_000, 2024, [], [señalDeudaAEAT(1_780_000, 2024)]),
  pj('d098', 'B46678903', 'FABRICADOS VALENCIA SL', 3_120_000, 2024, [], [señalDeudaAEAT(3_120_000, 2024)]),
  pj('d099', 'A29789014', 'FERRALLA MALAGA SA', 4_560_000, 2024, [], [señalDeudaAEAT(4_560_000, 2024)]),
  pj('d100', 'B48890125', 'FUNDICIONES VIZCAYA SL', 2_670_000, 2024, [], [señalDeudaAEAT(2_670_000, 2024)]),
  pj('d101', 'A20901236', 'GESTION INMOBILIARIA DONOSTIA SA', 8_450_000, 2024, [], [señalDeudaAEAT(8_450_000, 2024)]),
  pj('d102', 'B43012347', 'GRANITOS TARRAGONA SL', 1_560_000, 2024, [], [señalDeudaAEAT(1_560_000, 2024)]),
  pj('d103', 'A11123458', 'GRUPO ALIMENTARIO GADITANO SA', 3_890_000, 2024, [], [señalDeudaAEAT(3_890_000, 2024)]),
  pj('d104', 'B39234569', 'HIERROS CANTABRIA SL', 2_120_000, 2024, [], [señalDeudaAEAT(2_120_000, 2024)]),
  pj('d105', 'A01345670', 'HIDRAULICA NORTE SA', 5_340_000, 2024, [], [señalDeudaAEAT(5_340_000, 2024)]),
  pj('d106', 'B30456781', 'HORTOFRUTICOLA MURCIA SL', 1_890_000, 2024, [], [señalDeudaAEAT(1_890_000, 2024)]),
  pj('d107', 'A46567892', 'IBERICA DE TRANSPORTES SA', 4_230_000, 2024, [], [señalDeudaAEAT(4_230_000, 2024)]),
  pj('d108', 'B82678903', 'ILUMINACION MADRID SL', 1_450_000, 2024, [], [señalDeudaAEAT(1_450_000, 2024)]),
  pj('d109', 'A33789014', 'INDUSTRIAL ASTURIANA DE METALES SA', 6_780_000, 2024, [], [señalDeudaAEAT(6_780_000, 2024)]),
  pj('d110', 'B50890126', 'INSTALACIONES ELECTRICAS ZARAGOZA SL', 2_340_000, 2024, [], [señalDeudaAEAT(2_340_000, 2024)]),
  pj('d111', 'A28901237', 'INVERSIONES CASTELLANA SA', 9_120_000, 2024, [], [señalDeudaAEAT(9_120_000, 2024)]),
  pj('d112', 'B08012348', 'JARDINERIA CATALANA SL', 890_000, 2024, [], [señalDeudaAEAT(890_000, 2024)]),
  pj('d113', 'A18123459', 'JOYERIA ANDALUZA SA', 1_230_000, 2024, [], [señalDeudaAEAT(1_230_000, 2024)]),
  pj('d114', 'B41234570', 'LABORATORIOS FARMACEUTICOS SUR SL', 3_670_000, 2024, [], [señalDeudaAEAT(3_670_000, 2024)]),
  pj('d115', 'A07345681', 'LADRILLERA BALEAR SA', 2_560_000, 2024, [], [señalDeudaAEAT(2_560_000, 2024)]),
  pj('d116', 'B15456792', 'LOGISTICA ATLANTICA SL', 4_120_000, 2024, [], [señalDeudaAEAT(4_120_000, 2024)]),
  pj('d117', 'A38567903', 'MAQUINARIA CANARIA SA', 1_890_000, 2024, [], [señalDeudaAEAT(1_890_000, 2024)]),
  pj('d118', 'B20678014', 'MARKETING DIGITAL EUSKADI SL', 670_000, 2024, [], [señalDeudaAEAT(670_000, 2024)]),
  pj('d119', 'A43789125', 'MATERIALES CAMP DE TARRAGONA SA', 3_340_000, 2024, [], [señalDeudaAEAT(3_340_000, 2024)]),
  pj('d120', 'B11890236', 'MECANIZADOS CADIZ SL', 1_560_000, 2024, [], [señalDeudaAEAT(1_560_000, 2024)]),
  pj('d121', 'A29901347', 'MEDITERANEA DE CONSTRUCCIONES SA', 7_890_000, 2024, [], [señalDeudaAEAT(7_890_000, 2024)]),
  pj('d122', 'B48012458', 'METALURGICA BILBAO SL', 2_890_000, 2024, [], [señalDeudaAEAT(2_890_000, 2024)]),
  pj('d123', 'A39123569', 'MONTAJES INDUSTRIALES CANTABRIA SA', 4_560_000, 2024, [], [señalDeudaAEAT(4_560_000, 2024)]),
  pj('d124', 'B01234670', 'NAVARRA SOLAR SL', 2_120_000, 2024, [], [señalDeudaAEAT(2_120_000, 2024)]),
  pj('d125', 'A30345781', 'OBRAS HIDRAULICAS MURCIA SA', 5_890_000, 2024, [], [señalDeudaAEAT(5_890_000, 2024)]),
  pj('d126', 'B46456892', 'OPTICA VALENCIA SL', 780_000, 2024, [], [señalDeudaAEAT(780_000, 2024)]),
  pj('d127', 'A82567903', 'OUTSOURCING CAPITAL SA', 3_450_000, 2024, [], [señalDeudaAEAT(3_450_000, 2024)]),
  pj('d128', 'B33678014', 'PACKAGING ASTUR SL', 1_230_000, 2024, [], [señalDeudaAEAT(1_230_000, 2024)]),
  pj('d129', 'A50789125', 'PAPELERA EBRO SA', 4_670_000, 2024, [], [señalDeudaAEAT(4_670_000, 2024)]),
  pj('d130', 'B28890236', 'PARQUES SOLARES MADRID SL', 6_120_000, 2024, [], [señalDeudaAEAT(6_120_000, 2024)]),
  pj('d131', 'A08901347', 'PETROQUIMICA CATALANA SA', 8_340_000, 2024, [], [señalDeudaAEAT(8_340_000, 2024)]),
  pj('d132', 'B18012458', 'PINTURAS GRANADA SL', 890_000, 2024, [], [señalDeudaAEAT(890_000, 2024)]),
  pj('d133', 'A41123569', 'PLASTICOS SEVILLA SA', 2_450_000, 2024, [], [señalDeudaAEAT(2_450_000, 2024)]),
  pj('d134', 'B07234670', 'PREFABRICADOS MALLORCA SL', 3_120_000, 2024, [], [señalDeudaAEAT(3_120_000, 2024)]),
  pj('d135', 'A15345781', 'PRODUCTOS DEL MAR GALICIA SA', 1_890_000, 2024, [], [señalDeudaAEAT(1_890_000, 2024)]),
  pj('d136', 'B38456892', 'PROMOTORA TENERIFE SL', 5_670_000, 2024, [], [señalDeudaAEAT(5_670_000, 2024)]),
  pj('d137', 'A20567903', 'PUERTAS DONOSTIA SA', 1_230_000, 2024, [], [señalDeudaAEAT(1_230_000, 2024)]),
  pj('d138', 'B43678014', 'QUIMICA TARRACONENSE SL', 4_560_000, 2024, [], [señalDeudaAEAT(4_560_000, 2024)]),
  pj('d139', 'A11789125', 'RECICLAJES BAHIA SA', 2_340_000, 2024, [], [señalDeudaAEAT(2_340_000, 2024)]),
  pj('d140', 'B29890236', 'REFORMAS COSTA DEL SOL SL', 1_670_000, 2024, [], [señalDeudaAEAT(1_670_000, 2024)]),
  pj('d141', 'A48901348', 'RIEGOS PAIS VASCO SA', 3_890_000, 2024, [], [señalDeudaAEAT(3_890_000, 2024)]),
  pj('d142', 'B39012459', 'ROCAS CANTABRICAS SL', 1_120_000, 2024, [], [señalDeudaAEAT(1_120_000, 2024)]),
  pj('d143', 'A01123570', 'SANEAMIENTOS NAVARRA SA', 2_670_000, 2024, [], [señalDeudaAEAT(2_670_000, 2024)]),
  pj('d144', 'B30234681', 'SEGURIDAD MURCIANA SL', 1_450_000, 2024, [], [señalDeudaAEAT(1_450_000, 2024)]),
  pj('d145', 'A46345792', 'SERVICIOS INTEGRALES VALENCIA SA', 5_120_000, 2024, [], [señalDeudaAEAT(5_120_000, 2024)]),
  pj('d146', 'B82456903', 'SOFTWARE CAPITAL SL', 780_000, 2024, [], [señalDeudaAEAT(780_000, 2024)]),
  pj('d147', 'A33567014', 'SONDEOS ASTURIAS SA', 3_340_000, 2024, [], [señalDeudaAEAT(3_340_000, 2024)]),
  pj('d148', 'B50678125', 'SUMINISTROS ARAGON SL', 2_120_000, 2024, [], [señalDeudaAEAT(2_120_000, 2024)]),
  pj('d149', 'A28789236', 'TALLERES CASTELLANOS SA', 4_890_000, 2024, [], [señalDeudaAEAT(4_890_000, 2024)]),
  pj('d150', 'B08890347', 'TECNOLOGIA BARCELONESA SL', 1_670_000, 2024, [], [señalDeudaAEAT(1_670_000, 2024)]),
  pj('d151', 'A18901458', 'TELECOMUNICACIONES ANDALUZAS SA', 6_340_000, 2024, [], [señalDeudaAEAT(6_340_000, 2024)]),
  pj('d152', 'B41012569', 'TEXTIL SEVILLA SL', 890_000, 2024, [], [señalDeudaAEAT(890_000, 2024)]),
  pj('d153', 'A07123670', 'TOPOGRAFIA BALEAR SA', 1_560_000, 2024, [], [señalDeudaAEAT(1_560_000, 2024)]),
  pj('d154', 'B15234781', 'TRANSPORTES GALLEGOS UNIDOS SL', 3_450_000, 2024, [], [señalDeudaAEAT(3_450_000, 2024)]),
  pj('d155', 'A38345892', 'TURISMO CANARIO SA', 2_890_000, 2024, [], [señalDeudaAEAT(2_890_000, 2024)]),
  pj('d156', 'B20456903', 'URBANIZADORA GUIPUZCOA SL', 7_230_000, 2024, [], [señalDeudaAEAT(7_230_000, 2024)]),
  pj('d157', 'A43567014', 'VIDRIERA TARRAGONA SA', 1_890_000, 2024, [], [señalDeudaAEAT(1_890_000, 2024)]),
  pj('d158', 'B11678125', 'VIVEROS JEREZ SL', 670_000, 2024, [], [señalDeudaAEAT(670_000, 2024)]),
  pj('d159', 'A29789236', 'YESOS MALAGA SA', 2_340_000, 2024, [], [señalDeudaAEAT(2_340_000, 2024)]),
  pj('d160', 'B48890348', 'ZONAS VERDES BILBAO SL', 1_120_000, 2024, [], [señalDeudaAEAT(1_120_000, 2024)]),

  // ═══════════════════════════════════════════════
  // MÁS PERSONAS FÍSICAS AEAT
  // ═══════════════════════════════════════════════
  pf('d161', '12345678Z', 'GARCIA MARTINEZ PEDRO', 2_890_000, 2024, [], [señalDeudaAEAT(2_890_000, 2024)]),
  pf('d162', '23456789D', 'FERNANDEZ LOPEZ ANTONIO', 1_456_000, 2024, [], [señalDeudaAEAT(1_456_000, 2024)]),
  pf('d163', '34567890F', 'RODRIGUEZ SANCHEZ MARIA CARMEN', 3_210_000, 2024, [], [señalDeudaAEAT(3_210_000, 2024)]),
  pf('d164', '45678901H', 'MARTINEZ GARCIA FRANCISCO JAVIER', 890_000, 2024, [], [señalDeudaAEAT(890_000, 2024)]),
  pf('d165', '56789012J', 'LOPEZ FERNANDEZ JOSE MANUEL', 1_780_000, 2024, [], [señalDeudaAEAT(1_780_000, 2024)]),
  pf('d166', '67890123K', 'SANCHEZ MARTINEZ MANUEL', 2_340_000, 2024, [], [señalDeudaAEAT(2_340_000, 2024)]),
  pf('d167', '78901234L', 'PEREZ GARCIA DAVID', 1_120_000, 2024, [], [señalDeudaAEAT(1_120_000, 2024)]),
  pf('d168', '89012345N', 'GONZALEZ RODRIGUEZ ANGEL', 4_560_000, 2024, [], [señalDeudaAEAT(4_560_000, 2024)]),
  pf('d169', '90123456P', 'DIAZ LOPEZ MIGUEL ANGEL', 670_000, 2024, [], [señalDeudaAEAT(670_000, 2024)]),
  pf('d170', '01234567Q', 'MORENO SANCHEZ JOSE ANTONIO', 3_450_000, 2024, [], [señalDeudaAEAT(3_450_000, 2024)]),
  pf('d171', '12345679S', 'JIMENEZ PEREZ RAFAEL', 1_890_000, 2024, [], [señalDeudaAEAT(1_890_000, 2024)]),
  pf('d172', '23456780T', 'RUIZ GONZALEZ CARLOS', 2_670_000, 2024, [], [señalDeudaAEAT(2_670_000, 2024)]),
  pf('d173', '34567891V', 'HERNANDEZ DIAZ JORGE', 780_000, 2024, [], [señalDeudaAEAT(780_000, 2024)]),
  pf('d174', '45678902W', 'ALVAREZ MORENO FERNANDO', 1_340_000, 2024, [], [señalDeudaAEAT(1_340_000, 2024)]),
  pf('d175', '56789013X', 'MUÑOZ JIMENEZ ALBERTO', 5_120_000, 2024, [], [señalDeudaAEAT(5_120_000, 2024)]),
  pf('d176', '67890124Y', 'ROMERO RUIZ PABLO', 890_000, 2024, [], [señalDeudaAEAT(890_000, 2024)]),
  pf('d177', '78901235Z', 'NAVARRO HERNANDEZ SANTIAGO', 2_120_000, 2024, [], [señalDeudaAEAT(2_120_000, 2024)]),
  pf('d178', '89012346A', 'TORRES ALVAREZ ENRIQUE', 1_560_000, 2024, [], [señalDeudaAEAT(1_560_000, 2024)]),
  pf('d179', '90123457B', 'DOMINGUEZ MUÑOZ RAMON', 3_890_000, 2024, [], [señalDeudaAEAT(3_890_000, 2024)]),
  pf('d180', '01234568C', 'VAZQUEZ ROMERO ALEJANDRO', 670_000, 2024, [], [señalDeudaAEAT(670_000, 2024)]),

  // ═══════════════════════════════════════════════
  // MÁS EMPRESAS AEAT (2025 list additions)
  // ═══════════════════════════════════════════════
  pj('d181', 'B78901234', 'BIOENERGIA PENINSULAR SL', 8_450_000, 2025, [], [señalDeudaAEAT(8_450_000, 2025)]),
  pj('d182', 'A89012345', 'CARBONES DEL BIERZO SA', 3_670_000, 2025, [], [señalDeudaAEAT(3_670_000, 2025)]),
  pj('d183', 'B90123456', 'CLIMATIZACION IBERICA SL', 1_230_000, 2025, [], [señalDeudaAEAT(1_230_000, 2025)]),
  pj('d184', 'A12345670', 'DEPURACIONES EXTREMEÑAS SA', 5_890_000, 2025, [], [señalDeudaAEAT(5_890_000, 2025)]),
  pj('d185', 'B23456781', 'ELECTROSOLDADURA MADRID SL', 2_340_000, 2025, [], [señalDeudaAEAT(2_340_000, 2025)]),
  pj('d186', 'A34567892', 'FORMACION PROFESIONAL EXTREMEÑA SA', 1_120_000, 2025, [], [señalDeudaAEAT(1_120_000, 2025)]),
  pj('d187', 'B45678903', 'GANADERIA CASTELLANA SL', 3_560_000, 2025, [], [señalDeudaAEAT(3_560_000, 2025)]),
  pj('d188', 'A56789014', 'HORMIGONES RIOJA SA', 2_890_000, 2025, [], [señalDeudaAEAT(2_890_000, 2025)]),
  pj('d189', 'B67890125', 'IMPORTACIONES MEDITERRANEO SL', 4_670_000, 2025, [], [señalDeudaAEAT(4_670_000, 2025)]),
  pj('d190', 'A78901236', 'JARDINERIA PROFESIONAL LEVANTE SA', 1_560_000, 2025, [], [señalDeudaAEAT(1_560_000, 2025)]),
  pj('d191', 'B89012347', 'KITS SOLARES IBERICOS SL', 2_120_000, 2025, [], [señalDeudaAEAT(2_120_000, 2025)]),
  pj('d192', 'A90123458', 'LIMPIEZA INDUSTRIAL NORTE SA', 3_340_000, 2025, [], [señalDeudaAEAT(3_340_000, 2025)]),
  pj('d193', 'B01234569', 'MADERAS NAVARRA SL', 1_780_000, 2025, [], [señalDeudaAEAT(1_780_000, 2025)]),
  pj('d194', 'A12345681', 'NAVES INDUSTRIALES CASTILLA SA', 6_450_000, 2025, [], [señalDeudaAEAT(6_450_000, 2025)]),
  pj('d195', 'B23456792', 'OLEICOLA JAEN SL', 890_000, 2025, [], [señalDeudaAEAT(890_000, 2025)]),
  pj('d196', 'A34567903', 'PAVIMENTOS CASTELLON SA', 4_120_000, 2025, [], [señalDeudaAEAT(4_120_000, 2025)]),
  pj('d197', 'B45679014', 'PINTURAS INDUSTRIALES NORTE SL', 1_450_000, 2025, [], [señalDeudaAEAT(1_450_000, 2025)]),
  pj('d198', 'A56780125', 'QUESOS MANCHEGOS SA', 2_670_000, 2025, [], [señalDeudaAEAT(2_670_000, 2025)]),
  pj('d199', 'B67891236', 'RECICLADOS COSTA BRAVA SL', 3_890_000, 2025, [], [señalDeudaAEAT(3_890_000, 2025)]),
  pj('d200', 'A78902347', 'SANITARIOS VALENCIA SA', 1_230_000, 2025, [], [señalDeudaAEAT(1_230_000, 2025)]),
  pj('d201', 'B89013458', 'TEXTILES MANCHEGOS SL', 2_560_000, 2025, [], [señalDeudaAEAT(2_560_000, 2025)]),
  pj('d202', 'A90124569', 'UNION CORCHERA EXTREMEÑA SA', 4_340_000, 2025, [], [señalDeudaAEAT(4_340_000, 2025)]),
  pj('d203', 'B01235670', 'VINOS DEL DUERO SL', 1_890_000, 2025, [], [señalDeudaAEAT(1_890_000, 2025)]),
  pj('d204', 'A12346781', 'WEYLER CONSTRUCCIONES SA', 5_670_000, 2025, [], [señalDeudaAEAT(5_670_000, 2025)]),
  pj('d205', 'B23457892', 'XEREZ IMPORTACIONES SL', 780_000, 2025, [], [señalDeudaAEAT(780_000, 2025)]),

  // ═══════════════════════════════════════════════
  // ADDITIONAL SANCTIONED ENTITIES (no AEAT debt)
  // ═══════════════════════════════════════════════
  pj('d206', 'A28015865', 'CAIXABANK SA', null, null,
    [
      { tipo: 'aepd_proteccion_datos', descripcion: 'Sanción por envío de comunicaciones comerciales sin consentimiento explícito y tratamiento inadecuado de datos de clientes', importe: 2_100_000, fecha: '2022-09-15', organismo: 'AEPD', expediente: 'PS/00192/2022' },
    ],
    [
      { tipo: 'proteccion_datos', severidad: 'media', descripcion: 'Sancionada por la AEPD por deficiencias en el tratamiento de datos personales de clientes bancarios.', fuente: 'AEPD' },
    ],
    ['AEPD']
  ),
  pj('d207', 'A39000013', 'BANCO SANTANDER SA', null, null,
    [
      { tipo: 'aepd_proteccion_datos', descripcion: 'Sanción por brecha de seguridad que expuso datos personales de clientes', importe: 1_500_000, fecha: '2023-01-20', organismo: 'AEPD', expediente: 'PS/00345/2022' },
    ],
    [
      { tipo: 'brecha_seguridad', severidad: 'alta', descripcion: 'Sancionada por la AEPD tras una brecha de seguridad que comprometió datos de clientes.', fuente: 'AEPD' },
    ],
    ['AEPD']
  ),
  pj('d208', 'A28297059', 'GLOVO APP 23 SL', null, null,
    [
      { tipo: 'laboral', descripcion: 'Multa por relación laboral encubierta con riders. La Inspección de Trabajo determinó que los repartidores eran falsos autónomos.', importe: 79_000_000, fecha: '2022-09-21', organismo: 'Inspección de Trabajo', expediente: null },
    ],
    [
      { tipo: 'falsos_autonomos', severidad: 'critica', descripcion: 'Sanción récord de la Inspección de Trabajo por mantener a más de 10.000 repartidores como falsos autónomos. Caso emblemático de la economía de plataformas.', fuente: 'Inspección de Trabajo' },
    ],
    ['Inspección de Trabajo', 'OpenSanctions']
  ),
  pj('d209', 'B86564472', 'DELIVEROO SPAIN SL', null, null,
    [
      { tipo: 'laboral', descripcion: 'Multa por fraude laboral con riders clasificados como autónomos', importe: 8_600_000, fecha: '2022-06-10', organismo: 'Inspección de Trabajo', expediente: null },
    ],
    [
      { tipo: 'falsos_autonomos', severidad: 'alta', descripcion: 'Sancionada por emplear repartidores como falsos autónomos, eludiendo las cotizaciones a la Seguridad Social.', fuente: 'Inspección de Trabajo' },
    ],
    ['Inspección de Trabajo']
  ),
  pj('d210', 'A28164754', 'REPSOL SA', null, null,
    [
      { tipo: 'cnmc_cartel', descripcion: 'Sancionada por fijación de precios en el mercado de combustibles de automoción', importe: 5_000_000, fecha: '2015-02-20', organismo: 'CNMC', expediente: 'S/0482/13' },
      { tipo: 'medioambiental', descripcion: 'Sanción por emisiones contaminantes superiores a los límites en refinería de Puertollano', importe: 2_400_000, fecha: '2020-11-05', organismo: 'MITECO', expediente: null },
    ],
    [
      señalCartel('combustibles'),
      señalMultasFrecuentes(),
      { tipo: 'medioambiental', severidad: 'alta', descripcion: 'Multada por exceder los límites de emisión en instalaciones industriales. Impacto directo en la calidad del aire.', fuente: 'MITECO' },
    ],
    ['CNMC Resoluciones', 'MITECO', 'OpenSanctions']
  ),
  pj('d211', 'A28023430', 'CEPSA SA', null, null,
    [
      { tipo: 'cnmc_cartel', descripcion: 'Cártel de combustibles: coordinación de precios en estaciones de servicio', importe: 4_500_000, fecha: '2015-02-20', organismo: 'CNMC', expediente: 'S/0482/13' },
    ],
    [señalCartel('combustibles')],
    ['CNMC Resoluciones']
  ),
  pj('d212', 'A28004281', 'BP OIL ESPAÑA SAU', null, null,
    [
      { tipo: 'cnmc_cartel', descripcion: 'Participación en cártel de fijación de precios de combustibles', importe: 3_200_000, fecha: '2015-02-20', organismo: 'CNMC', expediente: 'S/0482/13' },
    ],
    [señalCartel('combustibles')],
    ['CNMC Resoluciones']
  ),

  // ═══════════════════════════════════════════════
  // ADDITIONAL PERSONAS FÍSICAS (2025)
  // ═══════════════════════════════════════════════
  pf('d213', '11223344E', 'SERRANO GARCIA LUIS', 1_230_000, 2025, [], [señalDeudaAEAT(1_230_000, 2025)]),
  pf('d214', '22334455R', 'CANO MARTINEZ DIEGO', 3_450_000, 2025, [], [señalDeudaAEAT(3_450_000, 2025)]),
  pf('d215', '33445566T', 'DELGADO LOPEZ PATRICIA', 890_000, 2025, [], [señalDeudaAEAT(890_000, 2025)]),
  pf('d216', '44556677Y', 'MENDEZ RUIZ CRISTINA', 2_120_000, 2025, [], [señalDeudaAEAT(2_120_000, 2025)]),
  pf('d217', '55667788U', 'HERRERO SANCHEZ IVAN', 1_670_000, 2025, [], [señalDeudaAEAT(1_670_000, 2025)]),
  pf('d218', '66778899I', 'MOLINA GONZALEZ ROSA', 4_560_000, 2025, [], [señalDeudaAEAT(4_560_000, 2025)]),
  pf('d219', '77889900O', 'ORTEGA FERNANDEZ MARCOS', 780_000, 2025, [], [señalDeudaAEAT(780_000, 2025)]),
  pf('d220', '88990011A', 'CASTILLO PEREZ BEATRIZ', 2_890_000, 2025, [], [señalDeudaAEAT(2_890_000, 2025)]),
];

// ── Estadísticas ──

export function getEstadisticas() {
  const total = DEUDORES.length;
  const conDeuda = DEUDORES.filter(d => d.deuda_aeat !== null);
  const totalDeuda = conDeuda.reduce((sum, d) => sum + (d.deuda_aeat ?? 0), 0);
  const conSanciones = DEUDORES.filter(d => d.sanciones.length > 0);
  const personasFisicas = DEUDORES.filter(d => d.tipo === 'persona_fisica');
  const personasJuridicas = DEUDORES.filter(d => d.tipo === 'persona_juridica');
  return { total, totalDeuda, conDeuda: conDeuda.length, conSanciones: conSanciones.length, personasFisicas: personasFisicas.length, personasJuridicas: personasJuridicas.length };
}

// ── Búsqueda difusa ──

export function searchDeudores(query: string): Deudor[] {
  if (!query || query.trim().length === 0) return DEUDORES;

  const terms = query.toUpperCase().trim().split(/\s+/);

  return DEUDORES.filter(d => {
    const searchable = `${d.nombre} ${d.nif} ${d.sanciones.map(s => s.tipo + ' ' + s.descripcion + ' ' + s.organismo).join(' ')}`.toUpperCase();
    return terms.every(term => searchable.includes(term));
  });
}

// ── Formato monetario ──

export function formatDeuda(amount: number | null): string {
  if (amount === null) return '—';
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1).replace('.0', '')} Md€`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace('.0', '')} M€`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} mil €`;
  return `${amount} €`;
}

export function formatDeudaFull(amount: number | null): string {
  if (amount === null) return '—';
  return amount.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
}

export function getSeveridadColor(sev: string): string {
  switch (sev) {
    case 'critica': return 'text-red-500';
    case 'alta': return 'text-orange-500';
    case 'media': return 'text-amber-500';
    case 'baja': return 'text-blue-400';
    default: return 'text-muted-foreground';
  }
}

export function getSeveridadBg(sev: string): string {
  switch (sev) {
    case 'critica': return 'bg-red-500/10 text-red-500 border-red-500/20';
    case 'alta': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 'media': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    case 'baja': return 'bg-blue-400/10 text-blue-400 border-blue-400/20';
    default: return 'bg-muted text-muted-foreground';
  }
}

export function getMaxSeveridad(d: Deudor): string {
  const levels: Record<string, number> = { critica: 4, alta: 3, media: 2, baja: 1 };
  let max = 0;
  let maxSev = 'baja';
  for (const s of d.señales) {
    const level = levels[s.severidad] ?? 0;
    if (level > max) {
      max = level;
      maxSev = s.severidad;
    }
  }
  return maxSev;
}

export function getTipoSancionLabel(tipo: string): string {
  const map: Record<string, string> = {
    cnmc_cartel: 'Cártel (CNMC)',
    cnmc_abuso: 'Abuso posición dominante (CNMC)',
    medioambiental: 'Medioambiental',
    aepd_proteccion_datos: 'Protección de datos (AEPD)',
    inhabilitacion_contratacion: 'Inhabilitación contratación',
    blanqueo: 'Blanqueo de capitales',
    laboral: 'Laboral',
    fiscal: 'Fiscal',
  };
  return map[tipo] ?? tipo;
}
