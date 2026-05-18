import { useState, useMemo } from "react";

// Paleta de colores prémium inspirada en gastronomía fina, tonos orgánicos y oliva
const T = {
  sidebar: "#0d2411",       // Verde oliva oscuro profundo
  sidebarHover: "#18361e",  // Verde oliva medio
  accent: "#d4af37",        // Dorado gastronómico
  accentLight: "#fbf6e8",   // Crema suave para destacar
  accentBorder: "#e5c158",  // Borde dorado
  bg: "#fcfbfa",            // Fondo hueso/lino muy limpio
  card: "#ffffff",          // Blanco puro para contenedores
  border: "#e8e4dc",        // Borde gris cálido suave
  borderLight: "#f4f1eb",   // Separadores sutiles
  text: "#1f1d1a",          // Carbón suave
  muted: "#756e65",         // Texto secundario cálido
  light: "#a8a095",         // Texto atenuado
  calc: "#fffdf9",          // Fondo de celdas de cálculo
  calcText: "#8a6d1c",      // Texto dorado oscuro para cálculos
  success: "#1b7a36",       // Verde de rentabilidad alta
  successBg: "#f0f9f2",     // Fondo verde suave
  danger: "#a92323",        // Rojo de alerta / costo elevado
  dangerBg: "#fdf3f3",      // Fondo rojo suave
  header: "#f8f6f1",        // Cabezote de tablas
  row2: "#faf9f6",          // Fila cebra
};

// Formateadores estándar
const cop = v => (v == null || isNaN(v)) ? "–" : "$" + Math.round(v).toLocaleString("es-CO");
const n2 = v => (v == null || isNaN(v)) ? "–" : Number(v).toFixed(2);
const pct = v => (v == null || isNaN(v)) ? "–" : (v * 100).toFixed(1) + "%";

// Constantes de nómina colombiana (actualizadas)
const SALUD = 0.085, PENSION = 0.12, ARL = 0.0435, PARA = 0.04, PREST = 0.22;
const IMPO = 0.08; // Impuesto al consumo colombia

let _uid = 1000;
const uid = () => ++_uid;

// Cálculos de personal con prestaciones sociales completas
const calcStaff = (p) => {
  const sub = (p.salario || 0) + (p.auxTransporte || 0);
  const salud = (p.salario || 0) * SALUD;
  const pension = (p.salario || 0) * PENSION;
  const arl = (p.salario || 0) * ARL;
  const para = (p.salario || 0) * PARA;
  const prest = sub * PREST;
  const subPrest = salud + pension + arl + para + prest + (p.uniforme || 0);
  const total1 = sub + subPrest;
  return { sub, salud, pension, arl, para, prest, subPrest, total1, totalPagar: total1 * (p.cantidad || 1) };
};

// Calcula el costo de un material en inventario
const calcMat = (m) => {
  const precioFinal = (m.precioCompra || 0) * (1 + (m.ajuste || 0));
  return {
    precioFinal,
    costoXg: (m.presentacion || 1) > 0 ? precioFinal / m.presentacion : 0
  };
};

// Obtiene el costo base bruto de un ingrediente
const getIngCostoBase = (ing, mats) => {
  if (ing.materialId) {
    const m = mats.find(x => x.id === ing.materialId);
    if (m) return calcMat(m).costoXg;
  }
  return ing.costoManual || 0;
};

// Calcula los costos reales de la receta aplicando correctamente la MERMA
const calcRecipe = (rec, mats) => {
  let costoRecTotal = 0;
  let pesoBrutoTotal = 0;
  let pesoNetoTotal = 0;

  const ings = rec.ingredientes.map(ing => {
    // 1. Obtener costo bruto por unidad (g/ml/u) de la materia prima
    const cuBruto = getIngCostoBase(ing, mats);
    const cantNeta = ing.cantidad || 0;
    const mermaPct = ing.merma || 0;

    // 2. CALCULO RECALIBRADO POR MERMA:
    // El costo unitario real neto aumenta porque parte de lo comprado se desecha.
    // Costo Neto = Costo Bruto / (1 - % Merma)
    const factorRendimiento = 1 - mermaPct;
    const cuNeto = factorRendimiento > 0 ? (cuBruto / factorRendimiento) : cuBruto;

    // Cantidad bruta que realmente se debe comprar/procesar para lograr la cantidad neta deseada
    const cantBruta = factorRendimiento > 0 ? (cantNeta / factorRendimiento) : cantNeta;

    // El costo total del ingrediente en la receta es la Cantidad Neta * Costo Unitario Neto
    const ct = cantNeta * cuNeto;
    costoRecTotal += ct;

    if (ing.tipo !== "ml") {
      pesoBrutoTotal += cantBruta;
      pesoNetoTotal += cantNeta;
    }

    return {
      ...ing,
      cuBruto,
      cuNeto,
      cantBruta,
      ct
    };
  });

  const porc = rec.porciones || 1;
  const cpR = costoRecTotal / porc; // Costo de materia prima por ración (al plato)
  const mg = rec.margen || 0;

  // Precio de venta calculado en base al margen de contribución deseado
  const pv = mg < 1 && mg > 0 ? cpR / (1 - mg) : cpR;
  const impo = pv * IMPO;
  const pp = pv + impo;

  return {
    ings,
    costoRec: costoRecTotal,
    cpR,
    pv,
    impo,
    pp,
    pbR: pesoBrutoTotal / porc,
    pnR: pesoNetoTotal / porc
  };
};

const MATS_INIT = [
  { id: 1, cat: "SALSAS", nombre: "Salsa de soya", presentacion: 3000, precioCompra: 13400, ajuste: 0.10, proveedor: "Disal" },
  { id: 2, cat: "SALSAS", nombre: "Salsa de ostras", presentacion: 2268, precioCompra: 30900, ajuste: 0.10, proveedor: "Makro" },
  { id: 3, cat: "SALSAS", nombre: "Salsa de pescado", presentacion: 700, precioCompra: 15000, ajuste: 0.10, proveedor: "Asia Market" },
  { id: 4, cat: "SALSAS", nombre: "Curry rojo", presentacion: 1000, precioCompra: 32000, ajuste: 0.10, proveedor: "Asia Market" },
  { id: 5, cat: "SALSAS", nombre: "Leche de coco 425ml", presentacion: 425, precioCompra: 7250, ajuste: 0.05, proveedor: "D1" },
  { id: 6, cat: "SECOS", nombre: "Papel de arroz", presentacion: 400, precioCompra: 8980, ajuste: 0.05, proveedor: "Asia Market" },
  { id: 7, cat: "SECOS", nombre: "Vermicelli de arroz", presentacion: 200, precioCompra: 3050, ajuste: 0.05, proveedor: "Makro" },
  { id: 8, cat: "SECOS", nombre: "Arroz jazmín 1kg", presentacion: 1000, precioCompra: 16500, ajuste: 0.05, proveedor: "Exito" },
  { id: 9, cat: "SECOS", nombre: "Azúcar blanca 1kg", presentacion: 1000, precioCompra: 4200, ajuste: 0.05, proveedor: "Exito" },
  { id: 10, cat: "SECOS", nombre: "Sal 1kg", presentacion: 1000, precioCompra: 1800, ajuste: 0.02, proveedor: "Exito" },
  { id: 11, cat: "ACEITES", nombre: "Aceite vegetal 1L", presentacion: 1000, precioCompra: 9500, ajuste: 0.05, proveedor: "Makro" },
  { id: 12, cat: "ACEITES", nombre: "Aceite ajonjolí 207ml", presentacion: 207, precioCompra: 18000, ajuste: 0.05, proveedor: "Exito" },
  { id: 13, cat: "CARNES", nombre: "Pechuga de pollo", presentacion: 1000, precioCompra: 14500, ajuste: 0.08, proveedor: "Coquiko" },
  { id: 14, cat: "CARNES", nombre: "Alas de pollo", presentacion: 1000, precioCompra: 12800, ajuste: 0.08, proveedor: "Coquiko" },
  { id: 15, cat: "CARNES", nombre: "Camarón tigre", presentacion: 1000, precioCompra: 46000, ajuste: 0.10, proveedor: "Ancla & Viento" },
  { id: 16, cat: "CARNES", nombre: "Carne de res (solomo)", presentacion: 1000, precioCompra: 28000, ajuste: 0.08, proveedor: "Colanta" },
  { id: 17, cat: "CARNES", nombre: "Carne de cerdo", presentacion: 1000, precioCompra: 18500, ajuste: 0.08, proveedor: "Colanta" },
  { id: 18, cat: "FRUVER", nombre: "Lechuga batavia", presentacion: 1000, precioCompra: 4500, ajuste: 0.15, proveedor: "Plaza España" },
  { id: 19, cat: "FRUVER", nombre: "Tomate chonto", presentacion: 1000, precioCompra: 3800, ajuste: 0.15, proveedor: "Plaza España" },
  { id: 20, cat: "FRUVER", nombre: "Mango tommy", presentacion: 1000, precioCompra: 5200, ajuste: 0.15, proveedor: "Plaza España" },
  { id: 21, cat: "FRUVER", nombre: "Limón tahití", presentacion: 1000, precioCompra: 4800, ajuste: 0.15, proveedor: "Plaza España" },
  { id: 22, cat: "FRUVER", nombre: "Menta", presentacion: 1000, precioCompra: 18000, ajuste: 0.20, proveedor: "Plaza España" },
  { id: 23, cat: "FRUVER", nombre: "Cebolla roja", presentacion: 1000, precioCompra: 3200, ajuste: 0.15, proveedor: "Plaza España" },
  { id: 24, cat: "FRUVER", nombre: "Cilantro", presentacion: 1000, precioCompra: 9000, ajuste: 0.20, proveedor: "Plaza España" },
  { id: 25, cat: "FRUVER", nombre: "Banano bocadillo", presentacion: 1000, precioCompra: 3500, ajuste: 0.15, proveedor: "Plaza España" },
  { id: 26, cat: "FRUVER", nombre: "Sandía", presentacion: 1000, precioCompra: 1800, ajuste: 0.15, proveedor: "Plaza España" },
  { id: 27, cat: "FRUVER", nombre: "Coco rallado 1kg", presentacion: 1000, precioCompra: 16740, ajuste: 0.10, proveedor: "Makro" },
  { id: 28, cat: "OTROS", nombre: "Huevo tipo A (ud)", presentacion: 1, precioCompra: 550, ajuste: 0.02, proveedor: "Avinal" },
  { id: 29, cat: "OTROS", nombre: "Galletas de soda 440g", presentacion: 440, precioCompra: 4720, ajuste: 0.05, proveedor: "D1" },
  { id: 30, cat: "OTROS", nombre: "Mantequilla 750g", presentacion: 750, precioCompra: 16500, ajuste: 0.05, proveedor: "Exito" },
  { id: 31, cat: "OTROS", nombre: "Leche condensada 390g", presentacion: 390, precioCompra: 6800, ajuste: 0.05, proveedor: "D1" },
  { id: 32, cat: "OTROS", nombre: "Crema de leche 990g", presentacion: 990, precioCompra: 14500, ajuste: 0.05, proveedor: "Colanta" },
  { id: 33, cat: "OTROS", nombre: "Tapioca / Sago 500g", presentacion: 500, precioCompra: 11000, ajuste: 0.05, proveedor: "Asia Market" },
  { id: 34, cat: "OTROS", nombre: "Agua (litro)", presentacion: 1000, precioCompra: 50, ajuste: 0.0, proveedor: "Acueducto" },
];

