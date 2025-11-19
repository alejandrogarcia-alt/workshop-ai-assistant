import React, { useState } from 'react';
import { workshopApi } from '../services/api';

const GROUP_COLORS = [
  { bg: '#FFF9B1', label: 'yellow' },
  { bg: '#FFD1DC', label: 'pink' },
  { bg: '#B1D4FF', label: 'blue' },
  { bg: '#B1FFB1', label: 'green' },
  { bg: '#FFD4A3', label: 'orange' },
  { bg: '#D4B1FF', label: 'purple' }
];

function GroupedView({ groups, workshopId, step, moduleId, onUpdate }) {
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
  if (!groups || groups.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: 'var(--text-secondary)'
      }}>
        <span style={{ fontSize: '48px', display: 'block', marginBottom: '12px', opacity: 0.5 }}>
          🧠
        </span>
        <p>Usa "Agrupar con IA" para organizar los items por conceptos similares.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {groups.map((group, groupIndex) => {
        const colorScheme = GROUP_COLORS[groupIndex % GROUP_COLORS.length];

        return (
          <div
            key={groupIndex}
            className="card fade-in"
            style={{
              animationDelay: `${groupIndex * 0.1}s`,
              border: `3px solid ${colorScheme.bg}`,
              padding: '0'
            }}
          >
            {/* Group Header */}
            <div style={{
              background: colorScheme.bg,
              padding: '10px 16px',
              borderBottom: `2px solid ${colorScheme.bg}`
            }}>
              <h4 style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: '700',
                color: 'var(--secondary)'
              }}>
                🏷️ {group.category}
              </h4>
            </div>

            {/* Group Items */}
            <div style={{
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '10px'
            }}>
              {group.items.map((item, itemIndex) => {
                const itemObj = typeof item === 'string' ? { text: item, id: `temp_${itemIndex}` } : item;
                const itemText = itemObj.text;
                return (
                  <div
                    key={itemObj.id || itemIndex}
                    className={`sticky-note sticky-${colorScheme.label}`}
                    style={{
                      height: '105px',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative'
                    }}
                  >
                    {/* Delete/Edit overlay */}
                    {deletingId === itemObj.id ? (
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
                        gap: '8px',
                        borderRadius: '8px',
                        zIndex: 10,
                        padding: '6px'
                      }}>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: '600', textAlign: 'center' }}>
                          ¿Borrar?
                        </p>
                        <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
                          <button
                            onClick={() => handleDelete(itemObj)}
                            style={{
                              flex: 1,
                              background: '#f44336',
                              color: 'white',
                              border: 'none',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            Sí
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            style={{
                              flex: 1,
                              background: '#999',
                              color: 'white',
                              border: 'none',
                              padding: '4px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    ) : editingId === itemObj.id ? (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(255, 255, 255, 0.98)',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '6px',
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
                            borderRadius: '4px',
                            padding: '4px',
                            fontSize: '11px',
                            resize: 'none',
                            fontFamily: 'inherit'
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) {
                              handleEdit(itemObj);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                              setEditText('');
                            }
                          }}
                        />
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                          <button
                            onClick={() => handleEdit(itemObj)}
                            style={{
                              flex: 1,
                              background: 'var(--primary)',
                              color: 'white',
                              border: 'none',
                              padding: '3px',
                              borderRadius: '4px',
                              fontSize: '9px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            ✓
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
                              padding: '3px',
                              borderRadius: '4px',
                              fontSize: '9px',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setDeletingId(itemObj.id)}
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
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
                            zIndex: 5,
                            transition: 'all 0.2s ease'
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
                      </>
                    )}

                    <p
                      style={{
                        margin: 0,
                        lineHeight: '1.4',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 5,
                        WebkitBoxOrient: 'vertical',
                        flex: 1,
                        cursor: editingId !== itemObj.id && deletingId !== itemObj.id ? 'pointer' : 'default',
                        paddingRight: '22px'
                      }}
                      onClick={() => {
                        if (editingId !== itemObj.id && deletingId !== itemObj.id) {
                          startEdit(itemObj);
                        }
                      }}
                      title={editingId !== itemObj.id && deletingId !== itemObj.id ? `Click para editar: ${itemText}` : itemText}
                    >
                      {itemText}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Item count */}
            <div style={{
              padding: '8px 16px',
              background: 'var(--background)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              textAlign: 'right'
            }}>
              {group.items.length} items en este grupo
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default GroupedView;
