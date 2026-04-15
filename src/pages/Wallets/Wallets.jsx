import React, { useState, useEffect } from 'react';
import { subscribeWallets, addWallet, removeWallet, transferBetweenWallets } from '../../api/wallets';
import WalletsForm from '../../components/WalletsForm/WalletsForm';
import TransferModal from '../../components/TransferModal/TransferModal';
import './Wallets.css';

const Wallets = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false); // <--- Novo estado

  // Busca dados em Tempo Real
  useEffect(() => {
    const unsubscribe = subscribeWallets((data) => {
      // --- TRECHO NOVO: ORDENAÇÃO ---
      // Ordena do maior saldo para o menor (Decrescente)
      data.sort((a, b) => {
        const saldoA = Number(a.currentBalance) || 0;
        const saldoB = Number(b.currentBalance) || 0;
        return saldoB - saldoA;
      });
      // -----------------------------

      setWallets(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Adicionar Carteira
  const handleAddWallet = async (newWallet) => {
    try {
      await addWallet(newWallet);
    } catch (error) {
      console.error("Erro ao criar carteira:", error);
      alert("Erro ao salvar.");
    }
  };

  // Deletar Carteira
  const handleDeleteWallet = async (id) => {
    if (window.confirm("Tem certeza? Isso não apaga o histórico de transações, mas remove a carteira.")) {
      try {
        await removeWallet(id);
      } catch (error) {
        console.error("Erro ao deletar:", error);
      }
    }
  };

  // --- FUNÇÃO DE TRANSFERÊNCIA ---
  const handleTransfer = async (transferData) => {
    try {
      await transferBetweenWallets(transferData);
      alert("Transferência realizada com sucesso!");
    } catch (error) {
      console.error("Erro na transferência:", error);
      alert("Erro ao realizar transferência.");
    }
  };

  // Helper para formatar o tipo
  const formatType = (type) => {
    const types = {
      'conta_corrente': 'Conta Corrente',
      'vale_alimentacao': 'Vale Alimentação',
      'dinheiro': 'Dinheiro',
      'poupanca': 'Poupança'
    };
    return types[type] || type;
  };

  const totalBalance = wallets.reduce((acc, w) => acc + (w.currentBalance || 0), 0);

  if (loading) return <div className="loading">Carregando carteiras...</div>;

  return (
    <div className="wallets-wrapper">
      <div className="header-actions">
        <h2>Minhas Carteiras</h2>

        {/* Container para os botões ficarem alinhados */}
        <div className="header-buttons" style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-new-wallet" onClick={() => setIsModalOpen(true)}>
            + Nova Carteira
          </button>

          {/* NOVO BOTÃO */}
          <button
            className="btn-transfer"
            onClick={() => setIsTransferModalOpen(true)}
            style={{ backgroundColor: '#8e44ad', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer' }}
          >
            ⇆ Nova Transferência
          </button>
        </div>
      </div>

      {/* Card de Resumo Total */}
      <div className="total-balance-card">
        <span>Saldo Total Disponível</span>
        <strong>{totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
      </div>

      <div className="wallets-grid">
        {wallets.map(wallet => (
          <div
            key={wallet.id}
            className="wallet-item"
            style={{ borderLeft: `6px solid ${wallet.color || '#ccc'}` }}
          >
            <button className="btn-delete-wallet" onClick={() => handleDeleteWallet(wallet.id)}>&times;</button>

            <div className="wallet-info">
              <h3>{wallet.name}</h3>
              <span className="wallet-type">{formatType(wallet.type)}</span>
            </div>

            <div className="wallet-balance">
              <small>Saldo Atual</small>
              <strong>
                {Number(wallet.currentBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </strong>
            </div>
          </div>
        ))}
      </div>

      {/* Modais */}
      <WalletsForm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAddWallet}
      />

      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onConfirm={handleTransfer}
        wallets={wallets}
      />
    </div>
  );
};

export default Wallets;