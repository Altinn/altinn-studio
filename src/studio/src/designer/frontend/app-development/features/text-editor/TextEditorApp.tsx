import * as React from "react";
import { createTheme, makeStyles, Theme } from "@material-ui/core";

import altinnTheme from "app-shared/theme/altinnStudioTheme";

import useLanguages from "./hooks/useLanguages";
import Header from "./components/Header";
import Editor from "./components/Editor";
import useFetch from "./hooks/useFetch";
import { getResourcesResponse, getResourcesUrl, getSaveResourcesUrl, saveResourcesRequest } from "./api";
import usePost from "./hooks/usePost";

const useTheme = createTheme(altinnTheme);

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    [theme.breakpoints.up("md")]: {
      paddingLeft: theme.sharedStyles.mainPaddingLeft,
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
  // TODO: Handle post errors

  if (lang.loading || resources.loading) {
    return (
      <div className={styles.root}>Loading TextEditorApp</div>
    );
  }
  if (lang.error) return <div className={styles.root}>Error loading lang</div>;
  if(resources.error) return <div className={styles.root}>Error loading resources</div>
  
  return (
    <div className={styles.root}>
      <Header cultureData={lang.data} />
      <Editor cultureData={lang.data} resources={resources.data} doPost={postHelper.doPost} />
    </div>
  );
};

export default TextEditorApp;
