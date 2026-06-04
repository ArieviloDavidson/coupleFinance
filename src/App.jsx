import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, NavLink} from 'react-router-dom';
import './App.css';

// Pages
import ListCards from './pages/ListCards/ListCards';
import Dashboard from './pages/Dashboard/Dashboard';
import Transactions from './pages/Transactions/Transactions';
import Wallets from './pages/Wallets/Wallets';
import Budgets from './pages/Budgets/Budgets';
import Investments from './pages/Investments/Investments';
import Reminders from './pages/Reminders/Reminders';

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

  // 4. Se tiver usuário, mostra o App (Header + Conteúdo)
  return (
    <div className='app-container'>
      {/* HEADER */}
      <header className="app-header">
        <div className="brand">
          My Finance
        </div>

        <nav className="nav-menu">
          <NavLink to="/home" className="nav-link">VIsão Geral</NavLink>
          <NavLink to="/transactions" className="nav-link">Transações</NavLink>
          <NavLink to="/cards" className="nav-link">Meus Cartões</NavLink>
          <NavLink to="/wallets" className="nav-link">Carteiras</NavLink>
          <NavLink to="/budgets" className="nav-link">Metas / Orçamento</NavLink>
          <NavLink to="/reminders" className="nav-link">Lembretes</NavLink>
          <NavLink to="/investments" className="nav-link">Investimentos</NavLink>
        </nav>

        {/* ÁREA DO PERFIL E LOGOUT */}
        <div className="header-profile">
          <span className="header-profile-text">
            Olá, {user.displayName ? user.displayName.split(' ')[0] : 'Usuário'}
          </span>
          <button 
            onClick={handleLogout}
            className="btn-logout"
          >
            Sair
          </button>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO */}
      <main className="main-content">
        <Routes>
          {/* Rota raiz redireciona para /home */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          
          {/* Rotas de cada página */}
          <Route path="/home" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/cards" element={<ListCards />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/reminders" element={<Reminders />} />
          <Route path="/investments" element={<Investments />} />
          {/* Rota 404 para URLs não encontradas */}
          <Route path="*" element={<div>Página não encontrada</div>} />
        </Routes>
      </main>
    </div>
  )
}

export default App;