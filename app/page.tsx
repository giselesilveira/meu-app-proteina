"use client";

import { useState } from "react";

const alimentos = { /* Dados dos alimentos */ };

export default function Home() {
  const [peso, setPeso] = useState("");
  const [fatorProteina, setFatorProteina] = useState(1.5);
  const [proteinaDiaria, setProteinaDiaria] = useState<number | null>(null);
  const [consumo, setConsumo] = useState<Record<string, { unidade: number; gramas: number }>>({});

  const calcularProteina = () => {
    if (!peso) return;
    setProteinaDiaria(parseFloat((parseFloat(peso) * fatorProteina).toFixed(1)));
  };

  const handleChange = (alimento: string, tipo: string, quantidade: string) => {
    setConsumo((prev) => ({
      ...prev,
      [alimento]: { ...prev[alimento], [tipo]: parseFloat(quantidade) || 0 },
    }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-r from-purple-500 to-blue-500 p-4 font-sans text-gray-900">
      <h1 className="text-4xl font-bold mb-2">Nutri Gisele Silveira</h1>
      <p className="text-sm italic text-red-600 mb-4">Este aplicativo é exclusivo para alunas da Nutri Gisele Silveira. O compartilhamento não autorizado pode resultar em penalidades conforme os termos de uso.</p>

      <label>Informe seu peso (kg):</label>
      <input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} />

      <label>Selecione o consumo diário de proteína (g/kg):</label>
      <select onChange={(e) => setFatorProteina(parseFloat(e.target.value))}>
        <option value={1.5}>1,5 g/kg</option>
        <option value={1.8}>1,8 g/kg</option>
        <option value={2.0}>2,0 g/kg</option>
      </select>

      <button onClick={calcularProteina}>Calcular</button>

      {proteinaDiaria && <p>Proteína Diária: {proteinaDiaria}g</p>}
      {/* Restante do código, com ajustes visuais e estilização elegante */}
    </div>
  );
}
