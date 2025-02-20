"use client";

import React, { useState } from "react";

export default function Home() {
  const [peso, setPeso] = useState("");
  const [fatorProteina, setFatorProteina] = useState(1.5);
  const [proteinaDiaria, setProteinaDiaria] = useState<number | null>(null);

  const calcularProteina = () => {
    if (!peso) return;
    setProteinaDiaria(parseFloat((parseFloat(peso) * fatorProteina).toFixed(1)));
  };

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-r from-purple-500 to-blue-500 p-4 font-sans text-gray-900">
      <h1 className="text-4xl font-bold mb-2">Nutri Gisele Silveira</h1>
      <p className="text-sm italic text-red-600 mb-4">
        Este aplicativo é exclusivo para alunas da Nutri Gisele Silveira. O compartilhamento não autorizado é proibido e pode resultar em penalidades conforme os termos de uso.
      </p>

      <label>Informe seu peso (kg):</label>
      <input
        type="number"
        value={peso}
        onChange={(e) => setPeso(e.target.value)}
        className="w-full p-3 border rounded-lg mt-2 text-gray-900 font-semibold bg-gray-100 focus:ring-4 focus:ring-purple-600"
      />

      <label>Selecione o consumo diário de proteína (g/kg):</label>
      <select
        onChange={(e) => setFatorProteina(parseFloat(e.target.value))}
        className="w-full p-3 border rounded-lg mt-2 text-gray-900 font-semibold bg-gray-100 focus:ring-4 focus:ring-purple-600"
      >
        <option value={1.5}>1,5 g/kg</option>
        <option value={1.8}>1,8 g/kg</option>
        <option value={2.0}>2,0 g/kg</option>
      </select>

      <button
        onClick={calcularProteina}
        className="w-full bg-purple-700 text-white p-3 rounded-lg mt-4 hover:bg-purple-800 transition font-semibold shadow-md"
      >
        Calcular
      </button>

      {proteinaDiaria && (
        <p className="text-xl text-gray-700 mt-6">
          🎯 Você precisa de <span className="font-bold text-purple-800 text-3xl">{proteinaDiaria}g</span> de proteína por dia.
        </p>
      )}
    </div>
  );
}
