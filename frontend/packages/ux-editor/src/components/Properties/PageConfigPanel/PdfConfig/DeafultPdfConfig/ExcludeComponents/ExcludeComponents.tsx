import classes from '@altinn/ux-editor/components/Properties/PageConfigPanel/PdfConfig/PdfConfig.module.css';
import { Combobox } from '@digdir/designsystemet-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { usePdf } from '@altinn/ux-editor/hooks/usePdf/usePdf';

export const ExcludeComponents = () => {
  const { t } = useTranslation();
  const {
    componentsInCurrentLayoutToExcludeFromPdf,
    componentIdsInCurrentLayout,
    excludeComponentsFromPdf,
  } = usePdf();

  return (
    <Combobox
      className={classes.excludeComponents}
      size='small'
      label={t('ux_editor.page_config_pdf_exclude_components_from_default_pdf')}
      value={componentsInCurrentLayoutToExcludeFromPdf}
      onValueChange={(componentsToExclude: string[]) => {
        if (
          !(
            componentsToExclude.every((comp) =>
              componentsInCurrentLayoutToExcludeFromPdf.includes(comp),
            ) && componentsToExclude.length === componentsInCurrentLayoutToExcludeFromPdf.length
          )
        )
          excludeComponentsFromPdf(componentsToExclude); // Can I only call this without the check?
      }}
      multiple
    >
      {componentIdsInCurrentLayout.map((componentId) => (
        <Combobox.Option
          key={componentId}
          value={componentId}
          description={componentId}
          displayValue={componentId}
        />
      ))}
    </Combobox>
  );
};
