import React, { useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title,
  message,
}) => {
  const handleClose = onCancel ?? onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onConfirm]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title} showCloseButton={false}>
      <div>
        <p className="text-gray-600">{message}</p>
        <div className="flex justify-end pt-6 space-x-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} autoFocus>
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
