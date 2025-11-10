'use client';
import React, { useState } from 'react';

export default function Home() {
  const [peso, setPeso] = useState('');
  const [proteina, setProteina] = useState<number | null>(null);

  const handleCalcular = () => {
    const pesoNumber = parseFloat(peso.replace(',', '.'));
    if (!isNaN(pesoNumber)) {
      const resultado = pesoNumber * 1.8;
      setProteina(resultado);
    } else {
      setProteina(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(to bottom, #ffffff, #f3f3f3)',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 0 20px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        fontFamily: 'sans-serif'
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>
          Calculadora de Proteína | Nutri Gisele Silveira
        </h1>
        <p style={{ fontSize: '16px', color: '#555', marginBottom: '32px' }}>
          Use a calculadora para descobrir sua meta ideal diária. O valor sugerido é uma média baseada em 1,8g por kg de peso corporal.
        </p>

        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            textAlign: 'left',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#666'
          }}
        >
          Seu peso (kg):
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={peso}
          onChange={(e) => setPeso(e.target.value)}
          placeholder="Digite seu peso"
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #ccc',
            marginBottom: '24px',
            fontSize: '16px',
          }}
        />

        <button
          onClick={handleCalcular}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#7C3AED',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.3s ease'
          }}
        >
          Calcular
        </button>

        {proteina !== null && (
          <p style={{ marginTop: '24px', fontSize: '18px', fontWeight: 'bold' }}>
            Você precisa de aproximadamente <strong>{proteina.toFixed(0)}g</strong> de proteína por dia.
          </p>
        )}
      </div>
    </div>
  );
}
