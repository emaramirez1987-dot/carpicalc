import { useState } from "react";

const M = "'DM Mono',monospace";

const SECCIONES = [
  {
    titulo: "Variables",
    items: [
      { nombre: "ancho / alto / profundidad", desc: "Dimensiones del módulo (mm)" },
      { nombre: "esp",                         desc: "Espesor del material de la pieza" },
      { nombre: "i",                            desc: "Índice actual dentro de un repeat" },
      { nombre: "<parámetro.id>",              desc: "Valor del parámetro definido" },
      { nombre: "<variable custom>",           desc: "Definida en el panel Variables" },
    ],
  },
  {
    titulo: "Operadores",
    items: [
      { nombre: "+ - * / ( )",                  desc: "Aritmética" },
      { nombre: "> < >= <= == !=",              desc: "Comparación → true / false" },
      { nombre: "&& ||",                        desc: "Y lógico / O lógico" },
      { nombre: "cond ? a : b",                 desc: "Ternario (reemplaza el if/else)" },
    ],
  },
  {
    titulo: "Funciones",
    items: [
      { nombre: "min(a, b)",                    desc: "El menor de los dos" },
      { nombre: "max(a, b)",                    desc: "El mayor de los dos" },
      { nombre: "round(x)",                     desc: "Redondea al entero más cercano" },
      { nombre: "ceil(x)",                      desc: "Redondea hacia arriba" },
      { nombre: "floor(x)",                     desc: "Redondea hacia abajo" },
      { nombre: "abs(x)",                       desc: "Valor absoluto" },
      { nombre: "clamp(x, min, max)",           desc: "Limita x entre min y max" },
      { nombre: "mod(x, n)",                    desc: "Resto siempre positivo (par/impar en repeat)" },
    ],
  },
];

export default function GuiaFormulasBtn() {
  const [abierto, setAbierto] = useState(false);

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        onMouseDown={e => { e.preventDefault(); setAbierto(v => !v); }}
        title="Guía de fórmulas"
        style={{
          height: 28, padding: "0 8px", borderRadius: 5, cursor: "pointer",
          fontFamily: M, fontSize: 10, fontWeight: 600,
          background: abierto ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${abierto ? "rgba(212,175,55,0.40)" : "var(--border)"}`,
          color: abierto ? "var(--accent)" : "var(--text-muted)",
          display: "flex", alignItems: "center",
          transition: "all 0.12s",
        }}>
        📖
      </button>

      {abierto && (
        <>
          {/* overlay para cerrar al hacer click fuera */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 199 }}
            onMouseDown={() => setAbierto(false)}
          />
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 200,
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "12px 14px", minWidth: 320, maxWidth: 380,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ fontFamily: M, fontSize: 10, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.08em" }}>
              GUÍA DE FÓRMULAS
            </div>

            {SECCIONES.map(sec => (
              <div key={sec.titulo}>
                <div style={{
                  fontSize: 9, fontFamily: M, fontWeight: 700,
                  color: "var(--text-muted)", textTransform: "uppercase",
                  letterSpacing: "0.08em", marginBottom: 6,
                }}>
                  {sec.titulo}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {sec.items.map(item => (
                    <div key={item.nombre} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                      <code style={{
                        fontFamily: M, fontSize: 10, color: "var(--accent)",
                        background: "rgba(212,175,55,0.08)", borderRadius: 3,
                        padding: "1px 5px", flexShrink: 0, whiteSpace: "nowrap",
                      }}>
                        {item.nombre}
                      </code>
                      <span style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                        {item.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
