import React, { createContext, useState } from 'react';

export type StudioRecommendedNextActionContext = {
  shouldDisplayAction: (actionId: string) => boolean;
  addAction: (actionId: string) => void;
  removeAction: (actionId: string) => void;
};

export const StudioRecommendedNextActionContext =
  createContext<StudioRecommendedNextActionContext>(null);

export type StudioRecommendedNextActionContextProviderProps = {
  children: React.ReactNode;
};

export const StudioRecommendedNextActionContextProvider = ({
  children,
}: StudioRecommendedNextActionContextProviderProps) => {
  const [actions, setActions] = useState<{ [key: string]: string }>({});

  const addAction = (actionId: string): void => {
    setActions((prevActions) => {
      return { ...prevActions, [actionId]: actionId };
    });
  };
  const shouldDisplayAction = (actionId: string): boolean => {
    return actions[actionId] === actionId;
  };

  const removeAction = (actionId: string): void => {
    setActions((prevActions) => {
      const newActions = { ...prevActions };
      delete newActions[actionId];
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