const mkIng = (n, mid, t, c, m, cm = 0) => ({ id: uid(), nombre: n, materialId: mid, tipo: t, cantidad: c, merma: m, costoManual: cm });
const mkRec = (n, p, mg, u, ings) => ({ id: uid(), nombre: n, porciones: p, margen: mg, unidadesMes: u, ingredientes: ings });

const RECIPES_INIT = {
  ensaladas: [
    mkRec("Ensalada de Mango", 2, 0.70, 200, [
      mkIng("Mango tommy", 20, "g", 175, 0.35), // 35% de merma (cáscara y semilla)
      mkIng("Tomate chonto", 19, "g", 100, 0.10), // 10% merma (semillas y pedúnculo)
      mkIng("Camarón tigre", 15, "g", 35, 0.15),  // 15% merma (limpieza y cocción)
      mkIng("Menta", 22, "g", 10, 0.40),         // 40% merma (tallos no usados)
    ]),
    mkRec("Ensalada de Pollo", 5, 0.75, 200, [
      mkIng("Pechuga de pollo", 13, "g", 255, 0.30), // 30% de merma (deshuese y merma cocción)
      mkIng("Lechuga batavia", 18, "g", 331, 0.20),  // 20% merma (hojas exteriores)
      mkIng("Cilantro", 24, "g", 15, 0.50),          // 50% de merma (tallo)
    ]),
  ],
  entradas: [
    mkRec("Rollo de Cerdo y Camarón", 1, 0.72, 100, [
      mkIng("Vermicelli de arroz", 7, "g", 40, 0.02),
      mkIng("Lechuga batavia", 18, "g", 80, 0.20),
      mkIng("Carne de cerdo", 17, "g", 40, 0.25),   // 25% de merma (grasa y cocción)
      mkIng("Camarón tigre", 15, "g", 20, 0.15),
      mkIng("Papel de arroz", 6, "u", 2, 0.05),     // 5% de merma por ruptura
    ]),
    mkRec("Res Seca", 18, 0.70, 100, [
      mkIng("Carne de res (solomo)", 16, "g", 2000, 0.40), // 40% deshidratación y limpieza
      mkIng("Sal", 10, "g", 15, 0.0),
      mkIng("Salsa de pescado", 3, "ml", 15, 0.01),
    ]),
    mkRec("Alitas Thai Glaseadas", 11, 0.70, 100, [
      mkIng("Alas de pollo", 14, "g", 2000, 0.35), // 35% merma por hueso y cocción
      mkIng("Salsa de soya", 1, "ml", 30, 0.0),
      mkIng("Sal", 10, "g", 10, 0.0),
    ]),
  ],
  primeros: [
    mkRec("Arroz Frito (Nem Khao)", 10, 0.75, 200, [
      mkIng("Arroz jazmín 1kg", 8, "g", 750, 0.02),
      mkIng("Carne de cerdo", 17, "g", 750, 0.25),
      mkIng("Coco rallado 1kg", 27, "g", 92, 0.02),
      mkIng("Curry rojo", 4, "g", 15, 0.0),
      mkIng("Aceite vegetal 1L", 11, "g", 102, 0.0),
      mkIng("Cebolla roja", 23, "g", 230, 0.12), // 12% merma (raíces y cáscara)
      mkIng("Sal", 10, "g", 15, 0.0),
      mkIng("Cilantro", 24, "g", 30, 0.50),
    ]),
    mkRec("Wraps de Res", 1, 0.68, 200, [
      mkIng("Vermicelli de arroz", 7, "g", 200, 0.02),
      mkIng("Lechuga batavia", 18, "g", 150, 0.20),
      mkIng("Carne de res (solomo)", 16, "g", 150, 0.30),
      mkIng("Papel de arroz", 6, "u", 5, 0.05),
    ]),
    mkRec("Pollo al Curry Rojo", 5, 0.74, 200, [
      mkIng("Pechuga de pollo", 13, "g", 900, 0.30),
      mkIng("Leche de coco 425ml", 5, "ml", 425, 0.02),
      mkIng("Curry rojo", 4, "g", 45, 0.0),
      mkIng("Cebolla roja", 23, "g", 200, 0.12),
      mkIng("Aceite vegetal 1L", 11, "ml", 60, 0.0),
      mkIng("Sal", 10, "g", 10, 0.0),
    ]),
  ],
  arrozBase: [
    mkRec("Arroz al Vapor", 14, 0.85, 200, [
      mkIng("Arroz jazmín 1kg", 8, "g", 979, 0.02),
      mkIng("Agua (litro)", 34, "ml", 489, 0.0),
    ]),
    mkRec("Arroz Glutinoso", 4, 0.82, 200, [
      mkIng("Arroz jazmín 1kg", 8, "g", 355, 0.02),
      mkIng("Agua (litro)", 34, "ml", 250, 0.0),
    ]),
  ],
  salsas: [
    mkRec("Salsa para Wraps", 2, 0.80, 200, [
      mkIng("Salsa de pescado", 3, "ml", 60, 0.0),
      mkIng("Limón tahití", 21, "ml", 60, 0.45), // 45% merma (cáscara y pulpa no exprimible)
      mkIng("Agua (litro)", 34, "ml", 120, 0.0),
    ]),
    mkRec("Salsa de Curry", 4, 0.75, 150, [
      mkIng("Curry rojo", 4, "g", 80, 0.0),
      mkIng("Leche de coco 425ml", 5, "ml", 200, 0.02),
      mkIng("Salsa de pescado", 3, "ml", 30, 0.0),
    ]),
  ],
  postres: [
    mkRec("Sago Banana", 15, 0.75, 200, [
      mkIng("Banano bocadillo", 25, "g", 300, 0.33), // 33% de merma (cáscara)
      mkIng("Azúcar blanca 1kg", 9, "g", 400, 0.0),
      mkIng("Leche de coco 425ml", 5, "ml", 500, 0.02),
      mkIng("Tapioca / Sago 500g", 33, "g", 100, 0.0),
    ]),
    mkRec("Key Lime Pie", 6, 0.75, 100, [
      mkIng("Galletas de soda 440g", 29, "g", 147, 0.01),
      mkIng("Mantequilla 750g", 30, "g", 87, 0.0),
      mkIng("Leche condensada 390g", 31, "g", 420, 0.0),
      mkIng("Huevo tipo A (ud)", 28, "u", 4, 0.12), // 12% merma (cáscara)
      mkIng("Limón tahití", 21, "g", 120, 0.45),
      mkIng("Crema de leche 990g", 32, "g", 200, 0.01),
    ]),
  ],
  bebidas: [
    mkRec("Jugo de Sandía", 2, 0.80, 200, [
      mkIng("Sandía", 26, "g", 480, 0.42), // 42% de merma (corteza verde pesada)
      mkIng("Azúcar blanca 1kg", 9, "g", 15, 0.0),
      mkIng("Agua (litro)", 34, "ml", 241, 0.0),
    ]),
    mkRec("Batido de Mango", 2, 0.78, 150, [
      mkIng("Mango tommy", 20, "g", 300, 0.35),
      mkIng("Azúcar blanca 1kg", 9, "g", 20, 0.0),
      mkIng("Agua (litro)", 34, "ml", 200, 0.0),
    ]),
  ],
};

