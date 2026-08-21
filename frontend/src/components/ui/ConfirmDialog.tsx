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
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | undefined>(undefined);

interface InternalState extends ConfirmOptions {
  resolve?: (value: boolean) => void;
}

import { useCallback, useRef, useState } from 'react';

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<InternalState | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>(resolve => {
      setState({ ...opts, resolve });
    });
  }, []);

  const handleClose = () => {
    stateRef.current?.resolve?.(false);
    setState(null);
  };

  const handleConfirm = () => {
    stateRef.current?.resolve?.(true);
    setState(null);
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
            >
              {state?.confirmText ?? 'Confirm'}
            </Button>
          </>
        }
      >
        {state?.description && (
          <p className="text-sm text-slate-600">{state.description}</p>
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
