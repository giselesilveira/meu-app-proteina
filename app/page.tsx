"use client"

import { useState } from "react"

export default function Home() {
  const [peso, setPeso] = useState("")
  const [proteina, setProteina] = useState<number | null>(null)

  const handleCalcular = () => {
    const pesoNumerico = parseFloat(peso.replace(",", "."))
    if (!isNaN(pesoNumerico)) {
      const resultado = pesoNumerico * 1.8
      setProteina(resultado)
    } else {
      setProteina(null)
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
        background: "linear-gradient(to bottom, #fff, #f5f5f5)",
        padding: "20px"
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "40px",
          borderRadius: "12px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: "480px"
        }}
      >
        <h1 style={{ marginBottom: "10px", fontSize: "24px", fontWeight: "bold", textAlign: "center" }}>
          Calculadora de Proteína | Nutri Gisele Silveira
        </h1>
        <p style={{ fontSize: "14px", color: "#555", textAlign: "center", marginBottom: "20px" }}>
          Use a calculadora para descobrir sua meta ideal diária. O valor sugerido é uma média baseada em 1,8g por kg de peso corporal.
        </p>

        <label style={{ display: "block", marginBottom: "8px", fontWeight: 500 }}>
          Seu peso (kg):
        </label>
        <input
          type="text"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            marginBottom: "16px",
            fontSize: "16px"
          }}
        />

        <button
          onClick={handleCalcular}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#7c3aed",
            color: "#fff",
            fontSize: "16px",
            cursor: "pointer",
            transition: "background-color 0.3s ease"
          }}
        >
          Calcular
        </button>

        {proteina !== null && (
          <p style={{ marginTop: "20px", fontSize: "18px", textAlign: "center" }}>
            Você precisa de aproximadamente <strong>{proteina.toFixed(1)}g</strong> de proteína por dia.
          </p>
        )}
      </div>
    </div>
  )
}
