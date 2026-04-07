import React, { useState } from 'react';

const PRESET_COLORS = [
  '#0088FE', '#00c42a', '#FFBB28', '#ff5703', '#AF19FF',
  '#f80000', '#4e4f63', '#f13bc4', '#1abc9c', '#e67e22'
];
import './InvestmentTypeForm.css';

const InvestmentTypeForm = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    idealPercentage: '',
    color: PRESET_COLORS[0]
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Informe o nome do tipo.');
      return;
    }

    onSave({
      name: formData.name.trim(),
      idealPercentage: Number(formData.idealPercentage),
      color: formData.color
    });

    onClose();
    setFormData({ name: '', idealPercentage: '', color: PRESET_COLORS[0] });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '360px' }}>
        <div className="modal-header">
          <h3>Novo Tipo de Investimento</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome</label>
            <input
              type="text" name="name"
              value={formData.name} onChange={handleChange}
              placeholder="Ex: Renda Fixa" required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>% Ideal</label>
              <input
                type="number" name="idealPercentage"
                value={formData.idealPercentage} onChange={handleChange}
                placeholder="25" min="0" max="100" required
              />
            </div>
            <div className="form-group">
              <label>Cor</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {PRESET_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setFormData(prev => ({ ...prev, color: c }))}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      backgroundColor: c,
                      cursor: 'pointer',
                      border: formData.color === c ? '3px solid #333' : '2px solid transparent',
                      transition: 'border 0.2s'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">Cancelar</button>
            <button type="submit" className="save-btn">Criar Tipo</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InvestmentTypeForm;
