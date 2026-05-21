import classes from './DisplayText.module.css';

export type DisplayTextProps = {
  value: string;
  iconUrl?: string;
  iconAltText?: string;
  labelId?: string;
};

export function DisplayText({ value, iconUrl, iconAltText, labelId }: DisplayTextProps) {
  return (
    <>
      {iconUrl && <img src={iconUrl} className={classes.icon} alt={iconAltText} />}
      <span aria-labelledby={labelId}>{value}</span>
    </>
  );
}
