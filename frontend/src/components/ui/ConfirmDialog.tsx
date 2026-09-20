import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  requireText?: string;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(undefined);

interface InternalState extends ConfirmOptions {
  resolve?: (value: boolean) => void;
}

import { useCallback, useRef, useState } from 'react';

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InternalState | null>(null);
  const [text, setText] = useState('');
  const stateRef = useRef(state);
  stateRef.current = state;

  const confirm = useCallback((opts: ConfirmOptions) => {
    setText('');
    return new Promise<boolean>(resolve => {
      setState({ ...opts, resolve });
    });
  }, []);

  const handleClose = () => {
    stateRef.current?.resolve?.(false);
    setState(null);
    setText('');
  };

  const handleConfirm = () => {
    if (stateRef.current?.requireText && text !== stateRef.current.requireText) return;
    stateRef.current?.resolve?.(true);
    setState(null);
    setText('');
  };

  return (
    <ConfirmDialogContext.Provider value={{ confirm }}>
      {children}
      <Modal
        open={!!state}
        onClose={handleClose}
        size="sm"
        title={
          <div className="flex items-center gap-2">
            {state?.variant === 'danger' && (
              <AlertTriangle className="w-5 h-5 text-rose-500" />
            )}
            <span>{state?.title}</span>
          </div>
        }
        footer={
          <>
            <Button variant="outline" onClick={handleClose}>
              {state?.cancelText ?? 'Cancel'}
            </Button>
            <Button
              variant={state?.variant === 'danger' ? 'danger' : 'primary'}
              onClick={handleConfirm}
              disabled={!!state?.requireText && text !== state.requireText}
            >
              {state?.confirmText ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {state?.description && (
          <p className="text-sm text-slate-600">{state.description}</p>
        )}
        {state?.requireText && (
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-1.5">
              Type{' '}
              <span className="font-mono font-semibold text-slate-700">
                {state.requireText}
              </span>{' '}
              to confirm:
            </p>
            <input
              type="text"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={state.requireText}
              className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
            />
          </div>
        )}
      </Modal>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmDialogProvider');
  return ctx.confirm;
}
