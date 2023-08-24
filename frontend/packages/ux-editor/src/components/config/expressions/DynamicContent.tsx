import React, { useEffect, useRef } from "react";
import {
  Dynamic,
  expressionDataSourceTexts,
  ExpressionElement,
  expressionFunctionTexts,
  expressionInPreviewPropertyTexts,
  expressionPropertyTexts,
  Operator,
} from "../../../types/Expressions";
import { Alert, Button, Select, TextArea } from "@digdir/design-system-react";
import {
  ArrowRightIcon,
  CheckmarkIcon,
  PencilIcon,
  XMarkIcon,
} from "@navikt/aksel-icons";
import { ExpressionContent } from "./ExpressionContent";
import { FormComponent } from "../../../types/FormComponent";
import { FormContainer } from "../../../types/FormContainer";
import { Trans, useTranslation } from "react-i18next";
import classes from "./DynamicContent.module.css";
import {
  addAction,
  addExpression,
  complexExpressionIsSet,
  removeExpressionElementAndAddDefaultIfEmpty,
  updateComplexExpression,
  updateExpression,
  updateOperator,
} from "../../../utils/dynamicsUtils";

interface ExpressionProps {
  component: FormComponent | FormContainer;
  dynamic: Dynamic;
  onGetProperties: (dynamic: Dynamic) => {
    availableProperties: string[];
    expressionProperties: string[];
  };
  showRemoveDynamicButton: boolean;
  onAddDynamic: () => void;
  successfullyAddedDynamicId: string;
  onUpdateDynamic: (newDynamic: Dynamic) => void;
  onRemoveDynamic: (dynamic: Dynamic) => void;
  onEditDynamic: (dynamic: Dynamic) => void;
}

