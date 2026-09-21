# 🍽️ CostoChef Pro

**CostoChef Pro** es una aplicación web interactiva desarrollada en **React + Vite** para la gestión financiera, costeo de recetas y control gastronómico integral para restaurantes en Colombia.

La herramienta permite calcular costos mermados de insumos, estimar la nómina con prestaciones sociales de ley, proyectar gastos fijos y generar reportes financieros consolidados de pérdidas y ganancias (P&G) y planes de compras mensuales.

---

## 🚀 Características Principales

CostoChef Pro cuenta con 12 módulos y secciones dinámicas de trabajo:

1. **👥 Nómina y Personal:**
   - Cálculo automático de salarios, auxilio de transporte y aportes patronales según la legislación colombiana vigente.
   - Provisión de Salud (8.5%), Pensión (12%), ARL clase III (4.35%), Parafiscales (4%) y Prestaciones Sociales consolidadas (22%).
   - Cálculo del costo por colaborador y presupuesto total de nómina diaria y mensual.

2. **🏢 Costos y Gastos Fijos:**
   - Administración de gastos fijos operacionales (arriendo, servicios públicos, seguros).
   - Administración de gastos de ventas y marketing (pauta digital, comisiones de plataformas, empaques).
   - Cálculo automático del punto de sostenimiento o venta mínima diaria requerida.

3. **🥩 Materiales e Insumos de Inventario:**
   - Registro de materias primas compradas por volumen con presentación, precio de compra y proveedor.
   - Ajuste por margen de variación o fluctuación de mercado (fletes, mermas de almacenamiento).
   - Cálculo dinámico del costo bruto unitario por gramo, mililitro o unidad ($/g, $/ml, $/u).

4. **🥗 Fichas Técnicas y Recetas por Categória:**
   - Módulos para **Ensaladas**, **Entradas**, **Platos Fuertes**, **Bases & Arroces**, **Salsas**, **Postres** y **Bebidas**.
   - **Cálculo recalibrado por MERMA (%):** Determina el costo neto real considerando el porcentaje de desperdicio o pérdida por desposte, pelado y cocción (`Costo Neto = Costo Bruto / (1 - % Merma)`).
   - Sugerencia de precio de venta al público en función del **Margen de Contribución** deseado e **Impuesto al Consumo (Impoconsumo 8%)**.
   - Análisis de Food Cost (%) y alertas de rentabilidad.

5. **📊 Resumen Operacional Financiero:**
   - Estado de Resultados Proyectado Simplificado (Ingresos, Costo de Ventas, Margen Bruto, Costos Fijos y Utilidad Operacional).
   - Comparativo detallado entre líneas culinarias con volumen de venta mensual y márgenes de ganancia.

6. **🛒 Plan de Compras de Materias Primas:**
   - Despiece de compras requerido según la proyección mensual de unidades vendidas.
   - Cálculo de la **cantidad bruta requerida** para compensar mermas operacionales de cocina y evitar desabastecimiento.
   - Presupuesto de compras filtrado por categoría de insumo e inversión total.

---

## 🛠️ Tecnologías Utilizadas

- **Frontend:** React 18
- **Bundler / Build Tool:** Vite 5
- **Lenguaje:** JavaScript (ES6+ / JSX)
- **Estilos:** CSS-in-JS con paleta de colores prémium inspirada en alta gastronomía.

---

## 💻 Instalación y Ejecución Local

### Prerrequisitos
- **Node.js:** Versión 18.0.0 o superior.
- **npm:** Versión 9.0.0 o superior.

### Pasos para ejecutar

1. **Clonar o descargar el repositorio:**
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd costosrestaurante
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador:**
   Navega a la dirección indicada por Vite en la consola (habitualmente `http://localhost:5173`).

---

## 📦 Scripts Disponibles

En el proyecto puedes ejecutar los siguientes comandos:

- `npm run dev` - Inicia el servidor de desarrollo local.
- `npm run build` - Compila la aplicación optimizada para producción en la carpeta `dist`.
- `npm run preview` - Sirve localmente el build de producción para pruebas previas al despliegue.

---

## 📂 Estructura del Proyecto

```text
.
├── index.html              # Punto de entrada HTML
├── package.json            # Configuración de dependencias y scripts
├── package-lock.json       # Árbol de dependencias fijas
├── RestauranteCostos.jsx   # Componente principal de React con la lógica y UI de CostoChef Pro
├── vite.config.js          # Configuración del bundler Vite
├── vercel.json             # Configuración de despliegue estático en Vercel
└── README.md               # Documentación del proyecto
```

---

## 🌐 Despliegue en Vercel

El proyecto está configurado para un despliegue estático continuo en **Vercel**:

1. Vincula el repositorio a una cuenta de Vercel.
2. Vercel detectará la configuración automáticamente a través de `vercel.json` y `package.json`:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Cada subida a la rama principal actualizará automáticamente el sitio en producción.
