import React, { createContext, useContext } from 'react';
import type {
  PolicyAccessPackageCategory,
  PolicyAction,
  PolicyEditorUsage,
  PolicyRuleCard,
  PolicySubject,
} from '../../types';

export type PolicyEditorContextProps = {
  policyRules: PolicyRuleCard[];
  setPolicyRules: React.Dispatch<React.SetStateAction<PolicyRuleCard[]>>;
  actions: PolicyAction[];
  subjects: PolicySubject[];
  accessPackages: PolicyAccessPackageCategory[];
  usageType: PolicyEditorUsage;
  resourceType: string;
  resourceId: string;
  showAllErrors: boolean;
  savePolicy: (rules: PolicyRuleCard[]) => void;
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
