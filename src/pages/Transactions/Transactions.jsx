import React, { useState, useEffect, useMemo } from 'react';
import {
  subscribeTransactions,
  addTransactionWithWalletUpdate,
  deleteTransactionWithRefund,
  addTransactionWithCard
} from '../../api/transactions';
import TransactionForm from '../../components/TransactionForm/TransactionForm';
import './Transactions.css';
import '../../shared.css';

import { TRANSACTION_TYPES } from '../../utils/constants';

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

const Transactions = () => {
  const changeMonth = (direction) => {
    if (!filterDate) return;
    const [year, month] = filterDate.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    setFilterDate(getMonthKey(date));
  };

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWallet, setFilterWallet] = useState('todos');
  const [filterDate, setFilterDate] = useState(() => {
    // Inicia com o mês atual (YYYY-MM)
    const today = new Date();
    return today.toISOString().slice(0, 7);
  });

  // 1. Busca Transações em Tempo Real
  useEffect(() => {
    const unsubscribe = subscribeTransactions((data) => {
      setTransactions(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. ADICIONAR: Cria a transação (via Carteira ou Cartão de Crédito)
  const handleAddTransaction = async (newTrans) => {
    try {
      if (newTrans.paymentMethod === 'card') {
        await addTransactionWithCard(newTrans);
        alert(`Transação "${newTrans.description}" lançada no cartão!`);
      } else {
        await addTransactionWithWalletUpdate(newTrans);
      }
    } catch (error) {
      console.error("Erro ao criar transação:", error);
      alert("Erro ao salvar. O saldo não foi alterado.");
    }
  };

  // 3. EXCLUIR: Apaga a transação e Estorna o valor para a Carteira
  const handleDeleteTransaction = async (transaction) => {
    const confirmDelete = window.confirm(
      `Excluir "${transaction.description}"? O valor (R$ ${transaction.value}) será estornado para a carteira.`
    );

    if (confirmDelete) {
      try {
        await deleteTransactionWithRefund(transaction);
      } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir. O saldo não foi estornado.");
      }
    }
  };

  // Carteiras únicas apenas do mês selecionado
  const walletOptions = useMemo(() => {
    const names = new Set();
    transactions.forEach(t => {
      if (!t.walletName) return;
      if (filterDate) {
        const itemDate = t.dateObj.toISOString().slice(0, 7);
        if (itemDate !== filterDate) return;
      }
      names.add(t.walletName);
    });
    return [...names].sort();
  }, [transactions, filterDate]);

  // 4. Lógica de Filtragem no Front-end
  const filteredTransactions = transactions.filter(item => {
    // Filtro de Data (Mês/Ano)
    if (filterDate) {
      const itemDate = item.dateObj.toISOString().slice(0, 7);
      if (itemDate !== filterDate) return false;
    }

    // Filtro de Carteira
    if (filterWallet !== 'todos' && item.walletName !== filterWallet) return false;

    // Filtro de Busca por Texto (Descrição)
    if (searchTerm && !item.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    return true;
  });

  // 5. Cálculo do Total da Visualização Atual
  const totalBalance = filteredTransactions.reduce((acc, item) => {
    return item.type === TRANSACTION_TYPES.ENTRADA ? acc + Number(item.value) : acc - Number(item.value);
  }, 0);

  if (loading) return <div className="loading">Carregando movimentações...</div>;

  return (
    <div className="transactions-container container">
      <div className="transactions-header header-container">
        <div className="header-left">
          <h1 className="page-title">Movimentações</h1>
          <p className="page-subtitle">Histórico de entradas e saídas</p>
        </div>

        <button className="btn-new-trans btn" onClick={() => setIsModalOpen(true)}>
          + Nova Movimentação
        </button>

        <div className="filters">
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-input"
            style={{ minWidth: '150px' }} // Ajuste visual básico
          />
          <div className="month-nav">
            <button onClick={() => changeMonth(-1)} className="month-nav-btn">◀</button>
            <span className="month-label">{formatMonthLabel(filterDate)}</span>
            <button onClick={() => changeMonth(1)} className="month-nav-btn">▶</button>
          </div>

          <select
            value={filterWallet}
            onChange={(e) => setFilterWallet(e.target.value)}
            className="filter-input"
          >
            <option value="todos">Todas as Carteiras</option>
            {walletOptions.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="transactions-content page-container">
        <div className="balance-summary">
          <span>Total no período: </span>
        <strong className={totalBalance >= 0 ? 'text-green' : 'text-red'}>
          {totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </strong>
      </div>

      <div className="transactions-list">
        {filteredTransactions.length === 0 ? (
          <p className="no-data">Nenhuma transação neste período.</p>
        ) : (
          filteredTransactions.map(item => (
            <div key={item.id} className="transaction-item">

              <button
                className="btn-delete-transaction"
                onClick={() => handleDeleteTransaction(item)}
                title="Excluir e estornar saldo"
              >
                &times;
              </button>

              <div className={`indicator ${item.type}`}></div>

              <div className="transaction-info">
                <span className="transaction-desc">{item.description}</span>
                <span className="transaction-category">{item.category}</span>
                <div className="transaction-meta">
                  <span className="transaction-date">
                    {item.dateObj.toLocaleDateString('pt-BR')}
                  </span>

                  {/* Badge da Carteira */}
                  {item.walletName && (
                    <span className="transaction-wallet-badge">
                      {item.walletName}
                    </span>
                  )}
                </div>
              </div>

              <div className={`transaction-value ${item.type}`}>
                {item.type === 'saida' ? '- ' : '+ '}
                {Number(item.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </div>
          ))
        )}
        </div>
      </div>

      <TransactionForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddTransaction}
      />
    </div>
  );
};

export default Transactions;