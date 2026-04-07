import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import './ChartInvestmentsValueByType.css';

const ChartInvestmentsValueByType = ({ data }) => {
  // data = [{ name: 'Renda Fixa', value: 5000, color: '#0088FE' }, ...]

  return (
    <div className="chart-container chart-investments-value">
      <div className="chart-header">
        <h3 className="chart-title">Valor por Tipo</h3>
      </div>

      <div className="chart-content">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Bar dataKey="value" name="Saldo" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">Sem investimentos registrados.</div>
        )}
      </div>
    </div>
  );
};

export default ChartInvestmentsValueByType;
