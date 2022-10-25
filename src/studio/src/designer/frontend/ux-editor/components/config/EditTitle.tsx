import { useSelector } from "react-redux";
import { IAppState } from "../../types/global";
import { renderSelectTextFromResources } from "../../utils/render"
import { IGenericEditComponent } from "./componentConfig"

export const EditTitle = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const language = useSelector((state: IAppState) => state.appData.languageState.language);
  const textResources = useSelector((state: IAppState) => state.appData.textResources.resources);

  const handleTitleChange = (e: any) => {
    const selectedTitle = e.value;
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        title: selectedTitle,
      }
    });
  }

  return renderSelectTextFromResources(
    'modal_properties_label_helper',
    handleTitleChange,
    textResources,
    language,
    component.textResourceBindings?.title,
    component.textResourceBindings?.title,
  )
}
