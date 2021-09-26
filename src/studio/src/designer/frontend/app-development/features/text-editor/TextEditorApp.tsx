import * as React from "react";
import { createTheme, makeStyles, Theme } from "@material-ui/core";

import altinnTheme from "app-shared/theme/altinnStudioTheme";

import useLanguages from "./hooks/useLanguages";
import Header from "./components/Header";
import Editor from "./components/Editor";
import useFetch from "./hooks/useFetch";
import { getResourcesResponse, getResourcesUrl, getSaveResourcesUrl, saveResourcesRequest } from "./api";
import usePost from "./hooks/usePost";
import useEditArray from "./hooks/useEditArray";

const useTheme = createTheme(altinnTheme);

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    [theme.breakpoints.up("md")]: {
      paddingLeft: altinnTheme.sharedStyles.mainPaddingLeft,
    },
    flexGrow: 1,
    // height: "calc(100vh - 110px)",
    // overflowY: "hidden",
  },
}));

const TextEditorApp = (): JSX.Element => {
  const styles = useStyles(useTheme);
  const lang = useLanguages();
  const resources = useFetch<getResourcesResponse>(getResourcesUrl());
  const postHelper = usePost<saveResourcesRequest>(getSaveResourcesUrl())
  // TODO: Handle post and delete errors

  const { data, updateCell, addNewId, deleteId, state: editArrayState } = useEditArray(resources.data)


  if (lang.loading || resources.loading) {
    return (
      <div className={styles.root}>Loading TextEditorApp</div>
    );
  }
  if (lang.error) return <div className={styles.root}>Error loading lang</div>;
  if (resources.error) return <div className={styles.root}>Error loading resources</div>

  return (
    <div className={styles.root}>
          <Header cultureData={lang.data} addLanguage={lang.addLanguage} removeLanguage={lang.removeLanguage} />
          <Editor cultureData={lang.data} data={data} updateCell={updateCell} addNewId={addNewId} deleteId={deleteId} save={() => postHelper.doPost(editArrayState)} />
    </div>
  );
};

export default TextEditorApp;
