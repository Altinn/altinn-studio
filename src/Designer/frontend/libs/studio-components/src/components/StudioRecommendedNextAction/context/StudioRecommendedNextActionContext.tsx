import React, { createContext, useState } from 'react';

export type StudioRecommendedNextActionContext = {
  shouldDisplayAction: (actionId: string) => boolean;
  addAction: (actionId: string) => void;
  removeAction: (actionId: string) => void;
};

export const StudioRecommendedNextActionContext =
  createContext<StudioRecommendedNextActionContext>(undefined);

export type StudioRecommendedNextActionContextProviderProps = {
  children: React.ReactNode;
};

export const StudioRecommendedNextActionContextProvider = ({
  children,
}: StudioRecommendedNextActionContextProviderProps): JSX.Element => {
  const [actions, setActions] = useState<Set<string>>(new Set());

  const addAction = (actionId: string): void => {
    setActions((prevActions) => new Set(prevActions).add(actionId));
  };

  const shouldDisplayAction = (actionId: string): boolean => {
    return actions.has(actionId);
  };

  const removeAction = (actionId: string): void => {
    setActions((prevActions) => {
      const newActions = new Set(prevActions);
      newActions.delete(actionId);
      return newActions;
    });
  };

  return (
    <StudioRecommendedNextActionContext.Provider
      value={{ addAction, shouldDisplayAction, removeAction }}
    >
      {children}
    </StudioRecommendedNextActionContext.Provider>
  );
};
