import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { theme } from '@actual-app/components/theme';
import { send } from '@actual-app/core/platform/client/connection';
import { q } from '@actual-app/core/shared/query';
import type { NewRuleEntity, RuleEntity } from '@actual-app/core/types/models';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { RuleEditor } from '#components/rules/RuleEditor';
import { useSchedules } from '#hooks/useSchedules';
import { pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

type EditRuleModalProps = {
  rule: RuleEntity | NewRuleEntity;
  onSave?: (rule: RuleEntity) => void;
};

export function EditRuleModal({
  rule: defaultRule,
  onSave: originalOnSave,
}: EditRuleModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const ruleId = 'id' in defaultRule ? defaultRule.id : undefined;
  const { schedules = [] } = useSchedules({
    query: useMemo(
      () =>
        ruleId
          ? q('schedules')
              .filter({ rule: ruleId, completed: false })
              .select('*')
          : q('schedules').filter({ id: null }).select('*'),
      [ruleId],
    ),
  });

  const isEditing = Boolean(ruleId);
  const isLinkedToSchedule = schedules.length > 0;

  return (
    <Modal name="edit-rule">
      {({ state }) => {
        function handleDelete() {
          if (!ruleId) {
            return;
          }

          dispatch(
            pushModal({
              modal: {
                name: 'confirm-delete',
                options: {
                  message: t('Are you sure you want to delete this rule?'),
                  onConfirm: async () => {
                    try {
                      const { someDeletionsFailed } = await send(
                        'rule-delete-all',
                        [ruleId],
                      );

                      if (someDeletionsFailed) {
                        dispatch(
                          addNotification({
                            notification: {
                              type: 'warning',
                              message: t(
                                'This rule could not be deleted because it is linked to a schedule.',
                              ),
                            },
                          }),
                        );
                        return;
                      }

                      originalOnSave?.({
                        ...defaultRule,
                        id: ruleId,
                      } as RuleEntity);
                      state.close();
                    } catch {
                      dispatch(
                        addNotification({
                          notification: {
                            type: 'error',
                            message: t(
                              'Failed to delete rule. Please try again.',
                            ),
                          },
                        }),
                      );
                    }
                  },
                },
              },
            }),
          );
        }

        return (
          <>
            <ModalHeader
              title={t('Rule')}
              rightContent={<ModalCloseButton onPress={() => state.close()} />}
            />
            <RuleEditor
              rule={defaultRule}
              onSave={rule => {
                originalOnSave?.(rule);
                state.close();
              }}
              onCancel={() => state.close()}
              onDelete={
                isEditing && !isLinkedToSchedule ? handleDelete : undefined
              }
              style={{
                maxWidth: '100%',
                width: 900,
                height: '80vh',
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: 'auto',
                overflow: 'hidden',
                color: theme.pageTextLight,
              }}
            />
          </>
        );
      }}
    </Modal>
  );
}
