import React, { createContext, useContext } from 'react';
import type { PolicyRuleCard, PolicyError } from '../../types';

export type PolicyRuleContextProps = {
  policyRule: PolicyRuleCard;
  showAllErrors: boolean;
  uniqueId: string;
  policyError: PolicyError;
  setPolicyError: React.Dispatch<React.SetStateAction<PolicyError>>;
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
