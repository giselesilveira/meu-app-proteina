"use client";

import React, { useState } from "react";

export default function Home() {
  const [peso, setPeso] = useState("");
  const [fatorProteina, setFatorProteina] = useState(1.5);
  const [proteinaDiaria, setProteinaDiaria] = useState<number | null>(null);
  const [mostrarConsumo, setMostrarConsumo] = useState(false);
  const [consumo, setConsumo] = useState<{ [key: string]: number }>({});

  const alimentos = [
    { nome: "Atum Enlatado", proteinaPor100g: 23 },
    { nome: "Bife de Alcatra", proteinaPor100g: 26 },
    { nome: "Camarão", proteinaPor100g: 20 },
    { nome: "Carne Moída (Patinho)", proteinaPor100g: 24 },
    { nome: "Filé de Tilápia", proteinaPor100g: 21 },
    { nome: "Iogurte Grego", proteinaPor100g: 10 },
    { nome: "Lombo de Porco", proteinaPor100g: 27 },
    { nome: "Ovos Cozidos", proteinaPorUnidade: 6, proteinaPor100g: 13 },
    { nome: "Peito de Frango", proteinaPor100g: 31 },
    { nome: "Queijo Minas", proteinaPorUnidade: 7, proteinaPor100g: 18 },
    { nome: "Salmão Assado", proteinaPor100g: 22 },
    { nome: "Sardinha Lata", proteinaPor100g: 24 },
    { nome: "Tofu", proteinaPor100g: 8 },
    { nome: "Whey Protein", proteinaPorUnidade: 20, proteinaPor100g: 80 },
    { nome: "Ovos de Codorna", proteinaPorUnidade: 1.3, proteinaPor100g: 13 },
    { nome: "Iogurte do Tambo", proteinaPorUnidade: 9.6, proteinaPor100g: 4.8 },
    { nome: "Proteína do Colágeno", proteinaPorUnidade: 20, proteinaPor100g: 90 },
    { nome: "Sobrecoxa de Frango", proteinaPor100g: 25 },
    { nome: "Coxa de Frango", proteinaPor100g: 27 },
    { nome: "Carne Moída", proteinaPor100g: 26 },
    { nome: "Peixe Cru (Sushi)", proteinaPor100g: 20 },
    { nome: "Carne de Porco", proteinaPor100g: 27 },
    { nome: "Coração de Frango", proteinaPor100g: 28 },
    { nome: "Fígado (Bovino)", proteinaPor100g: 27 }
  ];

  const calcularProteina = () => {
    if (!peso) return;
    setProteinaDiaria(parseFloat((parseFloat(peso) * fatorProteina).toFixed(1)));
    setMostrarConsumo(true);
  };

  const handleChange = (alimento: string, valor: number, unidade: boolean) => {
    setConsumo((prev) => ({
      ...prev,
      [`${alimento}${unidade ? "Unidade" : "Gramas"}`]: valor || 0
    }));
  };

  const totalConsumido = alimentos.reduce((acc, { nome, proteinaPor100g, proteinaPorUnidade }) => {
    const gramas = consumo[`${nome}Gramas`] || 0;
    const unidades = consumo[`${nome}Unidade`] || 0;
    const proteina =
      (gramas / 100) * (proteinaPor100g || 0) + unidades * (proteinaPorUnidade || 0);
    return acc + proteina;
  }, 0);

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-white to-gray-300 p-4 font-sans text-gray-900">
      <h1 className="text-4xl font-bold mb-2">Calculadora de Proteína | Nutri Gisele Silveira</h1>
      <p className="text-sm italic text-black mb-4">
        Este aplicativo é exclusivo para alunas da Nutri Gisele Silveira. O compartilhamento não autorizado é proibido e pode resultar em penalidades conforme os termos de uso.
      </p>

      {!mostrarConsumo ? (
        <>
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
        </>
      ) : (
        <div className="mt-6 w-full">
          <p className="text-xl text-gray-700">
            🎯 Você precisa de <span className="font-bold text-purple-800 text-3xl">{proteinaDiaria}g</span> de proteína por dia.
          </p>
          <h2 className="text-2xl font-bold mt-6 flex items-center">
            📊 Registre seu consumo diário: <span className="text-green-600 ml-2 text-3xl">{totalConsumido.toFixed(1)}g</span>
          </h2>
          <p className="text-gray-600 mb-4">Insira a quantidade de proteína consumida em cada alimento.</p>

          <div className="mt-4 space-y-4">
            {alimentos.map(({ nome }) => (
              <div key={nome} className="border rounded-lg p-4 bg-gray-50 shadow-sm">
                <p className="font-semibold mb-2 text-center">{nome}</p>
                <label className="block text-gray-700 text-sm mb-1">Gramas:</label>
                <input
                  type="number"
                  min="0"
                  onChange={(e) => handleChange(nome, parseFloat(e.target.value) || 0, false)}
                  className="w-full p-2 border rounded-lg text-gray-900 font-semibold bg-gray-100 focus:ring-2 focus:ring-purple-600"
                />
                {(nome === "Ovos Cozidos" || nome === "Queijo Minas" || nome === "Whey Protein" || nome === "Ovos de Codorna" || nome === "Iogurte do Tambo" || nome === "Proteína do Colágeno") && (
                  <>
                    <label className="block text-gray-700 text-sm mb-1 mt-2">
                      {nome === "Whey Protein" || nome === "Proteína do Colágeno" ? "Scoop:" : nome === "Iogurte do Tambo" ? "Pote (200g):" : "Unidade:"}
                    </label>
                    <input
                      type="number"
                      min="0"
                      onChange={(e) => handleChange(nome, parseFloat(e.target.value) || 0, true)}
                      className="w-full p-2 border rounded-lg text-gray-900 font-semibold bg-gray-100 focus:ring-2 focus:ring-purple-600"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
