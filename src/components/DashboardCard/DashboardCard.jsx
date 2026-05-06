import React from 'react';
import './DashboardCard.css';

/**
 * Card reutilizável do Dashboard.
 * @param {string} label - Título do card
 * @param {number} value - Valor numérico (formatado automaticamente em BRL)
 * @param {string} variant - Classe CSS do card (ex: 'balance', 'prediction', 'forecast')
 * @param {string} className - Classes CSS extras (ex: 'forecast-positive')
 * @param {Object} valueStyle - Estilo inline aplicado ao valor
 */
const DashboardCard = ({ label, value, variant = '', className = '', valueStyle = {} }) => {
  const formattedValue = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className={`dashboard-card ${variant}-card ${className}`.trim()}>
      <span>{label}</span>
      <strong style={valueStyle}>{formattedValue}</strong>
    </div>
  );
};

export default DashboardCard;
