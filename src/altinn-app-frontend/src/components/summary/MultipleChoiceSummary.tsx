import {
  Grid,
  List,
  ListItem,
  ListItemText,
  makeStyles,
} from "@material-ui/core";
import * as React from "react";
import SummaryBoilerplate from "src/components/summary/SummaryBoilerplate";

export interface IMultipleChoiceSummaryProps {
  formData: any;
  label: any;
  hasValidationMessages: boolean;
  changeText: any;
  onChangeClick: () => void;
  readOnlyComponent?: boolean;
}

const useStyles = makeStyles({
  row: {
    borderBottom: "1px dashed #008FD6",
    marginBottom: 10,
    paddingBottom: 10,
  },
  list: {
    paddingLeft: 0,
    paddingRight: 0,
  },
});

export default function MultipleChoiceSummary({
  formData,
  label,
  hasValidationMessages,
  changeText,
  onChangeClick,
  readOnlyComponent,
}: IMultipleChoiceSummaryProps) {
  const classes = useStyles();

  return (
    <>
      <SummaryBoilerplate
        changeText={changeText}
        onChangeClick={onChangeClick}
        label={label}
        hasValidationMessages={hasValidationMessages}
        readOnlyComponent={readOnlyComponent}
      />
      <Grid
        item
        xs={12}
        data-testid={"multiple-choice-summary"}
      >
        <List>
          {formData &&
            Object.keys(formData).map((key) => (
              <ListItem
                key={key}
                classes={{ root: classes.list }}
              >
                <ListItemText
                  id={key}
                  primary={formData[key]}
                />
              </ListItem>
            ))}
        </List>
      </Grid>
    </>
  );
}
