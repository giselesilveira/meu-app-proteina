"use client";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#F6F0E6", color: "#14100D", padding: 32, textAlign: "center" }}>
        <h1>Não conseguimos carregar o app agora.</h1>
        <p>Tente novamente em instantes.</p>
        <button onClick={reset} style={{ minHeight: 56, padding: "0 24px", borderRadius: 12, background: "#14100D", color: "#F6F0E6", border: 0 }}>
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
