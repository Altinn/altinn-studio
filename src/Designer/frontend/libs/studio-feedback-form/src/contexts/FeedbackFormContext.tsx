import React, { createContext, useContext } from 'react';

export type FeedbackFormContextProps = {
  answers: Record<string, string>;
  setAnswers: (answers: Record<string, string>) => void;
  submitPath: string;
};

export const FeedbackFormContext = createContext<FeedbackFormContextProps>(undefined);

export type FeedbackFormContextProviderProps = {
  children: React.ReactNode;
  submitPath: string;
};

export const FeedbackFormContextProvider = ({
  children,
  submitPath,
}: FeedbackFormContextProviderProps) => {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  return (
    <FeedbackFormContext.Provider
      value={{
        answers,
        setAnswers,
        submitPath,
      }}
    >
      {children}
    </FeedbackFormContext.Provider>
  );
};

export const useFeedbackFormContext = (): FeedbackFormContextProps => {
  const context = useContext(FeedbackFormContext);
  if (context === undefined) {
    throw new Error('useFeedbackFormContext must be used within a FeedbackFormContextProvider');
  }
  return context;
};
