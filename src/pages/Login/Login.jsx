import React, { useState } from 'react';
import { signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from '../../firebase';
import { checkAllowedUser } from '../../api/auth';
import './Login.css';

const Login = () => {
  const [loading, setLoading] = useState(false); // Feedback visual é importante em chamadas async

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // 1. Autenticação com Google
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // 2. Verifica se o email está na lista de permitidos
      const isAllowed = await checkAllowedUser(user.email);

      // 3. Verificação
      if (!isAllowed) {
        // O email não está na lista
        await signOut(auth);
        alert("Acesso Negado: Este email não tem permissão para acessar o sistema.");
      } else {
        // O App.jsx vai detectar o login automaticamente via onAuthStateChanged
        console.log("Login autorizado para:", user.email);
      }

    } catch (error) {
      console.error("Erro ao fazer login:", error);
      // Se o erro for 'auth/popup-closed-by-user', não precisa alertar
      if (error.code !== 'auth/popup-closed-by-user') {
        alert("Erro ao logar. Tente novamente.");
      }
      // Em caso de erro, garante o logout por precaução
      await signOut(auth);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Couple Finance 💰</h1>
        <p>Faça login para gerenciar suas finanças</p>

        <button
          className="btn-google"
          onClick={handleGoogleLogin}
          disabled={loading} // Desabilita botão durante carregamento
        >
          {loading ? (
            <span>Verificando permissões...</span>
          ) : (
            <>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google Logo"
              />
              Entrar com Google
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Login;