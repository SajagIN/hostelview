import { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal.jsx';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);

  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);

  const close = (value) => {
    state?.resolve(value);
    setState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        size="sm"
        title={state?.title || 'Are you sure?'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => close(false)}>
              Cancel
            </button>
            <button className={`btn ${state?.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => close(true)} autoFocus>
              {state?.confirmText || 'Confirm'}
            </button>
          </>
        }
      >
        <div className="flex gap-3">
          {state?.danger && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
          )}
          <p className="text-sm leading-6 text-slate-600">{state?.message}</p>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
