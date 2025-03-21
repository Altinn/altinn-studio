import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioLabelAsParagraph } from '@studio/components-legacy';
import { PolicyAccessPackageAccordion } from '../PolicyAccessPackageAccordion';
import { filterAccessPackagesById, flatMapAreaPackageList } from '../policyAccessPackageUtils';
import type {
  PolicyAccessPackage,
  PolicyAccessPackageArea,
} from 'app-shared/types/PolicyAccessPackages';

export type ChosenAccessPackagesProps = {
  chosenAccessPackages: string[];
  groupedAccessPackagesByArea: PolicyAccessPackageArea[];
  handleSelectAccessPackage: (accessPackageUrn: string) => void;
};
export const ChosenAccessPackages = ({
  chosenAccessPackages,
  groupedAccessPackagesByArea,
  handleSelectAccessPackage,
}: ChosenAccessPackagesProps): ReactElement => {
  const { t } = useTranslation();

  const flatMappedAreaList: PolicyAccessPackage[] = flatMapAreaPackageList(
    groupedAccessPackagesByArea,
  );
  const selectedAccessPackageList: PolicyAccessPackage[] = filterAccessPackagesById(
    flatMappedAreaList,
    chosenAccessPackages,
  );

  if (chosenAccessPackages.length > 0) {
    return (
      <>
        <StudioLabelAsParagraph size='xs' spacing>
          {t('policy_editor.access_package_chosen_packages')}
        </StudioLabelAsParagraph>
        {selectedAccessPackageList.map((accessPackage: PolicyAccessPackage) => {
          return (
            <PolicyAccessPackageAccordion
              key={accessPackage.urn}
              accessPackage={accessPackage}
              isChecked={true}
              handleSelectChange={handleSelectAccessPackage}
            />
          );
        })}
      </>
    );
  }
  return null;
};