export const DynamicContent = ({
  component,
  dynamic,
  onGetProperties,
  showRemoveDynamicButton,
  onAddDynamic,
  successfullyAddedDynamicId,
  onUpdateDynamic,
  onRemoveDynamic,
  onEditDynamic,
}: ExpressionProps) => {
  const dynamicInEditStateRef = useRef(null);
  const dynamicInPreviewStateRef = useRef(null);
  const { t } = useTranslation();

  useEffect(() => {
    const handleClickOutside = (event) => {
      // TODO: Consider the user friendliness of this functionality? Issue: #10858
      // Need to check for dropdown explicit because it is rendered in a portal outside the component
      const isDropDown =
        event.target.tagName === "BUTTON" &&
        event.target.getAttribute("role") === "option";
      // Check for buttons since clicks outside the dynamic on other buttons should not trigger add dynamic
      const isButton =
        event.target.tagName === "BUTTON" ||
        event.target.tagName === "path" ||
        event.target.tagName === "svg";
      const clickTargetIsNotInDynamic =
        dynamicInEditStateRef.current &&
        !(dynamicInEditStateRef.current as HTMLElement).contains(
          event.target
        ) &&
        !isDropDown;
      if (clickTargetIsNotInDynamic && !isButton && dynamic.editMode) {
        // Click occurred outside the dynamic in edit mode
        onAddDynamic();
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [dynamic.editMode, onAddDynamic]);

  const successfullyAddedMark = dynamic.id === successfullyAddedDynamicId;
  const allowToSpecifyExpression = Object.values(
    onGetProperties(dynamic).expressionProperties
  ).includes(dynamic.property);
  const propertiesList = onGetProperties(dynamic).availableProperties;

  const addActionToDynamic = (action: string) => {
    const newDynamic: Dynamic = addAction(dynamic, action);
    onUpdateDynamic(newDynamic);
  };

  const addExpressionElement = (dynamicOperator: Operator) => {
    const newDynamic: Dynamic = addExpression(dynamic, dynamicOperator);
    onUpdateDynamic(newDynamic);
  };

  const updateDynamicOperator = (dynamicOperator: Operator) => {
    const newDynamic: Dynamic = updateOperator(dynamic, dynamicOperator);
    onUpdateDynamic(newDynamic);
  };

  const updateExpressionElement = (
    index: number,
    expressionElement: ExpressionElement
  ) => {
    const newDynamic: Dynamic = updateExpression(
      dynamic,
      index,
      expressionElement
    );
    onUpdateDynamic(newDynamic);
  };

  const updateDynamicComplexExpression = (newComplexExpression: any) => {
    const newDynamic: Dynamic = updateComplexExpression(
      dynamic,
      newComplexExpression
    );
    onUpdateDynamic(newDynamic);
  };

  const removeExpressionElement = (expressionElement: ExpressionElement) => {
    const newDynamic: Dynamic = removeExpressionElementAndAddDefaultIfEmpty(
      dynamic,
      expressionElement
    );
    onUpdateDynamic(newDynamic);
  };

  const tryFormatExpression = (expression: any): string => {
    try {
      // Implies during editing and when the expression has not been able to be parsed to JSON due to syntax
      if (typeof expression === "string") {
        return expression;
      }
      // Attempt to format the JSON input
      return JSON.stringify(expression);
    } catch (error) {
      return expression.toString();
    }
  };

  console.log("dynamic", dynamic); // TODO: Remove when fully tested
  return (
    <>
      {dynamic.editMode ? (
        <div
          className={showRemoveDynamicButton ? classes.dynamicInEdit : null}
          ref={dynamicInEditStateRef}
        >
          {showRemoveDynamicButton && (
            <Button
              className={classes.removeDynamicButton}
              color="danger"
              icon={<XMarkIcon />}
              onClick={() => onRemoveDynamic(dynamic)}
              variant="quiet"
              size="small"
            />
          )}
          <p>
            <Trans
              i18nKey={"right_menu.dynamics_action_on_component"}
              values={{ componentName: component.id }}
              components={{ bold: <strong /> }}
            />
          </p>
          <Select
            onChange={(action) => addActionToDynamic(action)}
            options={[{ label: "Velg handling...", value: "default" }].concat(
              propertiesList.map((property: string) => ({
                label: expressionPropertyTexts(t)[property],
                value: property,
              }))
            )}
            value={dynamic.property || "default"}
          />
          {complexExpressionIsSet(dynamic.complexExpression) ? (
            <div className={classes.complexExpressionContainer}>
              <TextArea
                value={tryFormatExpression(dynamic.complexExpression)}
                onChange={(event) =>
                  updateDynamicComplexExpression(event.target.value)
                }
              />
              <Alert>{t("right_menu.dynamics_complex_dynamic_message")}</Alert>
            </div>
          ) : (
            dynamic.expressionElements.map(
              (expEl: ExpressionElement, index: number) => (
                <div key={expEl.id}>
                  <ExpressionContent
                    expressionAction={allowToSpecifyExpression}
                    expressionElement={expEl}
                    dynamicOperator={
                      index == dynamic.expressionElements.length - 1
                        ? undefined
                        : dynamic.operator
                    }
                    onAddExpressionElement={(dynamicOp: Operator) =>
                      addExpressionElement(dynamicOp)
                    }
                    onUpdateExpressionElement={(
                      expressionElement: ExpressionElement
                    ) => updateExpressionElement(index, expressionElement)}
                    onUpdateDynamicOperator={(dynamicOp: Operator) =>
                      updateDynamicOperator(dynamicOp)
                    }
                    onRemoveExpressionElement={() =>
                      removeExpressionElement(expEl)
                    }
                  />
                </div>
              )
            )
          )}
        </div>
      ) : (
        <div
          className={classes.dynamicInPreview}
          ref={dynamicInPreviewStateRef}
        >
          <div className={classes.dynamicDetails}>
            <span>
              <Trans
                i18nKey={expressionInPreviewPropertyTexts(t)[dynamic.property]}
                values={{ componentName: component.id }}
                components={{ bold: <strong /> }}
              />
            </span>
            {complexExpressionIsSet(dynamic.complexExpression) ? (
              <div className={classes.complexExpressionContainer}>
                <TextArea
                  className={classes.complexExpression}
                  value={tryFormatExpression(dynamic.complexExpression)}
                  disabled={true}
                />
                <Alert>
                  {t("right_menu.dynamics_complex_dynamic_message")}
                </Alert>
              </div>
            ) : (
              dynamic.expressionElements.map(
                (expEl: ExpressionElement, index: number) => (
                  <div key={expEl.id}>
                    <p>
                      <ArrowRightIcon fontSize="1.5rem" />
                      {expressionDataSourceTexts(t)[expEl.dataSource]}{" "}
                      <span>{expEl.value}</span>
                    </p>
                    <p className={classes.bold}>
                      {expressionFunctionTexts(t)[expEl.function]}
                    </p>
                    <p>
                      <ArrowRightIcon fontSize="1.5rem" />
                      {
                        expressionDataSourceTexts(t)[expEl.comparableDataSource]
                      }{" "}
                      <span>{expEl.comparableValue}</span>
                    </p>
                    {index !== dynamic.expressionElements.length - 1 && (
                      <p className={classes.bold}>
                        {dynamic.operator === Operator.And ? "Og" : "Eller"}
                      </p>
                    )}
                  </div>
                )
              )
            )}
            {successfullyAddedMark && (
              <div className={classes.checkMark}>
                <CheckmarkIcon fontSize="1.5rem" />
                {t("right_menu.dynamics_successfully_added_text")}
              </div>
            )}
          </div>
          <div>
            <Button
              color="danger"
              icon={<XMarkIcon />}
              onClick={() => onRemoveDynamic(dynamic)}
              variant="quiet"
              size="small"
            />
            <Button
              icon={<PencilIcon />}
              onClick={() => onEditDynamic(dynamic)}
              variant="quiet"
              size="small"
            />
          </div>
        </div>
      )}
    </>
  );
};
