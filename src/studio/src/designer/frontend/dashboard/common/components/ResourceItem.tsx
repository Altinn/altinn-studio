import { Grid } from "@mui/material";
import React = require("react");

export interface ResourceItemProps {
  link: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

export function ResourceItem({ link, label, description, icon }: ResourceItemProps) {
  return (
    <Grid container direction='row' alignItems='center' justifyContent='center' alignContent='left'
      style={{ maxWidth: 500 }}
    >
      <Grid xs={2} item>
        {icon}
      </Grid>
      <Grid xs={10} item container direction='column' spacing={0} alignContent='center'>
        <Grid item>
          <a href={link}><p>{label} </p> </a>
          <p>{description}</p>
        </Grid>
      </Grid>
    </Grid>
  )
}
