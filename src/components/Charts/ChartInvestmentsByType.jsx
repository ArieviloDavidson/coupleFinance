import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './ChartInvestmentsByType.css';

const ChartInvestmentsByType = ({ data }) => {
  // data = [{ name: 'Renda Fixa', value: 5000, color: '#0088FE' }, ...]

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.03) return null;

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="chart-container chart-investments-type">
      <div className="chart-header">
        <h3 className="chart-title">Distribuição por Tipo</h3>
      </div>

      <div className="chart-content">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={4}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">Sem investimentos registrados.</div>
        )}
      </div>
    </div>
  );
};

export default ChartInvestmentsByType;
