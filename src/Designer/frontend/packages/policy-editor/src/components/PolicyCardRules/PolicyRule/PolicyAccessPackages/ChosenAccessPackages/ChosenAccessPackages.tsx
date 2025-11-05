import React, { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioLabelAsParagraph } from '@studio/components';
import { PolicyAccessPackageAccordion } from '../PolicyAccessPackageAccordion';
import { flatMapAreaPackageList } from '../policyAccessPackageUtils';
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

  const createUnknownAccessPackageData = (urn: string): PolicyAccessPackage => {
    return {
      id: urn,
      urn,
      name: t('policy_editor.access_package_unknown_heading'),
      description: t('policy_editor.access_package_unknown_description', {
        accessPackageUrn: urn,
      }),
      isDelegable: true,
    };
  };

  if (chosenAccessPackages.length > 0) {
    return (
      <>
        <StudioLabelAsParagraph data-size='xs'>
          {t('policy_editor.access_package_chosen_packages')}
        </StudioLabelAsParagraph>
        {chosenAccessPackages.map((accessPackageUrn: string) => {
          const chosenAccessPackage = flatMappedAreaList.find(
            (accessPackage) => accessPackage.urn === accessPackageUrn,
          );
          const accessPackageData =
            chosenAccessPackage ?? createUnknownAccessPackageData(accessPackageUrn);

          return (
            <PolicyAccessPackageAccordion
              key={accessPackageData.urn}
              accessPackage={accessPackageData}
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
