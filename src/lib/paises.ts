/** Catálogo fijo de países con su clave ISO para Origen y Destino. */
export type Pais = { clave: string; nombre: string };

export const PAISES: Pais[] = [
  { clave: "MEX", nombre: "México" },
  { clave: "USA", nombre: "Estados Unidos" },
  { clave: "CAN", nombre: "Canadá" },
  { clave: "GTM", nombre: "Guatemala" },
  { clave: "CRI", nombre: "Costa Rica" },
  { clave: "PAN", nombre: "Panamá" },
  { clave: "CUB", nombre: "Cuba" },
  { clave: "DOM", nombre: "República Dominicana" },
  { clave: "PRI", nombre: "Puerto Rico" },
  { clave: "COL", nombre: "Colombia" },
  { clave: "VEN", nombre: "Venezuela" },
  { clave: "ECU", nombre: "Ecuador" },
  { clave: "PER", nombre: "Perú" },
  { clave: "BRA", nombre: "Brasil" },
  { clave: "CHL", nombre: "Chile" },
  { clave: "ARG", nombre: "Argentina" },
  { clave: "URY", nombre: "Uruguay" },
  { clave: "PRY", nombre: "Paraguay" },
  { clave: "BOL", nombre: "Bolivia" },
  { clave: "ESP", nombre: "España" },
  { clave: "PRT", nombre: "Portugal" },
  { clave: "FRA", nombre: "Francia" },
  { clave: "ITA", nombre: "Italia" },
  { clave: "DEU", nombre: "Alemania" },
  { clave: "GBR", nombre: "Reino Unido" },
  { clave: "GRC", nombre: "Grecia" },
  { clave: "SRB", nombre: "Serbia" },
  { clave: "LTU", nombre: "Lituania" },
  { clave: "TUR", nombre: "Turquía" },
  { clave: "CHN", nombre: "China" },
  { clave: "JPN", nombre: "Japón" },
  { clave: "AUS", nombre: "Australia" },
  { clave: "OTR", nombre: "Otro país" },
];

export const nombrePais = (clave: string) =>
  PAISES.find((p) => p.clave === clave)?.nombre ?? clave;

export const lugarTexto = (clave: string, ciudad: string) =>
  clave ? `${ciudad ? `${ciudad}, ` : ""}${nombrePais(clave)} (${clave})` : "";
