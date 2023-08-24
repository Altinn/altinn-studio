import React, { memo, useState } from "react";
import "../styles/index.css";
import classes from "./FormComponent.module.css";
import cn from "classnames";
import type { FormComponent as IFormComponent } from "../types/FormComponent";
import { Button } from "@digdir/design-system-react";
import { ComponentPreview } from "../containers/ComponentPreview";
import { ComponentType } from "app-shared/types/ComponentType";
import { ConnectDragSource } from "react-dnd";
import { DEFAULT_LANGUAGE } from "app-shared/constants";
import { DragHandle } from "./dragAndDrop/DragHandle";
import { ITextResource } from "app-shared/types/global";
import { MonitorIcon, TrashIcon } from "@navikt/aksel-icons";
import { formItemConfigs } from "../data/formItemConfig";
import {
  getComponentTitleByComponentType,
  getTextResource,
  truncate,
} from "../utils/language";
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from "../selectors/formLayoutSelectors";
import { textResourcesByLanguageSelector } from "../selectors/textResourceSelectors";
import { useDeleteFormComponentMutation } from "../hooks/mutations/useDeleteFormComponentMutation";
import { useTextResourcesSelector } from "../hooks";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AltinnConfirmDialog } from "app-shared/components";

export interface IFormComponentProps {
  component: IFormComponent;
  dragHandleRef?: ConnectDragSource;
  handleDiscard: () => void;
  handleEdit: (component: IFormComponent) => void;
  handleSave: () => Promise<void>;
  debounceSave: () => void;
  id: string;
  isEditMode: boolean;
}

export const FormComponent = memo(function FormComponent({
  component,
  dragHandleRef,
  handleDiscard,
  handleEdit,
  handleSave,
  debounceSave,
  id,
  isEditMode,
}: IFormComponentProps) {
  const { t } = useTranslation();
  const { org, app } = useParams();

  const textResources: ITextResource[] = useTextResourcesSelector<
    ITextResource[]
  >(textResourcesByLanguageSelector(DEFAULT_LANGUAGE));
  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const selectedLayoutSetName = useSelector(selectedLayoutSetSelector);
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] =
    useState<boolean>();

  const { mutate: deleteFormComponent } = useDeleteFormComponentMutation(
    org,
    app,
    selectedLayoutSetName
  );

  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  const previewableComponents = [
    ComponentType.Checkboxes,
    ComponentType.RadioButtons,
    ComponentType.Button,
    ComponentType.NavigationButtons,
  ]; // Todo: Remove this when all components become previewable. Until then, add components to this list when implementing preview mode.

  const isPreviewable = previewableComponents.includes(
    component?.type as ComponentType
  );

  const handleDelete = (): void => {
    deleteFormComponent(id);
    if (isEditMode) handleDiscard();
  };

  const handlePreview = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsPreviewMode((previous) => !previous);
  };

  const textResource = !isPreviewMode
    ? getTextResource(component.textResourceBindings?.title, textResources)
    : null;

  return (
    <div
      className={cn(
        classes.wrapper,
        isEditMode && classes.editMode,
        isPreviewMode && classes.previewMode
      )}
      role="listitem"
      onClick={async (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        if (isEditMode) return;
        await handleSave();
        handleEdit(component);
      }}
    >
      <div className={classes.formComponentWithHandle}>
        <div ref={dragHandleRef} className={classes.dragHandle}>
          <DragHandle />
        </div>
        <div className={classes.formComponent} tabIndex={0}>
          {isPreviewMode ? (
            <ComponentPreview
              component={component}
              handleComponentChange={async (updatedComponent) => {
                handleEdit(updatedComponent);
                debounceSave();
              }}
              layoutName={selectedLayout}
            />
          ) : (
            <div className={classes.formComponentTitle}>
              <i
                className={
                  formItemConfigs?.[component.type]?.icon || "fa fa-help-circle"
                }
              />
              {textResource
                ? truncate(textResource, 80)
                : getComponentTitleByComponentType(component.type, t) ||
                  t("ux_editor.component_unknown")}
            </div>
          )}
        </div>
      </div>
      <div className={classes.buttons}>
        <AltinnConfirmDialog
          open={isConfirmDeleteDialogOpen}
          confirmText={t("ux_editor.component_deletion_confirm")}
          onConfirm={handleDelete}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          trigger={
            <Button
              data-testid="component-delete-button"
              color="secondary"
              icon={<TrashIcon />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                setIsConfirmDeleteDialogOpen((prevState) => !prevState);
              }}
              tabIndex={0}
              title={t("general.delete")}
              variant="quiet"
              size="small"
            />
          }
        >
          <p>{t("ux_editor.component_deletion_text")}</p>
        </AltinnConfirmDialog>
        {isPreviewable && (
          <Button
            color="secondary"
            icon={<MonitorIcon title={t("general.preview")} />}
            onClick={handlePreview}
            title="Forhåndsvisning (under utvikling)"
            variant="quiet"
            size="small"
          />
        )}
      </div>
    </div>
  );
});
