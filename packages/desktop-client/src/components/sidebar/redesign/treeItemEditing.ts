import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';

type TreeItemEditingContextValue = {
  editingKey: string | null;
  setEditingKey: Dispatch<SetStateAction<string | null>>;
};

export const TreeItemEditingContext =
  createContext<TreeItemEditingContextValue | null>(null);

export function useTreeItemEditing(key: string) {
  const context = useContext(TreeItemEditingContext);
  if (!context) {
    throw new Error(
      'useTreeItemEditing must be used within a TreeItemEditingContext',
    );
  }
  const { editingKey, setEditingKey } = context;

  const setIsEditing = (isEditing: boolean) =>
    setEditingKey(current => {
      if (isEditing) {
        return key;
      }
      return current === key ? null : current;
    });

  return [editingKey === key, setIsEditing] as const;
}
