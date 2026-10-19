export type CostOrgOption = {
  value: string;
  label: string;
};

/**
 * Lets the user choose which organization pays for the assistant's usage.
 * Only provided when the repository is not owned by an organization.
 */
export type CostOrgSelection = {
  options: CostOrgOption[];
  selected: string;
  onChange: (costOrg: string) => void;
};
