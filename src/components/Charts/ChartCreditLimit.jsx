import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchCards, fetchCardsShopping } from '../../api/cards';
import './ChartCreditLimit.css'; // Importando o CSS separado

const ChartCreditLimit = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      // 1. Pega os Cartões
      const cardsData = await fetchCards();
      const cardsMap = {};

      cardsData.forEach(card => {
        cardsMap[card.id] = {
          name: card.name,
          limit: Number(card.limit || 0),
          used: 0
        };
      });

      // 2. Pega as Compras no Crédito
      const shoppingData = await fetchCardsShopping();
      shoppingData.forEach(purchase => {
        // Só soma se o status for 'aberto' (ou se não tiver status ainda)
        const isOpen = !purchase.status || purchase.status === 'aberto';

        if (cardsMap[purchase.cardId] && isOpen) {
          cardsMap[purchase.cardId].used += Number(purchase.totalValue);
        }
      });

      // 3. Monta o array final
      const chartData = Object.values(cardsMap).map(c => ({
        name: c.name,
        Usado: c.used,
        Disponível: c.limit - c.used < 0 ? 0 : c.limit - c.used,
        limitTotal: c.limit
      }));

      setData(chartData);
    };

    fetchData();
  }, []);

  return (
    <div className="chart-container">
      <h3 className="chart-title">Uso do Limite de Crédito</h3>

      <div className="chart-content">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '0.8rem', fontWeight: 500 }} />
            <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
            <Legend />
            {/* Empilhamos as barras: Usado + Disponível = Limite Total */}
            <Bar dataKey="Usado" stackId="a" fill="#ff4242ff" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Disponível" stackId="a" fill="#00C49F" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ChartCreditLimit;