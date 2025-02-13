"use client";

import React from "react";
import { useState } from "react";

const alimentos = {
  "Peito de Frango": { proteinaPor100g: 31, unidade: "1 porção (100g cozido)" },
  "Salmão Assado": { proteinaPor100g: 25, unidade: "1 porção (100g cozido)" },
  "Atum Enlatado": { proteinaPor100g: 26, unidade: "1 lata (120g)" },
  "Ovos Cozidos": { proteinaPor100g: 13, unidade: "1 ovo (50g)" },
  "Carne Moída (Patinho)": { proteinaPor100g: 26, unidade: "1 porção (100g cozido)" },
  "Sardinha Assada": { proteinaPor100g: 25, unidade: "1 porção (100g cozido)" },
  "Sardinha Lata": { proteinaPor100g: 24, unidade: "1 lata (125g)" },
  "Bife de Alcatra": { proteinaPor100g: 28, unidade: "1 porção (100g cozido)" },
  "Filé de Tilápia": { proteinaPor100g: 26, unidade: "1 porção (100g cozido)" },
  "Camarão": { proteinaPor100g: 20, unidade: "1 porção (100g cozido)" },
  "Queijo Minas": { proteinaPor100g: 22, unidade: "1 fatia (50g)" },
  "Iogurte Grego": { proteinaPor100g: 8, unidade: "1 pote (120g)" },
  "Tofu": { proteinaPor100g: 8, unidade: "1 porção (100g)" },
  "Lombo de Porco": { proteinaPor100g: 29, unidade: "1 porção (100g cozido)" },
  "Whey Protein (1 dose)": { proteinaPor100g: 25, unidade: "1 dose (30g)" },
};

export default function Home() {
  const [peso, setPeso] = useState("");
  const [proteinaDiaria, setProteinaDiaria] = useState<number | null>(null);
  const [consumo, setConsumo] = useState<Record<string, { unidade: number; gramas: number }>>({});

  const calcularProteina = () => {
    if (!peso) return;
    setProteinaDiaria(parseFloat((parseFloat(peso) * 1.5).toFixed(1)));
  };

  const handleChange = (alimento: string, tipo: "unidade" | "gramas", quantidade: string) => {
    setConsumo((prev) => ({
      ...prev,
      [alimento]: {
        ...prev[alimento],
        [tipo]: parseFloat(quantidade) || 0,
      },
    }));
  };

  const totalConsumido = Object.entries(consumo).reduce((total, [alimento, valores]) => {
    const proteinaPor100g = alimentos[alimento]?.proteinaPor100g || 0;
    const porUnidade = valores.unidade ? valores.unidade * (proteinaPor100g / 100) * 100 : 0;
    const porPeso = valores.gramas ? (valores.gramas * proteinaPor100g) / 100 : 0;
    return total + porPeso + porUnidade;
  }, 0).toFixed(1);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gradient-to-r from-indigo-400 to-blue-400 p-6">
      <div className="w-full max-w-lg bg-white shadow-2xl rounded-3xl p-10">
        <h1 className="text-5xl font-black text-center text-gray-900 mb-6">💪 Calculadora de Proteína</h1>

        <label className="block text-gray-800 text-base font-medium">Informe seu peso (kg):</label>
        <input
          type="number"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          placeholder="Ex: 70"
          className="w-full p-4 border rounded-xl mt-2 text-gray-900 font-semibold bg-gray-100 focus:ring-4 focus:ring-indigo-600"
        />

        <button
          onClick={calcularProteina}
          className="w-full bg-indigo-700 text-white p-4 rounded-xl mt-4 hover:bg-indigo-800 transition font-bold shadow-lg"
        >
          Calcular
        </button>

        {proteinaDiaria !== null && (
          <div className="text-center mt-6">
            <p className="text-2xl text-gray-800">
              🎯 Sua meta diária: <span className="font-extrabold text-indigo-800 text-4xl">{proteinaDiaria}g</span>
            </p>
          </div>
        )}

        {proteinaDiaria !== null && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold text-gray-900 text-center">📊 Registre seu consumo:</h2>

            <h3 className="text-3xl font-extrabold text-green-700 text-center mt-5">
              Total Consumido: {totalConsumido}g
            </h3>

            {Object.keys(alimentos).map((alimento) => (
              <div key={alimento} className="bg-gray-50 rounded-xl p-5 mt-4 shadow-md border border-gray-300">
                <h3 className="text-gray-900 font-bold text-lg">{alimento}</h3>
                <div className="flex justify-between items-center mt-3">
                  <label className="text-gray-800 text-sm">{alimentos[alimento].unidade}:</label>
                  <input
                    type="number"
                    min="0"
                    onChange={(e) => handleChange(alimento, "unidade", e.target.value)}
                    className="w-24 p-2 border rounded-lg text-center text-gray-900 font-semibold bg-gray-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex justify-between items-center mt-3">
                  <label className="text-gray-800 text-sm">Gramas (g cozido):</label>
                  <input
                    type="number"
                    min="0"
                    onChange={(e) => handleChange(alimento, "gramas", e.target.value)}
                    className="w-24 p-2 border rounded-lg text-center text-gray-900 font-semibold bg-gray-200 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
