import React, { useState } from 'react';
import { PolicyCardRules } from '../PolicyCardRules';
import { AddPolicyRuleButton } from '../AddPolicyRuleButton';
import classes from './PolicyRulesEditor.module.css';

export function PolicyRulesEditor(): React.ReactElement {
  const [showErrorsOnAllRulesAboveNew, setShowErrorsOnAllRulesAboveNew] = useState(false);

  const handleClickAddButton = () => {
    setShowErrorsOnAllRulesAboveNew(true);
  };

  return (
    <div>
      <PolicyCardRules showErrorsOnAllRulesAboveNew={showErrorsOnAllRulesAboveNew} />
      <div className={classes.addCardButtonWrapper}>
        <AddPolicyRuleButton onClick={handleClickAddButton} />
      </div>
    </div>
  );
}
