import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchExpenseTransactions } from '../../api/transactions';
import { fetchCards, fetchCardsShopping } from '../../api/cards';
import CategoryExpensesModal from '../CategoryExpensesModal/CategoryExpensesModal';
import './ChartExpensesCategory.css';

const COLORS = ['#0088FE', '#00c42aff', '#FFBB28', '#ff5703ff', '#AF19FF', '#f80000ff', '#4e4f63da', '#f13bc4ff'];

const getMonthKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const formatMonthLabel = (monthKey) => {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${monthNames[Number(month) - 1]} / ${year}`;
};

const ChartExpensesCategory = () => {
  const changeMonth = (direction) => {
    if (!filterDate) return;
    const [year, month] = filterDate.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    setFilterDate(getMonthKey(date));
  };

  const [data, setData] = useState([]);
  const [rawTransactions, setRawTransactions] = useState([]);
  const [rawCardPurchases, setRawCardPurchases] = useState([]);
  const [cards, setCards] = useState([]);

  // Modal de Detalhamento
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toLocaleDateString('en-CA').slice(0, 7);
  });

  useEffect(() => {
    const fetchData = async () => {
      const transactions = await fetchExpenseTransactions();
      const cardPurchases = await fetchCardsShopping();
      const cardsData = await fetchCards();

      setRawTransactions(transactions);
      setRawCardPurchases(cardPurchases);
      setCards(cardsData);

      const grouped = {};

      transactions.forEach(item => {
        if (item.category === 'Pagamento de Cartão') return;

        const itemMonth = item.dateObj.toLocaleDateString('en-CA').slice(0, 7);
        const cat = item.category || 'Outros';

        if (itemMonth === filterDate && cat !== 'Transferência') {
          grouped[cat] = (grouped[cat] || 0) + Number(item.value);
        }
      });

      cardPurchases.forEach(item => {
        if (item.status !== 'pago') return;

        const filterTargetDate = item.purchaseDateObj || item.dateObj;
        const itemMonth = filterTargetDate.toLocaleDateString('en-CA').slice(0, 7);
        const cat = item.category || 'Outros';

        if (itemMonth === filterDate) {
          grouped[cat] = (grouped[cat] || 0) + Number(item.totalValue);
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

  const handleCategoryClick = (categoryName) => {
    if (!categoryName) return;
    setSelectedCategory(categoryName);
    setIsModalOpen(true);
  };

  return (
    <div className="chart-container">

      <div className="chart-header">
        <h3 className="chart-title">Gastos por Categoria</h3>
        <div className="month-nav">
          <button onClick={() => changeMonth(-1)} className="month-nav-btn">◀</button>
          <span className="month-label">{formatMonthLabel(filterDate)}</span>
          <button onClick={() => changeMonth(1)} className="month-nav-btn">▶</button>
        </div>
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
                onClick={(entry) => handleCategoryClick(entry.name)}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cursor="pointer" />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `R$ ${value.toFixed(2)}`} />
              <Legend
                verticalAlign="bottom"
                height={36}
                onClick={(entry) => handleCategoryClick(entry.value)}
                wrapperStyle={{ cursor: 'pointer' }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">
            Sem gastos neste mês.
          </div>
        )}
      </div>

      {/* Modal de Detalhamento dos Gastos da Categoria */}
      <CategoryExpensesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        category={selectedCategory}
        monthKey={filterDate}
        transactions={rawTransactions}
        cardPurchases={rawCardPurchases}
        cards={cards}
      />

    </div>
  );
};

export default ChartExpensesCategory;