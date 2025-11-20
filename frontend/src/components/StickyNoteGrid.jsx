import React, { useState } from 'react';
import { workshopApi } from '../services/api';

function StickyNoteGrid({ items, color = 'yellow', workshopId, step, moduleId, onUpdate }) {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const handleDelete = async (item) => {
    try {
      await workshopApi.deleteItem(workshopId, item.id, step, moduleId);
      setDeletingId(null);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error al borrar el item');
    }
  };

  const handleEdit = async (item) => {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }
    try {
      await workshopApi.editItem(workshopId, item.id, editText.trim(), step, moduleId);
      setEditingId(null);
      setEditText('');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error editing item:', error);
      alert('Error al editar el item');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  if (items.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-secondary)'
      }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px', opacity: 0.5 }}>
          📝
        </span>
        <p>No hay items aún. Usa el campo de texto o el micrófono para agregar.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '16px'
    }}>
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className={`sticky-note sticky-${color} fade-in`}
          style={{
            animationDelay: `${index * 0.03}s`,
            height: '150px',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            padding: '0'
          }}
        >
          {/* Header with participant name and delete button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 8px',
            borderBottom: '1px solid rgba(0,0,0,0.1)',
            minHeight: '28px'
          }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '600',
              color: 'rgba(0,0,0,0.5)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              marginRight: '4px'
            }}>
              {item.createdBy || 'Anónimo'}
            </span>
            {deletingId !== item.id && editingId !== item.id && (
              <button
                onClick={() => setDeletingId(item.id)}
                style={{
                  background: 'rgba(244, 67, 54, 0.9)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  lineHeight: 1,
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#d32f2f';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(244, 67, 54, 0.9)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Borrar item"
              >
                ×
              </button>
            )}
          </div>

          {/* Delete confirmation overlay */}
          {deletingId === item.id ? (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.95)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              borderRadius: '8px',
              zIndex: 10
            }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', textAlign: 'center', padding: '0 10px' }}>
                ¿Borrar este item?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleDelete(item)}
                  style={{
                    background: '#f44336',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Borrar
                </button>
                <button
                  onClick={() => setDeletingId(null)}
                  style={{
                    background: '#999',
                    color: 'white',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : editingId === item.id ? (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.98)',
              display: 'flex',
              flexDirection: 'column',
              padding: '8px',
              borderRadius: '8px',
              zIndex: 10
            }}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  border: '2px solid var(--primary)',
                  borderRadius: '6px',
                  padding: '6px',
                  fontSize: '13px',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleEdit(item);
                  } else if (e.key === 'Escape') {
                    setEditingId(null);
                    setEditText('');
                  }
                }}
              />
              <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                <button
                  onClick={() => handleEdit(item)}
                  style={{
                    flex: 1,
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    padding: '5px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ✓ Guardar
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setEditText('');
                  }}
                  style={{
                    flex: 1,
                    background: '#999',
                    color: 'white',
                    border: 'none',
                    padding: '5px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  ✕ Cancelar
                </button>
              </div>
            </div>
          ) : null}

          <p
            style={{
              margin: 0,
              fontSize: '14px',
              lineHeight: '1.5',
              wordBreak: 'break-word',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              flex: 1,
              cursor: editingId !== item.id && deletingId !== item.id ? 'pointer' : 'default',
              padding: '8px 12px'
            }}
            onClick={() => {
              if (editingId !== item.id && deletingId !== item.id) {
                startEdit(item);
              }
            }}
            title={editingId !== item.id && deletingId !== item.id ? `Click para editar: ${item.text}` : item.text}
          >
            {item.text}
          </p>
          <div style={{
            padding: '4px 8px',
            fontSize: '10px',
            color: 'rgba(0,0,0,0.4)',
            textAlign: 'right',
            borderTop: '1px solid rgba(0,0,0,0.05)'
          }}>
            #{index + 1}
          </div>
        </div>
      ))}
    </div>
  );
}

export default StickyNoteGrid;
