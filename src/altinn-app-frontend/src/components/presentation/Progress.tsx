import React from "react";
import { CircularProgress } from "@altinn/altinn-design-system";
import { useAppSelector } from "src/common/hooks";
import { getTextFromAppOrDefault } from "src/utils/textResource";

export const Progress = () => {
  const currentPageId = useAppSelector(
    (state) => state.formLayout.uiConfig.currentView
  );
  const pageIds = useAppSelector(
    (state) => state.formLayout.uiConfig.layoutOrder
  );
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector(
    (state) => state.textResources.resources
  );

  const currentPageIndex =
    pageIds.findIndex((page) => page === currentPageId) + 1;
  const numberOfPages = pageIds.length;
  const labelText = `${currentPageIndex}/${numberOfPages}`;
  const value = (currentPageIndex / numberOfPages) * 100;

  return (
    <CircularProgress
      value={value}
      id={"progress"}
      label={labelText}
      ariaLabel={getTextFromAppOrDefault(
        "general.progress",
        textResources,
        language,
        [currentPageIndex.toString(), numberOfPages.toString()],
        true
      )}
    />
  );
};
