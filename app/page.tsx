"use client";

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

  type Consumo = Record<string, { unidade?: number; gramas?: number }>;

const handleChange = (alimento: string, tipo: string, quantidade: string) => {
  setConsumo((prev: Consumo) => ({
    ...prev,
    [alimento]: {
      ...prev[alimento],
      [tipo]: parseFloat(quantidade) || 0,
    },
  }));
};


  const totalConsumido = Object.entries(consumo).reduce((total, [alimento, valores]) => {
    const proteinaPor100g = alimentos[alimento].proteinaPor100g;
    const porUnidade = valores.unidade ? valores.unidade * (proteinaPor100g / 100) * 100 : 0;
    const porPeso = valores.gramas ? (valores.gramas * proteinaPor100g) / 100 : 0;
    return total + porPeso + porUnidade;
  }, 0).toFixed(1);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-purple-300 to-blue-300 p-4">
      <div className="w-full max-w-lg bg-white shadow-2xl rounded-2xl p-8">
        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-6">💪 Calculadora de Proteína</h1>
        
        <label className="block text-gray-700 text-sm font-medium">Informe seu peso (kg):</label>
        <input
          type="number"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          placeholder="Ex: 70"
          className="w-full p-3 border rounded-lg mt-2 text-gray-900 font-semibold bg-gray-100 focus:ring-4 focus:ring-purple-600"
        />
        
        <button
          onClick={calcularProteina}
          className="w-full bg-purple-700 text-white p-3 rounded-lg mt-4 hover:bg-purple-800 transition font-semibold shadow-md"
        >
          Calcular
        </button>

        {proteinaDiaria && (
          <div className="text-center mt-6">
            <p className="text-xl text-gray-700">
              🎯 Você precisa de <span className="font-bold text-purple-800 text-3xl">{proteinaDiaria}g</span> de proteína por dia.
            </p>
          </div>
        )}

        {proteinaDiaria && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-gray-900 text-center">📊 Registre seu consumo:</h2>

            <h3 className="text-2xl font-bold text-green-700 text-center mt-5">
              Total Consumido: {totalConsumido}g
            </h3>

            {Object.keys(alimentos).map((alimento) => (
              <div key={alimento} className="bg-gray-50 rounded-lg p-4 mt-4 shadow-md border border-gray-300">
                <h3 className="text-gray-900 font-semibold">{alimento}</h3>
                <div className="flex justify-between items-center mt-2">
                  <label className="text-gray-700 text-sm">{alimentos[alimento].unidade}:</label>
                  <input
                    type="number"
                    onChange={(e) => handleChange(alimento, "unidade", e.target.value)}
                    className="w-20 p-2 border rounded-lg text-center text-gray-900 font-semibold bg-gray-200 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <label className="text-gray-700 text-sm">Gramas (g cozido):</label>
                  <input
                    type="number"
                    onChange={(e) => handleChange(alimento, "gramas", e.target.value)}
                    className="w-20 p-2 border rounded-lg text-center text-gray-900 font-semibold bg-gray-200 focus:ring-2 focus:ring-purple-500"
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
