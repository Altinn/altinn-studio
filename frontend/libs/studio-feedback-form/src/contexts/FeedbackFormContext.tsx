import React, { createContext, useContext } from 'react';

export type FeedbackFormContextProps = {
  answers: Record<string, string>;
  setAnswers: (answers: Record<string, string>) => void;
};

export const FeedbackFormContext = createContext<FeedbackFormContextProps>(undefined);

export type FeedbackFormContextProviderProps = {
  children: React.ReactNode;
};

export const FeedbackFormContextProvider = ({ children }: FeedbackFormContextProviderProps) => {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  return (
    <FeedbackFormContext.Provider
      value={{
        answers,
        setAnswers,
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
