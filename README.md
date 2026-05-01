# CarpiCalc 🪚

Sistema de presupuestos para carpintería. Calculá materiales, herrajes, tapacanto y mano de obra por módulo.

## Funcionalidades

- Presupuesto por módulos con dimensiones personalizables
- Catálogo de módulos editables
- Hoja de costos de materiales y herrajes
- Lista de corte optimizada
- Vista previa del presupuesto
- Tema oscuro / cálido
- Datos guardados localmente en el navegador

---

## Cómo correr en local

```bash
npm install
npm start
```

La app se abre en [http://localhost:3000](http://localhost:3000)

## Cómo hacer el build

```bash
npm run build
```

Genera la carpeta `/build` lista para deploy.

---

## Deploy en Netlify

### Opción A – Conectar con GitHub (recomendado)

1. Subí este proyecto a un repositorio de GitHub
2. En [netlify.com](https://netlify.com) → **Add new site** → **Import an existing project**
3. Conectá tu cuenta de GitHub y seleccioná el repositorio
4. Netlify detecta automáticamente la configuración (via `netlify.toml`):
   - **Build command:** `npm run build`
   - **Publish directory:** `build`
5. Hacé click en **Deploy site**

Cada vez que hagas `git push` a `main`, Netlify redespliega automáticamente. ✅

### Opción B – Deploy manual (drag & drop)

1. Corrés `npm run build` localmente
2. En Netlify → **Add new site** → **Deploy manually**
3. Arrastrás la carpeta `/build` y listo

---

## Estructura del proyecto

```
carpicalc/
├── public/
│   └── index.html
├── src/
│   ├── App.js        ← toda la lógica y UI
│   └── index.js      ← punto de entrada React
├── .gitignore
├── netlify.toml      ← config de deploy
├── package.json
└── README.md
```