// ─────────────────────────── UI HELPERS ───────────────────────────

const s = (base, extra = {}) => ({ ...base, ...extra });

const styles = {
  cell: { padding: "8px 10px", fontSize: 13, borderBottom: `1px solid ${T.borderLight}`, verticalAlign: "middle" },
  cellCalc: { padding: "8px 10px", fontSize: 13, background: T.calc, color: T.calcText, fontFamily: "monospace", textAlign: "right", borderBottom: `1px solid ${T.borderLight}` },
  th: { padding: "10px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.muted, background: T.header, borderBottom: `2px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap" },
  thR: { padding: "10px 10px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: T.muted, background: T.header, borderBottom: `2px solid ${T.border}`, textAlign: "right", whiteSpace: "nowrap" },
  inp: { border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 13, width: "100%", background: "#fff", color: T.text, outline: "none", transition: "border 0.2s" },
  inpNum: { border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 13, width: 90, background: "#fff", color: T.text, textAlign: "right", outline: "none" },
  inpPct: { border: `1px solid ${T.border}`, borderRadius: 6, padding: "5px 8px", fontSize: 13, width: 65, background: "#fff", color: T.text, textAlign: "right", outline: "none" },
  btn: { border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer", background: T.accent, color: T.sidebar, fontWeight: 700, transition: "opacity 0.2s" },
  btnSm: { border: `1px solid ${T.border}`, borderRadius: 5, padding: "4px 8px", fontSize: 11, cursor: "pointer", background: "#fff", color: T.muted, fontWeight: 600 },
  btnDel: { border: "none", background: "none", cursor: "pointer", color: T.danger, fontSize: 16, lineHeight: 1, padding: "2px 6px" },
  card: { background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, marginBottom: 20, overflow: "hidden", boxShadow: "0 2px 5px rgba(0,0,0,0.02)" },
  cardHead: { background: T.header, padding: "12px 18px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" },
  modTitle: { fontSize: 24, fontWeight: 800, color: T.text, marginBottom: 4, letterSpacing: "-0.02em" },
  modSub: { fontSize: 14, color: T.muted, marginBottom: 20 },
  label: { fontSize: 11, color: T.muted, marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" },
  statCard: { background: T.calc, borderRadius: 8, padding: "12px 16px", border: `1px solid ${T.accentBorder}`, minWidth: 140, boxShadow: "0 1px 3px rgba(0,0,0,0.01)" },
  statVal: { fontSize: 22, fontWeight: 800, color: T.accent, fontFamily: "monospace", letterSpacing: "-0.02em" },
  statLbl: { fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4, fontWeight: 600 },
};

const Input = ({ value, onChange, style, type = "text" }) => (
  <input
    type={type}
    value={value}
    onChange={e => onChange(type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
    style={style || styles.inp}
  />
);

const THead = ({ cols }) => (
  <thead><tr>{cols.map((c, i) => <th key={i} style={c.right ? styles.thR : styles.th}>{c.label}</th>)}</tr></thead>
);

const AddRow = ({ onClick, label = "＋ Agregar Fila", cols = 20 }) => (
  <tr><td colSpan={cols} style={{ padding: "10px 12px", background: "#fdfdfd" }}>
    <button style={styles.btnSm} onClick={onClick}>{label}</button>
  </td></tr>
);

const TotalRow = ({ label, value, cols = 2, color }) => (
  <tr style={{ background: T.header }}>
    <td colSpan={cols} style={{ ...styles.cell, fontWeight: 800, fontSize: 13 }}>{label}</td>
    <td style={{ ...styles.cellCalc, fontWeight: 800, fontSize: 14, color: color || T.accent }}>{cop(value)}</td>
  </tr>
);

// ─────────────────────────── MODULE: PERSONAL ───────────────────────────

function PersonalModule({ data, setData }) {
  const rows = data.map(p => ({ ...p, ...calcStaff(p) }));
  const total = rows.reduce((s, r) => s + r.totalPagar, 0);

  const update = (id, k, v) => setData(d => d.map(p => p.id === id ? { ...p, [k]: v } : p));
  const addRow = () => setData(d => [...d, { id: uid(), nombre: "Nuevo cargo", cantidad: 1, salario: 1300000, auxTransporte: 162000, uniforme: 10000 }]);
  const delRow = (id) => setData(d => d.filter(p => p.id !== id));

  return (
    <div>
      <div style={styles.modTitle}>👥 Costos de Personal</div>
      <div style={styles.modSub}>Nómina mensual proyectada con todas las prestaciones de ley colombiana vigentes</div>
      <div style={styles.card}>
        <div style={styles.cardHead}>
          <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>Estructura de Cargos de Operaciones</span>
          <button style={styles.btn} onClick={addRow}>＋ Agregar Cargo</button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead cols={[
              { label: "Cargo / Puesto" }, { label: "Cant." }, { label: "Salario Base", right: true }, { label: "Aux. Transporte", right: true },
              { label: "Subtotal Base", right: true }, { label: "Salud 8.5%", right: true }, { label: "Pensión 12%", right: true },
              { label: "ARL 4.35%", right: true }, { label: "Parafiscales 4%", right: true }, { label: "Prestaciones 22%", right: true },
              { label: "Uniforme/Mes", right: true }, { label: "Carga Prestac.", right: true }, { label: "Costo/Persona", right: true }, { label: "Costo Total/Mes", right: true }, { label: "" }
            ]} />
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 1 ? T.row2 : T.card }}>
                  <td style={styles.cell}><Input value={r.nombre} onChange={v => update(r.id, "nombre", v)} /></td>
                  <td style={styles.cell}><Input type="number" value={r.cantidad} onChange={v => update(r.id, "cantidad", v)} style={{ ...styles.inpNum, width: 50 }} /></td>
                  <td style={styles.cell}><Input type="number" value={r.salario} onChange={v => update(r.id, "salario", v)} style={styles.inpNum} /></td>
                  <td style={styles.cell}><Input type="number" value={r.auxTransporte} onChange={v => update(r.id, "auxTransporte", v)} style={styles.inpNum} /></td>
                  <td style={styles.cellCalc}>{cop(r.sub)}</td>
                  <td style={styles.cellCalc}>{cop(r.salud)}</td>
                  <td style={styles.cellCalc}>{cop(r.pension)}</td>
                  <td style={styles.cellCalc}>{cop(r.arl)}</td>
                  <td style={styles.cellCalc}>{cop(r.para)}</td>
                  <td style={styles.cellCalc}>{cop(r.prest)}</td>
                  <td style={styles.cell}><Input type="number" value={r.uniforme} onChange={v => update(r.id, "uniforme", v)} style={styles.inpNum} /></td>
                  <td style={styles.cellCalc}>{cop(r.subPrest)}</td>
                  <td style={styles.cellCalc}>{cop(r.total1)}</td>
                  <td style={{ ...styles.cellCalc, fontWeight: 700, color: T.accent }}>{cop(r.totalPagar)}</td>
                  <td style={styles.cell}><button style={styles.btnDel} onClick={() => delRow(r.id)}>×</button></td>
                </tr>
              ))}
              <AddRow onClick={addRow} cols={15} />
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <div style={styles.statCard}><div style={styles.statVal}>{cop(total)}</div><div style={styles.statLbl}>Total Nómina Mensual</div></div>
        <div style={styles.statCard}><div style={styles.statVal}>{cop(total / 30)}</div><div style={styles.statLbl}>Costo Nómina por Día</div></div>
        <div style={styles.statCard}><div style={styles.statVal}>{data.reduce((s, p) => s + (p.cantidad || 1), 0)}</div><div style={styles.statLbl}>Total Colaboradores</div></div>
      </div>
      <div style={{ marginTop: 14, padding: "12px 16px", background: T.calc, borderRadius: 8, border: `1px solid ${T.accentBorder}`, fontSize: 12, color: T.calcText }}>
        💡 <b>Parámetros de Legislación Colombiana:</b> Los aportes patronales incluyen Salud (8.5%), Pensión (12%), ARL clase III (4.355% promedio de riesgo operativo de cocina), Parafiscales (CCF/Sena/ICBF 4%) y Provisión de Prestaciones Sociales (Prima, Cesantías, Intereses de cesantías y Vacaciones estimadas en 22% consolidado).
      </div>
    </div>
  );
}

