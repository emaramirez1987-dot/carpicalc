import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset() {
    this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;

    const msg = this.state.error?.message || String(this.state.error);

    return (
      <div style={{
        minHeight: "100vh",
        background: "#080A0D",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        fontFamily: "'Bricolage Grotesque', sans-serif",
      }}>
        <div style={{
          maxWidth: 480,
          background: "#141720",
          border: "1px solid #2a3050",
          borderRadius: 14,
          padding: "36px 40px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>⚠</div>
          <h2 style={{ color: "#D4AF37", margin: "0 0 10px", fontSize: 20, fontFamily: "'Playfair Display', serif" }}>
            Ocurrió un error inesperado
          </h2>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 24px", lineHeight: 1.6 }}>
            La aplicación encontró un problema. Tus datos guardados no se perdieron.
          </p>
          {msg && (
            <pre style={{
              background: "#0a0c10",
              border: "1px solid #1e2540",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 11,
              color: "#ef4444",
              textAlign: "left",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              marginBottom: 24,
              fontFamily: "'DM Mono', monospace",
            }}>
              {msg}
            </pre>
          )}
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button
              onClick={() => this.handleReset()}
              style={{
                padding: "9px 20px",
                background: "rgba(212,175,55,0.12)",
                border: "1px solid rgba(212,175,55,0.35)",
                borderRadius: 8,
                color: "#D4AF37",
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "9px 20px",
                background: "transparent",
                border: "1px solid #2a3050",
                borderRadius: 8,
                color: "#64748b",
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Recargar página
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
