import React, { useState, useEffect } from 'react';
import './App.css';

// Pages
import ListCards from './pages/ListCards/ListCards';
import Dashboard from './pages/Dashboard/Dashboard';
import Transactions from './pages/Transactions/Transactions';
import Wallets from './pages/Wallets/Wallets';
import Budgets from './pages/Budgets/Budgets';
import Investments from './pages/Investments/Investments';

// Auth
import Login from './pages/Login/Login';
import { auth } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [navigateData, setNavigateData] = useState(null);

  // Navegação com dados de contexto (ex: filtro de cartão)
  const handleNavigate = (view, data = null) => {
    setNavigateData(data);
    setActiveView(view);
  };
  
  // Estados de Autenticação
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Monitora se tem usuário logado (Persistência)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Função de Logout
  const handleLogout = async () => {
    await signOut(auth);
    // O useEffect vai detectar que o user virou null e mostrará o Login automaticamente
  };

  // 2. Tela de Carregamento
  if (loading) {
    return (
      <div className="loading-screen">
        Carregando Finanças...
      </div>
    );
  }

  // 3. Se NÃO tiver usuário, mostra tela de Login
  if (!user) {
    return <Login />;
  }

  // 4. Se tiver usuário, mostra o App (Sidebar + Conteúdo)
  return (
    <div className='app-container'>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          Couple Finance
        </div>

        {/* ÁREA DO PERFIL */}
        <div className="sidebar-profile">
          {user.photoURL && (
            <img 
              src={user.photoURL} 
              alt="User" 
              className="sidebar-profile-img"
            />
          )}
          <div className="sidebar-profile-text">
            Olá, {user.displayName ? user.displayName.split(' ')[0] : 'Usuário'}
          </div>
        </div>

        <nav className="nav-menu">
          <button 
            className={activeView === 'dashboard' ? 'active' : ''} 
            onClick={() => { setNavigateData(null); setActiveView('dashboard'); }}
          >
            Visão Geral
          </button>
          
          <button 
            className={activeView === 'transactions' ? 'active' : ''} 
            onClick={() => { setNavigateData(null); setActiveView('transactions'); }}
          >
            Transações
          </button>

          <button 
            className={activeView === 'cards' ? 'active' : ''} 
            onClick={() => { setNavigateData(null); setActiveView('cards'); }}
          >
            Meus Cartões
          </button>

          <button 
            className={activeView === 'wallets' ? 'active' : ''} 
            onClick={() => { setNavigateData(null); setActiveView('wallets'); }}
          >
            Carteiras
          </button>

          <button 
            className={activeView === 'budgets' ? 'active' : ''} 
            onClick={() => { setNavigateData(null); setActiveView('budgets'); }}
          >
            Metas / Orçamento
          </button>

          <button 
            className={activeView === 'investments' ? 'active' : ''} 
            onClick={() => { setNavigateData(null); setActiveView('investments'); }}
          >
            Investimentos
          </button>

          {/* BOTÃO SAIR */}
          <button 
            onClick={handleLogout}
            style={{ marginTop: '20px', backgroundColor: 'rgba(231, 76, 60, 0.2)', color: '#e74c3c', border: '1px solid #e74c3c' }}
          >
            Sair
          </button>

        </nav>
      </aside>

      {/* ÁREA DE CONTEÚDO À DIREITA */}
      <main className="main-content">
        {activeView === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
        {activeView === 'transactions' && <Transactions />}
        {activeView === 'cards' && <ListCards initialCardFilter={navigateData?.cardFilter || ''} />}
        {activeView === 'wallets' && <Wallets />}
        {activeView === 'budgets' && <Budgets />}
        {activeView === 'investments' && <Investments />}
      </main>
    </div>
  )
}

export default App;