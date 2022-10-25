import { useSelector } from "react-redux";
import { IAppState } from "../../types/global";
import { renderSelectTextFromResources } from "../../utils/render"
import { IGenericEditComponent } from "./componentConfig"

export const EditDescription = ({ component, handleComponentChange }: IGenericEditComponent) => {
  const language = useSelector((state: IAppState) => state.appData.languageState.language);
  const textResources = useSelector((state: IAppState) => state.appData.textResources.resources);

  const handleDescriptionChange = (e: any) => {
    const selectedDescription = e.value;
    handleComponentChange({
      ...component,
      textResourceBindings: {
        ...component.textResourceBindings,
        description: selectedDescription,
      }
    });
  }

  return renderSelectTextFromResources(
    'modal_properties_description_helper',
    handleDescriptionChange,
    textResources,
    language,
    component.textResourceBindings?.description,
    component.textResourceBindings?.description,
  )
}
