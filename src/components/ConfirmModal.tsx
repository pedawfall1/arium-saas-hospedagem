"use client"
import { useEffect, useState } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else {
      const timer = setTimeout(() => setIsRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s ease',
      }}
      onClick={onCancel}
    >
      <div 
        style={{
          backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px',
          padding: '24px', width: '100%', maxWidth: '400px',
          transform: isOpen ? 'scale(1)' : 'scale(0.95)', transition: 'transform 0.2s ease',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ color: 'var(--text)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{title}</h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>{message}</p>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={onCancel}
            style={{ 
              backgroundColor: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', 
              borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            style={{ 
              backgroundColor: 'var(--purple)', color: '#ffffff', border: 'none', 
              borderRadius: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)', transition: 'transform 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({ title: '', message: '' });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);

  const confirm = (title: string, message: string): Promise<boolean> => {
    setIsOpen(true);
    setConfig({ title, message });
    return new Promise((resolve) => {
      setResolvePromise(() => resolve);
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(true);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(false);
  };

  const ModalComponent = () => (
    <ConfirmModal 
      isOpen={isOpen} 
      title={config.title} 
      message={config.message} 
      onConfirm={handleConfirm} 
      onCancel={handleCancel} 
    />
  );

  return { confirm, ConfirmModal: ModalComponent };
}
