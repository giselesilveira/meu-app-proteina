'use client';
import { useState } from 'react';

export default function Home() {
  const [peso, setPeso] = useState('');
  const [fator, setFator] = useState(1.8);
  const [resultado, setResultado] = useState('');

  const calcularProteina = () => {
    const pesoNumber = parseFloat(peso.replace(',', '.'));
    if (isNaN(pesoNumber)) {
      setResultado('Por favor, insira um peso válido.');
      return;
    }

    const gramas = pesoNumber * fator;
    setResultado(`Você precisa de aproximadamente ${gramas.toFixed(0)}g de proteína por dia.`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-white to-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-center text-2xl font-bold text-gray-800">
          Calculadora de Proteína | Nutri Gisele Silveira
        </h1>
        <p className="mb-6 text-center text-gray-600">
          Use a calculadora para descobrir sua meta ideal diária. O valor sugerido é uma média entre 1,5g e 2,0g por kg de peso corporal.
        </p>

        <div className="mb-4">
          <label htmlFor="peso" className="mb-2 block text-sm font-medium text-gray-700">
            Seu peso (kg):
          </label>
          <input
            type="number"
            inputMode="decimal"
            id="peso"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            className="w-full rounded-md border border-gray-300 p-2 text-center text-lg focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            placeholder="Ex: 70"
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Quantidade de proteína por kg:
          </label>
          <div className="flex justify-between">
            {[1.5, 1.8, 2.0].map((valor) => (
              <button
                key={valor}
                onClick={() => setFator(valor)}
                className={`flex-1 mx-1 rounded-md border p-2 text-sm font-medium ${
                  fator === valor
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {valor}g/kg
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={calcularProteina}
          className="w-full rounded-md bg-purple-600 p-3 text-white transition hover:bg-purple-700"
        >
          Calcular
        </button>

        {resultado && (
          <p className="mt-6 text-center text-lg font-semibold text-gray-800">{resultado}</p>
        )}
      </div>
    </main>
  );
}
