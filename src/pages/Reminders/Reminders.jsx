// BASIC
import React, { useState, useEffect, useMemo } from 'react';
// API
import { subscribeReminders, addReminder, removeReminder, toggleReminderCompleted } from '../../api/reminders';
// COMPONENTS
import CurrencyInput from '../../components/CurrencyInput/CurrencyInput';
import ReminderPayModal from '../../components/ReminderPayModal/ReminderPayModal';
// CSS
import './Reminders.css';
import '../../shared.css';

// Utilitário: retorna "YYYY-MM" de uma data
const getMonthKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Utilitário: formata "YYYY-MM" para "Mês / Ano"
const formatMonthLabel = (monthKey) => {
  const [year, month] = monthKey.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${monthNames[Number(month) - 1]} / ${year}`;
};

// Utilitário: retorna status de urgência
const getUrgencyStatus = (dueDate, completed) => {
  if (completed) return 'completed';

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 1) return 'soon';
  return 'future';
};

const Reminders = () => {
  // Estado dos lembretes
  const [reminders, setReminders] = useState([]);
  // Filtro por mês (default = mês atual)
  const [filterMonth, setFilterMonth] = useState(getMonthKey(new Date()));
  // Filtro por nome
  const [searchQuery, setSearchQuery] = useState('');
  // Filtro de status: 'all', 'pending', 'completed'
  const [statusFilter, setStatusFilter] = useState('all');
  // Estado do novo item
  const [newItem, setNewItem] = useState({ description: '', value: '', dueDate: '' });
  // Modal de pagamento
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);

  // Busca lembretes em tempo real
  useEffect(() => {
    const unsubscribe = subscribeReminders((data) => {
      setReminders(data);
    });
    return () => unsubscribe();
  }, []);

  // Navegação de mês
  const changeMonth = (direction) => {
    const [year, month] = filterMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    setFilterMonth(getMonthKey(date));
  };

  // Filtragem combinada (mês + busca + status)
  const filteredReminders = useMemo(() => {
    return reminders.filter(item => {
      // Filtro por mês (baseado no dueDate)
      const itemMonth = getMonthKey(item.dueDateObj);
      if (itemMonth !== filterMonth) return false;

      // Filtro por nome
      if (searchQuery && !item.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Filtro de status
      if (statusFilter === 'pending' && item.completed) return false;
      if (statusFilter === 'completed' && !item.completed) return false;

      return true;
    });
  }, [reminders, filterMonth, searchQuery, statusFilter]);

  // Total pendente do mês filtrado
  const totalPending = useMemo(() => {
    return filteredReminders
      .filter(item => !item.completed)
      .reduce((acc, item) => acc + (item.value || 0), 0);
  }, [filteredReminders]);

  // Adicionar novo lembrete
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.description || !newItem.value || !newItem.dueDate) return;

    try {
      await addReminder({
        ...newItem,
        dueDate: new Date(newItem.dueDate + 'T12:00:00') // Meio-dia para evitar problemas de fuso
      });
      setNewItem({ description: '', value: '', dueDate: '' });
    } catch (error) {
      console.error("Erro ao adicionar lembrete:", error);
    }
  };

  // Excluir lembrete
  const handleDelete = async (id) => {
    try {
      await removeReminder(id);
    } catch (error) {
      console.error("Erro ao deletar lembrete:", error);
    }
  };

  // Toggle concluído (manual, sem gerar transação)
  const handleToggle = async (item) => {
    try {
      await toggleReminderCompleted(item.id, item.completed);
    } catch (error) {
      console.error("Erro ao atualizar lembrete:", error);
    }
  };

  // Abrir modal de pagamento
  const openPayModal = (item) => {
    setSelectedReminder(item);
    setPayModalOpen(true);
  };

  // Formatar data para exibição (DD/MM)
  const formatDate = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className='reminders-container container'>

      {/* HEADER */}
      <div className="reminders-header header-container">
        <div className="header-left">
          <h1 className='page-title'>Lembretes</h1>
          <p className='page-subtitle'>Compromissos financeiros e lembretes</p>
        </div>

        <div className="header-cards">
          <div className="reminder-total-card">
            <span>Total Pendente</span>
            <strong>
              {totalPending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </strong>
          </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="reminders-content page-container">
        <div className="reminders-card">

          {/* BARRA DE FILTROS */}
          <div className="reminders-filters">
            {/* Navegação de Mês */}
            <div className="month-nav">
              <button onClick={() => changeMonth(-1)} className="month-nav-btn">◀</button>
              <span className="month-label">{formatMonthLabel(filterMonth)}</span>
              <button onClick={() => changeMonth(1)} className="month-nav-btn">▶</button>
            </div>

            {/* Busca por Nome */}
            <div className="search-box">
              <input
                type="text"
                placeholder="🔍 Buscar lembrete..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Filtro de Status */}
            <div className="status-filter">
              <button
                className={`status-btn ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Todos
              </button>
              <button
                className={`status-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                Pendentes
              </button>
              <button
                className={`status-btn ${statusFilter === 'completed' ? 'active' : ''}`}
                onClick={() => setStatusFilter('completed')}
              >
                Concluídos
              </button>
            </div>
          </div>

          {/* LISTA DE LEMBRETES */}
          <div className="reminders-list">
            {filteredReminders.length === 0 && (
              <div className="empty-state">
                Nenhum lembrete encontrado para este período.
              </div>
            )}

            {filteredReminders.map(item => {
              const urgency = getUrgencyStatus(item.dueDateObj, item.completed);
              return (
                <div key={item.id} className={`reminder-item reminder-${urgency}`}>
                  {/* Indicador de urgência */}
                  <div className={`urgency-dot dot-${urgency}`} title={
                    urgency === 'overdue' ? 'Vencido' :
                    urgency === 'soon' ? 'Vence hoje/amanhã' :
                    urgency === 'completed' ? 'Concluído' : 'Futuro'
                  }></div>

                  {/* Info principal */}
                  <div className="reminder-info">
                    <span className="reminder-description">{item.description}</span>
                    <span className="reminder-date">{formatDate(item.dueDateObj)}</span>
                  </div>

                  {/* Valor + Ações */}
                  <div className="reminder-actions">
                    <strong className="reminder-value">
                      {item.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong>

                    {/* Botão gerar transação */}
                    {!item.completed && (
                      <button
                        className="btn-generate-reminder"
                        onClick={() => openPayModal(item)}
                        title="Gerar transação"
                      >
                        ▶
                      </button>
                    )}

                    {/* Botão toggle concluído */}
                    <button
                      className={`btn-toggle-reminder ${item.completed ? 'is-completed' : ''}`}
                      onClick={() => handleToggle(item)}
                      title={item.completed ? 'Marcar como pendente' : 'Marcar como concluído'}
                    >
                      {item.completed ? '↺' : '✓'}
                    </button>

                    {/* Botão excluir */}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="btn-remove-reminder"
                      title="Excluir lembrete"
                    >
                      &times;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* FORMULÁRIO PARA ADICIONAR */}
          <form onSubmit={handleAdd} className="reminder-form">
            <input
              type="text"
              placeholder="Descrição do lembrete"
              value={newItem.description}
              onChange={e => setNewItem({ ...newItem, description: e.target.value })}
            />
            <CurrencyInput
              value={newItem.value}
              onChange={e => setNewItem({ ...newItem, value: e.target.value })}
              placeholder="R$"
            />
            <input
              type="date"
              value={newItem.dueDate}
              onChange={e => setNewItem({ ...newItem, dueDate: e.target.value })}
            />
            <button type="submit" title="Adicionar lembrete">+</button>
          </form>

        </div>
      </div>

      {/* MODAL DE PAGAMENTO */}
      <ReminderPayModal
        isOpen={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        reminderItem={selectedReminder}
      />
    </div>
  );
};

export default Reminders;
