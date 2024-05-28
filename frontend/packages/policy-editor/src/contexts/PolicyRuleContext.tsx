import React, { createContext, useContext } from 'react';
import type { PolicyRuleCard } from '../types';

export type PolicyRuleContextProps = {
  policyRule: PolicyRuleCard;
  showAllErrors: boolean;
  uniqueId: string;

  // Maybe make in to one
  hasResourceError: boolean;
  setHasResourceError: React.Dispatch<React.SetStateAction<boolean>>;

  hasActionsError: boolean;
  setHasActionsError: React.Dispatch<React.SetStateAction<boolean>>;

  hasSubjectsError: boolean;
  setHasSubjectsError: React.Dispatch<React.SetStateAction<boolean>>;
};

export const PolicyRuleContext = createContext<Partial<PolicyRuleContextProps>>(undefined);

export type PolicyRuleContextProviderProps = {
  children: React.ReactNode;
} & PolicyRuleContextProps;

export const PolicyRuleContextProvider = ({
  children,
  ...rest
}: PolicyRuleContextProviderProps) => {
  return (
    <PolicyRuleContext.Provider
      value={{
        ...rest,
      }}
    >
      {children}
    </PolicyRuleContext.Provider>
  );
};

export const usePolicyRuleContext = (): Partial<PolicyRuleContextProps> => {
  const context = useContext(PolicyRuleContext);
  if (context === undefined) {
    throw new Error('usePolicyRuleContext must be used within a PolicyRuleContextProvider');
  }
  return context;
};