// ─────────────────────────── MODULE: COSTOS FIJOS ───────────────────────────

function CostosFijosModule({ data, setData, totalPersonal }) {
  const { gastosFijos, gastosVentas } = data;
  const updGF = (id, v) => setData(d => ({ ...d, gastosFijos: d.gastosFijos.map(x => x.id === id ? { ...x, valor: v } : x) }));
  const updGV = (id, v) => setData(d => ({ ...d, gastosVentas: d.gastosVentas.map(x => x.id === id ? { ...x, valor: v } : x) }));
  const updNombreGF = (id, v) => setData(d => ({ ...d, gastosFijos: d.gastosFijos.map(x => x.id === id ? { ...x, nombre: v } : x) }));
  const updNombreGV = (id, v) => setData(d => ({ ...d, gastosVentas: d.gastosVentas.map(x => x.id === id ? { ...x, nombre: v } : x) }));
  const addGF = () => setData(d => ({ ...d, gastosFijos: [...d.gastosFijos, { id: uid(), nombre: "Nuevo gasto fijo", valor: 0 }] }));
  const addGV = () => setData(d => ({ ...d, gastosVentas: [...d.gastosVentas, { id: uid(), nombre: "Nuevo gasto de ventas", valor: 0 }] }));
  const delGF = (id) => setData(d => ({ ...d, gastosFijos: d.gastosFijos.filter(x => x.id !== id) }));
  const delGV = (id) => setData(d => ({ ...d, gastosVentas: d.gastosVentas.filter(x => x.id !== id) }));

  const totalGF = gastosFijos.reduce((s, x) => s + (x.valor || 0), 0);
  const totalGV = gastosVentas.reduce((s, x) => s + (x.valor || 0), 0);
  const totalMes = totalGF + totalGV;
  const totalConPersonal = totalMes + totalPersonal;

  const CostTable = ({ rows, onNombre, onValor, onAdd, onDel, label }) => (
    <div style={styles.card}>
      <div style={styles.cardHead}>
        <span style={{ fontWeight: 700, fontSize: 13, color: T.text }}>{label}</span>
        <button style={styles.btn} onClick={onAdd}>＋ Agregar</button>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <THead cols={[{ label: "Concepto / Servicio" }, { label: "Valor / Mes", right: true }, { label: "Proyección / Año", right: true }, { label: "" }]} />
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} style={{ background: i % 2 === 1 ? T.row2 : T.card }}>
              <td style={styles.cell}><Input value={r.nombre} onChange={v => onNombre(r.id, v)} /></td>
              <td style={styles.cell}><Input type="number" value={r.valor} onChange={v => onValor(r.id, v)} style={styles.inpNum} /></td>
              <td style={styles.cellCalc}>{cop((r.valor || 0) * 12)}</td>
              <td style={styles.cell}><button style={styles.btnDel} onClick={() => onDel(r.id)}>×</button></td>
            </tr>
          ))}
          <AddRow onClick={onAdd} cols={4} />
          <TotalRow label="SUBTOTAL" value={rows.reduce((s, x) => s + (x.valor || 0), 0)} cols={1} />
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div style={styles.modTitle}>🏢 Costos y Gastos Fijos</div>
      <div style={styles.modSub}>Costos operativos de sostenimiento e inversiones fijas mensuales</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20, marginBottom: 16 }}>
        <CostTable rows={gastosFijos} onNombre={updNombreGF} onValor={updGF} onAdd={addGF} onDel={delGF} label="Gastos Fijos Operacionales (Arriendo, Servicios)" />
        <CostTable rows={gastosVentas} onNombre={updNombreGV} onValor={updGV} onAdd={addGV} onDel={delGV} label="Gastos de Ventas & Marketing" />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[["Gastos Fijos", totalGF], ["Gastos Mercadeo", totalGV], ["Costo Nómina", totalPersonal], ["TOTAL COSTO FIJO MENSUAL", totalConPersonal]].map(([lbl, val], i) => (
          <div key={i} style={s(styles.statCard, i === 3 ? { background: T.accent, borderColor: T.accent } : {})}>
            <div style={s(styles.statVal, i === 3 ? { color: T.sidebar } : {})}>{cop(val)}</div>
            <div style={s(styles.statLbl, i === 3 ? { color: T.sidebar } : {})}>{lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: "12px 16px", background: T.calc, borderRadius: 8, border: `1px solid ${T.accentBorder}`, fontSize: 12, color: T.calcText }}>
        <b>Punto de Sostenimiento:</b> Para cubrir únicamente los gastos fijos del local, nómina y servicios, se requiere un promedio de ventas diario mínimo de <b>{cop(totalConPersonal / 30)}</b> (proyectado a un mes de 30 días calendario) sin contar el costo de insumos.
      </div>
    </div>
  );
}

// ─────────────────────────── MODULE: MATERIALES ───────────────────────────

function MaterialesModule({ data, setData }) {
  const [filterCat, setFilterCat] = useState("TODOS");
  const cats = ["TODOS", ...Array.from(new Set(data.map(m => m.cat)))];
  const filtered = filterCat === "TODOS" ? data : data.filter(m => m.cat === filterCat);

  const upd = (id, k, v) => setData(d => d.map(m => m.id === id ? { ...m, [k]: v } : m));
  const add = () => setData(d => [...d, { id: uid(), cat: "OTROS", nombre: "Nuevo ingrediente base", presentacion: 1000, precioCompra: 0, ajuste: 0.10, proveedor: "" }]);
  const del = (id) => setData(d => d.filter(m => m.id !== id));

  return (
    <div>
      <div style={styles.modTitle}>🥩 Materiales e Insumos de Inventario</div>
      <div style={styles.modSub}>Base de datos general de insumos adquiridos por volumen (brutos) y su costo por unidad de medida</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <button style={styles.btn} onClick={add}>＋ Nuevo Material</button>
        <span style={{ fontSize: 12, color: T.muted, marginLeft: 8, fontWeight: 600 }}>Filtrar Categoría:</span>
        {cats.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            style={{ ...styles.btnSm, background: filterCat === c ? T.sidebar : "#fff", color: filterCat === c ? "#fff" : T.muted, borderColor: filterCat === c ? T.sidebar : T.border }}>
            {c}
          </button>
        ))}
      </div>
      <div style={styles.card}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead cols={[
              { label: "Categoría" }, { label: "Material / Insumo" }, { label: "Presentación (g/ml/u)" }, { label: "Precio Compra", right: true },
              { label: "Ajuste Variación", right: true }, { label: "Precio Ajustado", right: true }, { label: "Costo Bruto (g/ml/u)", right: true }, { label: "Proveedor Principal" }, { label: "" }
            ]} />
            <tbody>
              {filtered.map((m, i) => {
                const { precioFinal, costoXg } = calcMat(m);
                return (
                  <tr key={m.id} style={{ background: i % 2 === 1 ? T.row2 : T.card }}>
                    <td style={styles.cell}>
                      <select value={m.cat} onChange={e => upd(m.id, "cat", e.target.value)} style={{ ...styles.inp, width: 110 }}>
                        {["SALSAS", "SECOS", "ACEITES", "CARNES", "FRUVER", "OTROS"].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={styles.cell}><Input value={m.nombre} onChange={v => upd(m.id, "nombre", v)} style={{ ...styles.inp, minWidth: 200 }} /></td>
                    <td style={styles.cell}><Input type="number" value={m.presentacion} onChange={v => upd(m.id, "presentacion", v)} style={styles.inpNum} /></td>
                    <td style={styles.cell}><Input type="number" value={m.precioCompra} onChange={v => upd(m.id, "precioCompra", v)} style={styles.inpNum} /></td>
                    <td style={styles.cell}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Input type="number" value={Math.round((m.ajuste || 0) * 100)} onChange={v => upd(m.id, "ajuste", (v || 0) / 100)} style={styles.inpPct} />
                        <span style={{ fontSize: 12, color: T.muted }}>%</span>
                      </div>
                    </td>
                    <td style={styles.cellCalc}>{cop(precioFinal)}</td>
                    <td style={{ ...styles.cellCalc, fontWeight: 700, color: T.accent }}>{n2(costoXg)}</td>
                    <td style={styles.cell}><Input value={m.proveedor || ""} onChange={v => upd(m.id, "proveedor", v)} style={{ ...styles.inp, width: 140 }} /></td>
                    <td style={styles.cell}><button style={styles.btnDel} onClick={() => del(m.id)}>×</button></td>
                  </tr>
                );
              })}
              <AddRow onClick={add} label={`＋ Agregar nuevo insumo`} cols={9} />
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ padding: "12px 16px", background: T.calc, borderRadius: 8, border: `1px solid ${T.accentBorder}`, fontSize: 12, color: T.calcText }}>
        💡 <b>Ajuste de Variación:</b> Este porcentaje incrementa el costo base del material antes de calcular el costo por gramo. Sirve para mitigar fluctuaciones de precios del mercado, fletes, mermas de almacenamiento y manipulación en bodega.
      </div>
    </div>
  );
}

