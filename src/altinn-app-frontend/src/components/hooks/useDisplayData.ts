import { useEffect, useState } from "react";
import type { IFormDataState } from "src/features/form/data/formDataReducer";

export const useDisplayData = ({
  formData,
}: Partial<IFormDataState> | { formData: string | string[] }) => {
  const [displayData, setDisplayData] = useState("");
  useEffect(() => {
    if (formData && typeof formData === "object") {
      let displayString = "";
      Object.keys(formData).forEach((key, index) => {
        displayString += `${index > 0 ? " " : ""}${formData[key]}`;
      });
      setDisplayData(displayString);
    } else {
      setDisplayData((formData as string) || "");
    }
  }, [formData, setDisplayData]);
  return displayData;
};
