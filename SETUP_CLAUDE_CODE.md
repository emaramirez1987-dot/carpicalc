# Claude Code — Setup para CarpiCalc

## Qué es Claude Code

Es Claude corriendo en tu terminal, con acceso directo a tus archivos y git.
Sin zips. Sin copiar y pegar. Sin ciclos de push → error → corregir.

---

## Requisitos

- **Suscripción Claude Pro** ($20/mes) — ya la tenés si usás claude.ai
- **Node.js 18+** — verificar con `node --version` en terminal
- **Git** — para hacer commits directamente desde Claude Code

---

## Instalación

### Mac / Linux
```bash
# Instalar Claude Code
npm install -g @anthropic-ai/claude-code

# Verificar
claude --version
```

### Windows
```powershell
# En PowerShell
irm https://claude.ai/install.ps1 | iex
```

Si Node.js no está instalado, descargarlo primero desde nodejs.org (versión LTS).

---

## Primera sesión con CarpiCalc

```bash
# 1. Clonar el repo (si no lo tenés local)
git clone https://github.com/emaramirez1987-dot/carpicalc.git
cd carpicalc

# 2. Arrancar Claude Code dentro del proyecto
claude
```

Claude Code va a leer automáticamente el `CLAUDE.md` de la raíz.
Ya sabe la arquitectura, las reglas y el roadmap. No necesitás explicar nada.

---

## Primer prompt de arranque

Cuando Claude Code abre, pegá esto:

```
Leé el CLAUDE.md del proyecto. Luego hacé un análisis del estado actual
del codebase y decime en qué punto estamos del plan de refactorización.
No toques código todavía — solo quiero el diagnóstico.
```

Desde ahí trabajás en lenguaje natural, igual que acá pero sin el ciclo manual.

---

## Diferencia con el flujo actual

| Hoy (claude.ai) | Claude Code |
|---|---|
| Recibís un zip, lo descomprimís, hacés push | Claude edita directamente los archivos |
| El build falla en Vercel y venís acá a corregir | Claude corre el linter antes de cada entrega |
| Tenés que re-explicar la arquitectura cada sesión | Lee CLAUDE.md automáticamente |
| Los commits los hacés vos manualmente | Claude puede hacer commit con mensaje semántico |

---

## Comandos útiles dentro de Claude Code

```
/status          → ver qué archivos modificó en esta sesión
/diff            → ver los cambios antes de commitear
/undo            → deshacer el último cambio
/cost            → ver cuántos tokens usaste
Ctrl+C           → interrumpir si se va por las ramas
```

---

## Cómo pedirle cosas (buenas prácticas)

**Ser específico con el scope:**
```
# Bien
"Implementá withSave con cola FIFO en App.js,
sin tocar ningún otro archivo"

# Evitar
"Mejorá el sistema de guardado"
```

**Pedir análisis antes de cambios grandes:**
```
"Antes de tocar código, explicame cómo está
implementado X y qué archivos afecta"
```

**Usar el checklist del CLAUDE.md:**
```
"Antes de entregar, corré el checklist del CLAUDE.md
y corregí cualquier problema que encuentres"
```

---

## Suscripción recomendada

Con Pro ($20/mes) tenés acceso a Claude Code incluido.
Si empezás a trabajar sesiones largas de refactor, el límite de uso de Pro
puede quedarse corto — en ese caso Max ($100/mes) elimina prácticamente
todos los límites.

Empezá con Pro. Si sentís que se corta seguido, migrás a Max.

---

## Documentación oficial

https://docs.claude.com/en/docs/claude-code/overview
