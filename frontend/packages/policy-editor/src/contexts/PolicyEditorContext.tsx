import React, { createContext, useContext } from 'react';
import type { PolicyAction, PolicyEditorUsage, PolicyRuleCard, PolicySubject } from '../types';

export type PolicyEditorContextProps = {
  policyRules: PolicyRuleCard[];
  actions: PolicyAction[];
  subjects: PolicySubject[];
  usageType: PolicyEditorUsage;
  resourceType: string;
  showAllErrors: boolean;
};

export const PolicyEditorContext = createContext<Partial<PolicyEditorContextProps>>(undefined);

export type PolicyEditorContextProviderProps = {
  children: React.ReactNode;
} & PolicyEditorContextProps;

export const PolicyEditorContextProvider = ({
  children,
  ...rest
}: PolicyEditorContextProviderProps) => {
  return (
    <PolicyEditorContext.Provider
      value={{
        ...rest,
      }}
    >
      {children}
    </PolicyEditorContext.Provider>
  );
};

export const usePolicyEditorContext = (): Partial<PolicyEditorContextProps> => {
  const context = useContext(PolicyEditorContext);
  if (context === undefined) {
    throw new Error('usePolicyEditorContext must be used within a PolicyEditorContextProvider');
  }
  return context;
};
