import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './ChartInvestmentsByMonth.css';

const MONTH_NAMES = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const ChartInvestmentsByMonth = ({ investments }) => {
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  // Agrupa entradas e saídas por mês do ano selecionado
  const monthlyData = MONTH_NAMES.map((monthName, index) => {
    let aportes = 0;
    let resgates = 0;

    investments.forEach(inv => {
      const invDate = inv.date?.toDate ? inv.date.toDate() : new Date(inv.date);
      const invYear = invDate.getFullYear().toString();
      const invMonth = invDate.getMonth();

      if (invYear === filterYear && invMonth === index) {
        if (inv.type === 'entrada') {
          aportes += Number(inv.value);
        } else {
          resgates += Number(inv.value);
        }
      }
    });

    return {
      name: monthName,
      Aportes: aportes,
      Resgates: resgates
    };
  });

  // Gera lista de anos disponíveis
  const availableYears = [...new Set(
    investments.map(inv => {
      const d = inv.date?.toDate ? inv.date.toDate() : new Date(inv.date);
      return d.getFullYear().toString();
    })
  )].sort().reverse();

  // Garante que o ano atual esteja na lista
  const currentYear = new Date().getFullYear().toString();
  if (!availableYears.includes(currentYear)) {
    availableYears.unshift(currentYear);
  }

  return (
    <div className="chart-container chart-investments-month">
      <div className="chart-header">
        <h3 className="chart-title">Investido por Mês</h3>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="chart-filter"
        >
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="chart-content">
        {investments.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Legend />
              <Bar dataKey="Aportes" fill="#27ae60" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Resgates" fill="#c0392b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">Sem movimentações registradas.</div>
        )}
      </div>
    </div>
  );
};

export default ChartInvestmentsByMonth;
