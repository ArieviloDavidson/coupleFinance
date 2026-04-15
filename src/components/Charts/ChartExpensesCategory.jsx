import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchExpenseTransactions } from '../../api/transactions';
import './ChartExpensesCategory.css';

const COLORS = ['#0088FE', '#00c42aff', '#FFBB28', '#ff5703ff', '#AF19FF', '#f80000ff', '#4e4f63da', '#f13bc4ff'];

const ChartExpensesCategory = () => {
  const [data, setData] = useState([]);

  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 7);
  });

  useEffect(() => {
    const fetchData = async () => {
      const transactions = await fetchExpenseTransactions();

      const grouped = {};

      transactions.forEach(item => {
        const itemMonth = item.dateObj.toISOString().slice(0, 7);
        const cat = item.category || 'Outros';

        if (itemMonth === filterDate && cat !== 'Transferência') {
          grouped[cat] = (grouped[cat] || 0) + Number(item.value);
        }
      });

      const formattedData = Object.keys(grouped).map(key => ({
        name: key,
        value: grouped[key]
      }));

      setData(formattedData);
    };

    fetchData();
  }, [filterDate]);

  return (
    <div className="chart-container">

      <div className="chart-header">
        <h3 className="chart-title">Gastos por Categoria</h3>
        <input
          type="month"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="chart-filter"
        />
      </div>

      {/* Área de Conteúdo Flexível */}
      <div className="chart-content">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%" cy="50%"
                innerRadius={160}
                outerRadius={200}
                paddingAngle={5}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">
            Sem gastos neste mês.
          </div>
        )}
      </div>

    </div>
  );
};

export default ChartExpensesCategory;