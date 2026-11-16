import { useState } from 'react';
import type { ComponentPropsWithoutRef, ComponentType, FormEvent } from 'react';

import { Button } from '@actual-app/components/button';
import {
  Dialog,
  DialogPopup,
  Field,
  FieldError,
} from '@actual-app/components/coss';
import { InitialFocus } from '@actual-app/components/initial-focus';

import type { ModalHeader } from '#components/common/Modal';
import { ModalCloseButton } from '#components/common/Modal';
import { InputField } from '#components/mobile/MobileForms';
import { useCossModal } from '#hooks/useCossModal';

type SingleInputModalProps = {
  name: Parameters<typeof useCossModal>[0];
  Header: ComponentType<ComponentPropsWithoutRef<typeof ModalHeader>>;
  buttonText: string;
  onSubmit: (value: string) => void;
  onValidate?: (value: string) => string | null;
  inputPlaceholder?: string;
};

export function SingleInputModal({
  name,
  Header,
  buttonText,
  onSubmit,
  onValidate,
  inputPlaceholder,
}: SingleInputModalProps) {
  const [value, setValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { close, onOpenChange, open } = useCossModal(name);

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const error = onValidate?.(value) ?? null;
    if (error) {
      setErrorMessage(error);
      return;
    }

    onSubmit(value);
    close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup showCloseButton={false} data-testid={`${name}-modal`}>
        <Header rightContent={<ModalCloseButton onPress={close} />} />
        <form onSubmit={onFormSubmit}>
          <Field className="w-full px-6 pb-6">
            <InitialFocus>
              <InputField
                placeholder={inputPlaceholder}
                defaultValue={value}
                onChangeValue={setValue}
              />
            </InitialFocus>
            <FieldError match={Boolean(errorMessage)}>
              {errorMessage}
            </FieldError>
            <Button type="submit" variant="primary" className="self-center">
              {buttonText}
            </Button>
          </Field>
        </form>
      </DialogPopup>
    </Dialog>
  );
}
