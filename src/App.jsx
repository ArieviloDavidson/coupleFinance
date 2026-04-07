import React, { useState, useEffect } from 'react';
import './App.css';

// Componentes do App
import ListCards from './components/ListCards/ListCards';
import Dashboard from './components/Dashboard/Dashboard';
import Transactions from './components/Transactions/Transactions';
import Wallets from './components/Wallets/Wallets';
import Budgets from './components/Budgets/Budgets';
import Investments from './components/Investments/Investments';

// Auth Imports
import Login from './components/Login/Login'; // Importe o componente que criamos antes
import { auth } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  
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
            onClick={() => setActiveView('dashboard')}
          >
            Visão Geral
          </button>
          
          <button 
            className={activeView === 'transactions' ? 'active' : ''} 
            onClick={() => setActiveView('transactions')}
          >
            Transações
          </button>

          <button 
            className={activeView === 'cards' ? 'active' : ''} 
            onClick={() => setActiveView('cards')}
          >
            Meus Cartões
          </button>

          <button 
            className={activeView === 'wallets' ? 'active' : ''} 
            onClick={() => setActiveView('wallets')}
          >
            Carteiras
          </button>

          <button 
            className={activeView === 'budgets' ? 'active' : ''} 
            onClick={() => setActiveView('budgets')}
          >
            Metas / Orçamento
          </button>

          <button 
            className={activeView === 'investments' ? 'active' : ''} 
            onClick={() => setActiveView('investments')}
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
        {activeView === 'dashboard' && <Dashboard />}
        {activeView === 'transactions' && <Transactions />}
        {activeView === 'cards' && <ListCards />}
        {activeView === 'wallets' && <Wallets />}
        {activeView === 'budgets' && <Budgets />}
        {activeView === 'investments' && <Investments />}
      </main>
    </div>
  )
}

export default App;