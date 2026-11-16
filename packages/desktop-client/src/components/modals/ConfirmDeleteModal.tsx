import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from '@actual-app/components/coss';

import { useCossModal } from '#hooks/useCossModal';
import type { Modal as ModalType } from '#modals/modalsSlice';

type ConfirmDeleteModalProps = Extract<
  ModalType,
  { name: 'confirm-delete' }
>['options'];

export function ConfirmDeleteModal({
  message,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const { t } = useTranslation();
  const { close, onOpenChange, open } = useCossModal('confirm-delete');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup data-testid="confirm-delete-modal">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('Confirm Delete')}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onPress={close}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            variant="primary"
            autoFocus
            onPress={() => {
              onConfirm();
              close();
            }}
          >
            <Trans>Delete</Trans>
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}
