import React from 'react';
import './CurrencyInput.css';

const CurrencyInput = ({ value, onChange, name, placeholder = "0,00", required = false, className = '' }) => {

    // Função para formatar o valor numérico (float) para string "R$ X.XXX,XX" ou apenas "X.XXX,XX"
    const formatCurrency = (val) => {
        // PERMITIR VALOR ZERO: A condição anterior era `if (!val)`, que barrava o número 0 por ser "falsy".
        // Agora verificamos explicitamente se o valor não é vazio ou nulo,
        // permitindo que o 0 seja formatado corretamente para "0,00".
        if (val === '' || val === null || val === undefined) return '';
        // Converte para número e formata
        return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    };

    const handleChange = (e) => {
        let inputValue = e.target.value;

        // 1. Remove tudo que não é número
        const numericValue = inputValue.replace(/\D/g, '');

        // 2. Converte para float (divide por 100 para considerar os centavos)
        const floatValue = Number(numericValue) / 100;

        // 3. Propaga o evento fake para o pai (mantendo a interface do input nativo)
        // O pai receberá o valor NUMÉRICO puro (float)
        if (onChange) {
            onChange({
                target: {
                    name: name,
                    value: floatValue
                }
            });
        }
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            name={name}
            // PERMITIR VALOR ZERO: Mudamos a condição `value ?` para não invalidar o 0.
            // Antes o 0 resultava em `''` (vazio), o que acionava a validação do `required`
            // bloqueando a criação da carteira, mesmo não havendo bloqueio no componente pai.
            value={(value !== '' && value !== null && value !== undefined) ? formatCurrency(value) : ''}
            onChange={handleChange}
            placeholder={placeholder}
            className={`currency-input ${className}`}
            required={required}
            autoComplete="off"
        />
    );
};

export default CurrencyInput;