// ─────────────────────────── MODULE: RECIPES ───────────────────────────

function RecipeModule({ titulo, subtitulo, recetas, setRecetas, materiales }) {
  const [selIdx, setSelIdx] = useState(0);
  const rec = recetas[selIdx] || recetas[0];

  const updRec = (k, v) => setRecetas(rs => rs.map((r, i) => i === selIdx ? { ...r, [k]: v } : r));
  const addRec = () => {
    setRecetas(rs => [...rs, mkRec("Nueva receta", 4, 0.70, 100, [])]);
    setSelIdx(recetas.length);
  };
  const delRec = (i) => {
    setRecetas(rs => rs.filter((_, idx) => idx !== i));
    setSelIdx(Math.max(0, i - 1));
  };
  const addIng = () => updRec("ingredientes", [...(rec.ingredientes || []), { id: uid(), nombre: "Nuevo Ingrediente", materialId: null, tipo: "g", cantidad: 100, merma: 0.0, costoManual: 0 }]);
  const updIng = (iid, k, v) => updRec("ingredientes", rec.ingredientes.map(x => x.id === iid ? { ...x, [k]: v } : x));
  const delIng = (iid) => updRec("ingredientes", rec.ingredientes.filter(x => x.id !== iid));

  if (!rec) return <div style={{ padding: 24, color: T.muted }}>Sin recetas creadas en esta categoría. <button style={styles.btn} onClick={addRec}>Crear receta</button></div>;

  // Realiza el cálculo gastronómico avanzado considerando la merma por ingrediente
  const calc = calcRecipe(rec, materiales);

  return (
    <div>
      <div style={styles.modTitle}>{titulo}</div>
      <div style={styles.modSub}>{subtitulo}</div>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* Selector lateral de recetas */}
        <div style={{ flexShrink: 0, width: "100%", maxWidth: 220 }}>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ ...styles.cardHead, flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
              <span style={{ fontWeight: 800, fontSize: 12, color: T.muted, letterSpacing: "0.05em" }}>FICHAS DE RECETA ({recetas.length})</span>
              <button style={{ ...styles.btn, width: "100%" }} onClick={addRec}>＋ Nueva Receta</button>
            </div>
            {recetas.map((r, i) => (
              <div key={r.id} onClick={() => setSelIdx(i)}
                style={{
                  padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: `1px solid ${T.borderLight}`,
                  background: i === selIdx ? T.accentLight : "transparent",
                  color: i === selIdx ? T.sidebar : T.text, fontWeight: i === selIdx ? 700 : 400,
                  display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s"
                }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{r.nombre}</span>
                {recetas.length > 1 && <button style={{ ...styles.btnDel, fontSize: 13 }} onClick={e => { e.stopPropagation(); delRec(i); }}>×</button>}
              </div>
            ))}
          </div>
        </div>

        {/* Detalle de Ficha Técnica */}
        <div style={{ flex: 1, minWidth: 320 }}>
          <div style={styles.card}>
            <div style={{ ...styles.cardHead, background: T.sidebar }}>
              <input value={rec.nombre} onChange={e => updRec("nombre", e.target.value)}
                style={{ fontSize: 18, fontWeight: 800, border: "none", background: "transparent", color: "#fff", outline: "none", flex: 1 }} />
              <span style={{ fontSize: 11, background: T.accent, color: T.sidebar, padding: "3px 8px", borderRadius: 4, fontWeight: 800 }}>FICHA TÉCNICA</span>
            </div>
            <div style={{ padding: "14px 18px", display: "flex", gap: 20, flexWrap: "wrap", borderBottom: `1px solid ${T.borderLight}`, background: T.row2 }}>
              {[
                ["Porciones por Batch", "porciones", rec.porciones],
                ["Margen Contribución (%)", "_margen", Math.round((rec.margen || 0) * 100)],
                ["Unidades Vendidas / Mes", "unidadesMes", rec.unidadesMes],
              ].map(([lbl, key, val]) => (
                <div key={key}>
                  <div style={styles.label}>{lbl}</div>
                  <input type="number" value={val}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 0;
                      if (key === "_margen") updRec("margen", v / 100);
                      else updRec(key, v);
                    }}
                    style={{ ...styles.inpNum, width: 110, fontWeight: 600 }} />
                </div>
              ))}
            </div>

            {/* Listado de Ingredientes con Cálculo Dinámico de Merma */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <THead cols={[
                  { label: "Ingrediente (Descripción)" }, { label: "Material de Inventario" }, { label: "Und" }, { label: "Cant. Neta Plato" },
                  { label: "Merma %" }, { label: "Cant. Bruta Compra" }, { label: "Costo Base", right: true }, { label: "Costo Neto (c/Merma)", right: true },
                  { label: "Subtotal Costo", right: true }, { label: "% del costo", right: true }, { label: "" }
                ]} />
                <tbody>
                  {calc.ings.map((ing, i) => {
                    const porcVal = rec.porciones || 1;
                    const costoPct = calc.costoRec > 0 ? ing.ct / calc.costoRec : 0;
                    return (
                      <tr key={ing.id} style={{ background: i % 2 === 1 ? T.row2 : T.card }}>

                        {/* Nombre del Ingrediente */}
                        <td style={styles.cell}>
                          <Input value={ing.nombre} onChange={v => updIng(ing.id, "nombre", v)} style={{ ...styles.inp, minWidth: 120 }} />
                        </td>

                        {/* Vinculación con Material en Bodega */}
                        <td style={styles.cell}>
                          <select value={ing.materialId || ""} onChange={e => updIng(ing.id, "materialId", e.target.value ? parseInt(e.target.value) : null)}
                            style={{ ...styles.inp, width: 170, fontSize: 12 }}>
                            <option value="">Ingresar Costo Manual</option>
                            {materiales.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                          </select>
                        </td>

                        {/* Tipo de Unidad */}
                        <td style={styles.cell}>
                          <select value={ing.tipo} onChange={e => updIng(ing.id, "tipo", e.target.value)} style={{ ...styles.inp, width: 55, padding: "5px" }}>
                            <option value="g">g</option><option value="ml">ml</option><option value="u">u</option>
                          </select>
                        </td>

                        {/* Cantidad Neta requerida para la receta */}
                        <td style={styles.cell}>
                          <Input type="number" value={ing.cantidad} onChange={v => updIng(ing.id, "cantidad", v)} style={styles.inpNum} />
                        </td>

                        {/* Merma porcentual del ingrediente */}
                        <td style={styles.cell}>
                          <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
                            <Input type="number" value={Math.round((ing.merma || 0) * 100)} onChange={v => updIng(ing.id, "merma", (v || 0) / 100)} style={styles.inpPct} />
                            <span style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>%</span>
                          </div>
                        </td>

                        {/* Cantidad Bruta Calculada */}
                        <td style={{ ...styles.cellCalc, background: "#fafcf9", color: "#1b5a22", fontSize: 12 }}>
                          {n2(ing.cantBruta)}{ing.tipo}
                        </td>

                        {/* Costo Bruto de Inventario */}
                        <td style={styles.cellCalc}>
                          {ing.materialId ? n2(ing.cuBruto) : <Input type="number" value={ing.costoManual || 0} onChange={v => updIng(ing.id, "costoManual", v)} style={{ ...styles.inpNum, background: T.calc, width: 70 }} />}
                        </td>

                        {/* Costo Neto Ajustado por Merma */}
                        <td style={{ ...styles.cellCalc, fontWeight: 700, color: ing.merma > 0 ? T.danger : T.text }}>
                          {n2(ing.cuNeto)}
                        </td>

                        {/* Costo Total en la Receta */}
                        <td style={{ ...styles.cellCalc, fontWeight: 700, color: T.sidebar }}>{cop(ing.ct)}</td>

                        {/* Incidencia del ingrediente en el costo de la receta */}
                        <td style={styles.cellCalc}>{pct(costoPct)}</td>

                        {/* Eliminar Fila */}
                        <td style={styles.cell}><button style={styles.btnDel} onClick={() => delIng(ing.id)}>×</button></td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td colSpan={11} style={{ padding: 10, borderBottom: `1px solid ${T.border}` }}>
                      <button style={styles.btnSm} onClick={addIng}>＋ Insertar Ingrediente</button>
                    </td>
                  </tr>
                  <tr style={{ background: T.header }}>
                    <td colSpan={8} style={{ ...styles.cell, fontWeight: 800 }}>COSTO TOTAL BATCH DE PREPARACIÓN ({rec.porciones} porciones)</td>
                    <td style={{ ...styles.cellCalc, fontWeight: 800, color: T.sidebar, fontSize: 14 }}>{cop(calc.costoRec)}</td>
                    <td style={{ ...styles.cellCalc, fontWeight: 800 }}>100%</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumen Financiero y Rentabilidad de la Receta */}
          <div style={{ ...styles.card, padding: 0 }}>
            <div style={styles.cardHead}><span style={{ fontWeight: 800, fontSize: 13, color: T.text }}>Análisis de Rentabilidad y Precios (Efectivo por ración)</span></div>
            <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
              <div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    {[
                      ["Costo Materia Prima (Ración)", cop(calc.cpR), T.sidebar, true],
                      ["Margen de Contribución Real", pct(rec.margen || 0), T.success, true],
                      ["Precio sugerido de Venta (sin Impoconsumo)", cop(calc.pv), T.text, false],
                      ["Impuesto al consumo (8%)", cop(calc.impo), T.muted, false],
                      ["Precio de Venta Sugerido al Público", cop(calc.pp), T.accent, true],
                      ["Margen Bruto de Ganancia / Ración", cop(calc.pv - calc.cpR), T.success, true],
                      ["Peso Neto Real servido por plato", (calc.pnR).toFixed(1) + " g", T.muted, false],
                      ["Peso Bruto Procesado por plato", (calc.pbR).toFixed(1) + " g", T.muted, false],
                    ].map(([lbl, val, col, isBold]) => (
                      <tr key={lbl}>
                        <td style={{ padding: "6px 8px", fontSize: 13, color: T.muted, borderBottom: `1px solid ${T.borderLight}` }}>{lbl}</td>
                        <td style={{ padding: "6px 8px", fontSize: 13, fontWeight: isBold ? 800 : 500, color: col, textAlign: "right", borderBottom: `1px solid ${T.borderLight}`, fontFamily: "monospace" }}>{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", flexDirection: "column", justifyBetween: "space-between", gap: 12 }}>
                <div style={{ ...styles.statCard, width: "100%" }}>
                  <div style={styles.label}>Proyección Financiera Mensual ({rec.unidadesMes} unidades)</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
                    {[
                      ["Ventas Netas / Mes", rec.unidadesMes * calc.pv],
                      ["Costo Insumos / Mes", rec.unidadesMes * calc.cpR],
                      ["Margen Bruto / Mes", rec.unidadesMes * (calc.pv - calc.cpR)],
                      ["Ventas Promedio / Día", (rec.unidadesMes * calc.pv) / 30]
                    ].map(([lbl, val]) => (
                      <div key={lbl} style={{ background: T.card, borderRadius: 6, padding: "8px 10px", border: `1px solid ${T.border}` }}>
                        <div style={{ fontSize: 11, color: T.muted, fontWeight: 600 }}>{lbl}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: T.sidebar, fontFamily: "monospace" }}>{cop(val)}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: "12px 14px", background: T.successBg, borderRadius: 8, border: `1px solid #c2e7cc`, fontSize: 12 }}>
                  <b style={{ color: T.success }}>Análisis de Costo de Ventas (Food Cost %):</b><br />
                  <span style={{ color: T.text, lineHeight: "1.5" }}>
                    Tus ingredientes representan el <b>{pct(1 - (rec.margen || 0))}</b> del precio del plato. El margen libre de contribución es de <b>{pct(rec.margen)}</b>.
                    {(1 - (rec.margen || 0)) > 0.35 ? " ⚠️ ¡Alerta! El costo de materia prima supera el 35%. Evalúa optimizar las mermas o reajustar los precios de venta." : " ✅ Excelente control. El costo se encuentra dentro del rango óptimo gastronómico (25%-35%)."}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── MODULE: RESUMEN ───────────────────────────

const CATS = [
  { key: "ensaladas", label: "Ensaladas" }, { key: "entradas", label: "Entradas" },
  { key: "primeros", label: "Primeros Platos" }, { key: "arrozBase", label: "Bases / Arroces" },
  { key: "salsas", label: "Salsas" }, { key: "postres", label: "Postres" }, { key: "bebidas", label: "Bebidas" },
];

function ResumenModule({ recipes, materiales, totalPersonal, totalCostosFijos }) {
  const rows = useMemo(() => {
    return CATS.flatMap(cat => (recipes[cat.key] || []).map(rec => {
      const c = calcRecipe(rec, materiales);
      const ingMes = rec.unidadesMes * c.pv;
      const compMes = rec.unidadesMes * c.cpR;
      return { cat: cat.label, nombre: rec.nombre, pbR: c.pbR, pnR: c.pnR, cpR: c.cpR, margen: rec.margen, pv: c.pv, impo: c.impo, pp: c.pp, unidades: rec.unidadesMes, ingMes, compMes };
    }));
  }, [recipes, materiales]);

  const totIngresos = rows.reduce((s, r) => s + r.ingMes, 0);
  const totCompras = rows.reduce((s, r) => s + r.compMes, 0);
  const totalFijos = totalPersonal + totalCostosFijos;
  const utilidad = totIngresos - totCompras - totalFijos;

  return (
    <div>
      <div style={styles.modTitle}>📊 Resumen de Resultados Financieros</div>
      <div style={styles.modSub}>Análisis de rentabilidad consolidado por línea de producción culinaria</div>

      {/* Tarjetas de Indicadores Principales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          ["Proyección Ventas Mensuales", totIngresos, T.sidebar],
          ["Costo de Ventas (Insumos)", totCompras, T.danger],
          ["Costos de Operación Fijos", totalFijos, "#8a6d1c"],
          ["Utilidad Operacional Estimada", utilidad, utilidad >= 0 ? T.success : T.danger],
        ].map(([lbl, val, col]) => (
          <div key={lbl} style={{ ...styles.statCard, borderColor: col + "66", background: "#fff" }}>
            <div style={{ ...styles.statVal, color: col }}>{cop(val)}</div>
            <div style={styles.statLbl}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Estado de Pérdidas y Ganancias (P&G) */}
      <div style={{ ...styles.card, padding: 0, marginBottom: 16 }}>
        <div style={styles.cardHead}><span style={{ fontWeight: 800, fontSize: 13, color: T.text }}>Estado de Resultados Proyectado Simplificado</span></div>
        <div style={{ padding: 16 }}>
          {[
            ["(+) Ingresos por Ventas (Sin Impuesto al Consumo)", totIngresos, false, T.sidebar],
            ["(−) Costo de Alimentos & Bebidas (Compras Reales)", -totCompras, false, T.danger],
            ["  = MARGEN BRUTO DEL RESTAURANTE", totIngresos - totCompras, true, T.accent],
            ["(−) Costos Fijos Generales (Nómina, Servicios, Operación)", -totalFijos, false, "#7c5c0a"],
            ["  = UTILIDAD NETA ANTES DE IMPUESTOS", utilidad, true, utilidad >= 0 ? T.success : T.danger],
          ].map(([lbl, val, bold, col]) => (
            <div key={lbl} style={{
              display: "flex", justifyContent: "space-between", padding: "10px 12px", marginBottom: 3,
              background: bold ? (utilidad >= 0 ? T.successBg : T.dangerBg) : T.card, borderRadius: 6,
              border: bold ? `1px solid ${col}44` : `1px solid ${T.borderLight}`
            }}>
              <span style={{ fontSize: 13, color: bold ? col : T.text, fontWeight: bold ? 800 : 500 }}>{lbl}</span>
              <span style={{ fontSize: 13, fontWeight: bold ? 800 : 600, color: col, fontFamily: "monospace" }}>
                {cop(Math.abs(val))} <span style={{ fontSize: 11, color: T.muted, fontWeight: 500 }}>({pct(Math.abs(val) / totIngresos || 0)})</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detalle Detallado de Fórmulas por Ficha Técnica */}
      <div style={styles.card}>
        <div style={styles.cardHead}><span style={{ fontWeight: 800, fontSize: 13, color: T.text }}>Análisis Comparativo por Receta (Con Costo Neto de Merma)</span></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead cols={[
              { label: "Línea culinaria" }, { label: "Nombre de Receta" }, { label: "Peso Bruto Ración", right: true }, { label: "Costo Materia Prima", right: true },
              { label: "Rentabilidad %", right: true }, { label: "P.V. Sugerido Público", right: true }, { label: "Volumen / Mes", right: true },
              { label: "Ventas / Mes", right: true }, { label: "Compras / Mes", right: true }, { label: "Participación", right: true }
            ]} />
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? T.row2 : T.card }}>
                  <td style={{ ...styles.cell, color: T.muted, fontSize: 11, fontWeight: 700 }}>{r.cat}</td>
                  <td style={{ ...styles.cell, fontWeight: 700 }}>{r.nombre}</td>
                  <td style={styles.cellCalc}>{r.pbR.toFixed(1)}g</td>
                  <td style={styles.cellCalc}>{cop(r.cpR)}</td>
                  <td style={{ ...styles.cellCalc, color: r.margen > 0.7 ? T.success : T.accent, fontWeight: 700 }}>{pct(r.margen)}</td>
                  <td style={{ ...styles.cellCalc, fontWeight: 800, color: T.sidebar }}>{cop(r.pp)}</td>
                  <td style={styles.cellCalc}>{r.unidades.toLocaleString("es-CO")}</td>
                  <td style={styles.cellCalc}>{cop(r.ingMes)}</td>
                  <td style={styles.cellCalc}>{cop(r.compMes)}</td>
                  <td style={styles.cellCalc}>{pct(r.ingMes / totIngresos || 0)}</td>
                </tr>
              ))}
              <tr style={{ background: T.header }}>
                <td colSpan={7} style={{ ...styles.cell, fontWeight: 800 }}>COSTOS TOTALES PROYECTADOS DE COMPRA</td>
                <td style={{ ...styles.cellCalc, fontWeight: 800, color: T.success }}>{cop(totIngresos)}</td>
                <td style={{ ...styles.cellCalc, fontWeight: 800, color: T.danger }}>{cop(totCompras)}</td>
                <td style={{ ...styles.cellCalc, fontWeight: 800 }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── MODULE: COMPRAS ───────────────────────────

function ComprasModule({ recipes, materiales }) {
  // El plan de compras se basa en el volumen de compra BRUTA de materia prima
  const compras = useMemo(() => {
    const acc = {};
    CATS.forEach(cat => {
      (recipes[cat.key] || []).forEach(rec => {
        const porc = rec.porciones || 1;
        rec.ingredientes.forEach(ing => {
          const mid = ing.materialId;
          if (!mid) return;

          // La merma influye de forma directa en el inventario. Se debe comprar la CANTIDAD BRUTA para compensar pérdidas.
          const factorRendimiento = 1 - (ing.merma || 0);
          const cantNetaPlato = ing.cantidad || 0;
          const cantBrutaProcesada = factorRendimiento > 0 ? (cantNetaPlato / factorRendimiento) : cantNetaPlato;

          // Cantidad bruta en gramos/ml requerida para abastecer la venta del mes
          const gMesCompraBruta = (cantBrutaProcesada / porc) * (rec.unidadesMes || 0);

          if (!acc[mid]) acc[mid] = { totalG: 0, totalVal: 0 };
          acc[mid].totalG += gMesCompraBruta;

          // El costo por gramo de compra base (sin merma)
          const m = materiales.find(x => x.id === mid);
          const cuBruto = m ? calcMat(m).costoXg : 0;

          acc[mid].totalVal += gMesCompraBruta * cuBruto;
        });
      });
    });
    return acc;
  }, [recipes, materiales]);

  const rows = materiales
    .filter(m => compras[m.id] && compras[m.id].totalG > 0)
    .map(m => {
      const { totalG, totalVal } = compras[m.id];
      return { ...m, totalG, totalKg: totalG / 1000, totalVal };
    })
    .sort((a, b) => b.totalVal - a.totalVal);

  const grandTotal = rows.reduce((s, r) => s + r.totalVal, 0);

  const catMap = {};
  rows.forEach(r => {
    if (!catMap[r.cat]) catMap[r.cat] = 0;
    catMap[r.cat] += r.totalVal;
  });

  return (
    <div>
      <div style={styles.modTitle}>🛒 Plan de Compras de Materias Primas</div>
      <div style={styles.modSub}>Inversión y cantidades brutas requeridas considerando las mermas operacionales de cada receta</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
        {Object.entries(catMap).map(([cat, val]) => (
          <div key={cat} style={styles.statCard}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase" }}>{cat}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.sidebar, fontFamily: "monospace" }}>{cop(val)}</div>
          </div>
        ))}
        <div style={{ ...styles.statCard, background: T.sidebar, borderColor: T.accent }}>
          <div style={{ fontSize: 11, color: T.accent, fontWeight: 700, textTransform: "uppercase" }}>TOTAL COMPRAS / MES</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>{cop(grandTotal)}</div>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHead}><span style={{ fontWeight: 800, fontSize: 13, color: T.text }}>Orden de Compra y Despiece de Bodega (Filtro por costo de mayor a menor)</span></div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <THead cols={[
              { label: "#" }, { label: "Categoría" }, { label: "Insumo a comprar" }, { label: "Precio Base Unitario (g/ml/u)", right: true },
              { label: "Cantidad Bruta Total", right: true }, { label: "Medida Comercial (kg / Litros)", right: true }, { label: "Inversión Estimada", right: true }, { label: "% Presupuesto", right: true }
            ]} />
            <tbody>
              {rows.map((r, i) => {
                const { costoXg } = calcMat(r);
                return (
                  <tr key={r.id} style={{ background: i % 2 === 1 ? T.row2 : T.card }}>
                    <td style={{ ...styles.cell, color: T.muted, fontSize: 12 }}>{i + 1}</td>
                    <td style={{ ...styles.cell, fontSize: 11, color: T.muted, fontWeight: 700 }}>{r.cat}</td>
                    <td style={{ ...styles.cell, fontWeight: 700 }}>{r.nombre}</td>
                    <td style={styles.cellCalc}>{n2(costoXg)}</td>
                    <td style={styles.cellCalc}>{Math.round(r.totalG).toLocaleString("es-CO")}</td>
                    <td style={{ ...styles.cellCalc, fontWeight: 700 }}>
                      {r.presentacion === 1 ? `${r.totalG.toFixed(0)} un` : `${r.totalKg.toFixed(2)} Kg/L`}
                    </td>
                    <td style={{ ...styles.cellCalc, fontWeight: 800, color: T.sidebar }}>{cop(r.totalVal)}</td>
                    <td style={styles.cellCalc}>{pct(r.totalVal / grandTotal)}</td>
                  </tr>
                );
              })}
              <tr style={{ background: T.header }}>
                <td colSpan={6} style={{ ...styles.cell, fontWeight: 800 }}>PRESUPUESTO DE ABASTECIMIENTO TOTAL</td>
                <td style={{ ...styles.cellCalc, fontWeight: 800, color: T.accent, fontSize: 15 }}>{cop(grandTotal)}</td>
                <td style={{ ...styles.cellCalc, fontWeight: 800 }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ padding: "12px 16px", background: T.calc, borderRadius: 8, border: `1px solid ${T.accentBorder}`, fontSize: 12, color: T.calcText }}>
        💡 <b>Nota de Desabastecimiento por Merma:</b> Los requerimientos en Kg/L ya calculan el volumen extra que el personal debe procesar para compensar la merma natural. Compra este volumen exacto para evitar quiebres de inventario durante el mes.
      </div>
    </div>
  );
}

// ─────────────────────────── MAIN APP ───────────────────────────

const NAV = [
  { id: "personal", label: "Nómina y Personal", icon: "👥" },
  { id: "fijos", label: "Costos Fijos", icon: "🏢" },
  { id: "materiales", label: "Materiales e Inventario", icon: "🥩" },
  { id: "ensaladas", label: "Recetas: Ensaladas", icon: "🥗" },
  { id: "entradas", label: "Recetas: Entradas", icon: "🥟" },
  { id: "primeros", label: "Recetas: Fuertes", icon: "🍜" },
  { id: "arrozBase", label: "Bases & Arroces", icon: "🍚" },
  { id: "salsas", label: "Recetas: Salsas", icon: "🫙" },
  { id: "postres", label: "Recetas: Postres", icon: "🍮" },
  { id: "bebidas", label: "Recetas: Bebidas", icon: "🥤" },
  { id: "resumen", label: "Resumen Operacional", icon: "📊" },
  { id: "compras", label: "Plan de Compras", icon: "🛒" },
];

export default function App() {
  const [active, setActive] = useState("resumen");
  const [personal, setPersonal] = useState(JSON.parse(JSON.stringify([
    { id: 1, nombre: "Chef Ejecutivo / Director", cantidad: 1, salario: 2800000, auxTransporte: 162000, uniforme: 15000 },
    { id: 2, nombre: "Cocinero Principal", cantidad: 2, salario: 1600000, auxTransporte: 162000, uniforme: 8000 },
    { id: 3, nombre: "Auxiliar de Cocina", cantidad: 2, salario: 1300000, auxTransporte: 162000, uniforme: 8000 },
    { id: 4, nombre: "Servicio / Meseros", cantidad: 2, salario: 1300000, auxTransporte: 162000, uniforme: 8000 },
  ])));

  const [costosFijosData, setCostosFijosData] = useState({
    gastosFijos: [
      { id: 1, nombre: "Canon de Arrendamiento Comercial", valor: 4500000 },
      { id: 2, nombre: "Energía Eléctrica Comercial", valor: 1400000 },
      { id: 3, nombre: "Gas Natural Industrial", valor: 1100000 },
      { id: 4, nombre: "Agua y Alcantarillado", valor: 850000 },
      { id: 5, nombre: "Internet de Alta Velocidad y Software POS", valor: 350000 },
      { id: 6, nombre: "Soporte Contable y Revisoría", valor: 600000 },
    ],
    gastosVentas: [
      { id: 1, nombre: "Inversión en Pauta Digital (Meta/Instagram Ads)", valor: 1500000 },
      { id: 2, nombre: "Comisiones y Logística Canales de Domicilios", valor: 1800000 },
      { id: 3, nombre: "Estrategias de Fidelización e Influenciadores", valor: 600000 },
      { id: 4, nombre: "Material de empaque y delivery", valor: 800000 },
    ],
  });

  const [materiales, setMateriales] = useState(MATS_INIT);
  const [recipes, setRecipes] = useState(RECIPES_INIT);

  const updRecipes = (key) => (fn) => setRecipes(r => ({ ...r, [key]: typeof fn === "function" ? fn(r[key]) : fn }));

  const totalPersonal = useMemo(() => personal.reduce((s, p) => s + calcStaff(p).totalPagar, 0), [personal]);
  const totalCostosFijos = useMemo(() => {
    const { gastosFijos, gastosVentas } = costosFijosData;
    return gastosFijos.reduce((s, x) => s + (x.valor || 0), 0) + gastosVentas.reduce((s, x) => s + (x.valor || 0), 0);
  }, [costosFijosData]);

  const render = () => {
    if (active === "personal") return <PersonalModule data={personal} setData={setPersonal} />;
    if (active === "fijos") return <CostosFijosModule data={costosFijosData} setData={setCostosFijosData} totalPersonal={totalPersonal} />;
    if (active === "materiales") return <MaterialesModule data={materiales} setData={setMateriales} />;
    if (active === "ensaladas") return <RecipeModule titulo="🥗 Ensaladas y Entradas Frías" subtitulo="Fichas técnicas de ensaladas con cálculo de merma vegetal" recetas={recipes.ensaladas} setRecetas={updRecipes("ensaladas")} materiales={materiales} />;
    if (active === "entradas") return <RecipeModule titulo="🥟 Entradas y Acompañantes" subtitulo="Costeo exacto de bocados y entradas calientes" recetas={recipes.entradas} setRecetas={updRecipes("entradas")} materiales={materiales} />;
    if (active === "primeros") return <RecipeModule titulo="🍜 Platos Fuertes Especiales" subtitulo="Fichas de platos principales y costeo de proteínas críticas" recetas={recipes.primeros} setRecetas={updRecipes("primeros")} materiales={materiales} />;
    if (active === "arrozBase") return <RecipeModule titulo="🍚 Preparaciones Base y Arroces" subtitulo="Procesos base: mermas de hidratación y cocción" recetas={recipes.arrozBase} setRecetas={updRecipes("arrozBase")} materiales={materiales} />;
    if (active === "salsas") return <RecipeModule titulo="🫙 Salsas, Aderezos y Coulis" subtitulo="Fórmulas técnicas de salsas de autor" recetas={recipes.salsas} setRecetas={updRecipes("salsas")} materiales={materiales} />;
    if (active === "postres") return <RecipeModule titulo="🍮 Postres de Autor" subtitulo="Repostería técnica detallada" recetas={recipes.postres} setRecetas={updRecipes("postres")} materiales={materiales} />;
    if (active === "bebidas") return <RecipeModule titulo="🥤 Coctelería y Bebidas" subtitulo="Mermas de exprimidos, macerados y jugos de fruta" recetas={recipes.bebidas} setRecetas={updRecipes("bebidas")} materiales={materiales} />;
    if (active === "resumen") return <ResumenModule recipes={recipes} materiales={materiales} totalPersonal={totalPersonal} totalCostosFijos={totalCostosFijos} />;
    if (active === "compras") return <ComprasModule recipes={recipes} materiales={materiales} />;
    return null;
  };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Segoe UI', system-ui, sans-serif", background: T.bg, overflow: "hidden" }}>

      {/* Sidebar Lateral Gastronómica */}
      <div style={{ width: 230, flexShrink: 0, background: T.sidebar, display: "flex", flexDirection: "column", overflow: "hidden", borderRight: `1px solid ${T.accent}33` }}>
        <div style={{ padding: "20px 18px", borderBottom: "1px solid #1a3c1f", background: "#0a1d0d" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>🍽</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: T.accent, letterSpacing: "-0.01em" }}>CostoChef Pro</div>
              <div style={{ fontSize: 10, color: "#8cb592", fontWeight: 600 }}>Cálculo de Merma Gastronómica</div>
            </div>
          </div>
        </div>

        {/* Navegación Sidebar */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
          {NAV.map(n => (
            <div key={n.id} onClick={() => setActive(n.id)}
              style={{
                padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                background: active === n.id ? `linear-gradient(90deg, ${T.accent}22, ${T.accent}11)` : "transparent",
                color: active === n.id ? T.accent : "#8cb592",
                fontSize: 12, fontWeight: active === n.id ? 800 : 500,
                borderLeft: active === n.id ? `4px solid ${T.accent}` : "4px solid transparent",
                transition: "all 0.15s"
              }}>
              <span style={{ fontSize: 16 }}>{n.icon}</span>
              <span>{n.label}</span>
            </div>
          ))}
        </div>

        {/* Carga Fija Resumida Inferior */}
        <div style={{ padding: "14px 18px", borderTop: "1px solid #1a3c1f", background: "#0a1d0d", fontSize: 11 }}>
          <div style={{ color: "#8cb592", marginBottom: 4 }}>Nómina Prestacional:</div>
          <div style={{ color: T.accent, fontWeight: 800, fontSize: 13, fontFamily: "monospace" }}>{cop(totalPersonal)}</div>
          <div style={{ color: "#8cb592", marginTop: 8, marginBottom: 4 }}>Gastos y Servicios Fijos:</div>
          <div style={{ color: T.accent, fontWeight: 800, fontSize: 13, fontFamily: "monospace" }}>{cop(totalCostosFijos)}</div>
        </div>
      </div>

      {/* Área Principal de Contenido */}
      <div style={{ flex: 1, overflowY: "auto", background: T.bg }}>
        <div style={{ maxWidth: 1200, padding: "24px 32px", margin: "0 auto" }}>
          {render()}
        </div>
      </div>
    </div>
  );
}