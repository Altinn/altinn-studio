import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import classes from "./PageConfigPanel.module.css";
import { Accordion, Heading, HelpText } from '@digdir/design-system-react';
import { FileIcon, KeyVerticalIcon } from '@navikt/aksel-icons';
import {TextResource} from "../../TextResource";
import {useSelectedFormLayoutWithName, useText} from "../../../hooks";
import {useStudioUrlParams} from "app-shared/hooks/useStudioUrlParams";
import {useAppContext} from "../../../hooks/useAppContext";
import {getCurrentEditId} from "../../../selectors/textResourceSelectors";
import {TextResourceEdit} from "../../TextResourceEdit";
import { StudioToggleableTextfieldSchema, Expression } from '@studio/components';
import {useLayoutSchemaQuery} from "../../../hooks/queries/useLayoutSchemaQuery";
import { Trans } from 'react-i18next';
import {ExpressionContent} from "../../config/Expressions/ExpressionContent";
import {useFormLayoutMutation} from "../../../hooks/mutations/useFormLayoutMutation";
import type {IInternalLayout} from "../../../types/global";
import {deepCopy} from "app-shared/pure";
import {useUpdateLayoutNameMutation} from "../../../hooks/mutations/useUpdateLayoutNameMutation";
import {getPageNameErrorKey} from "../../../utils/designViewUtils";
import {useFormLayoutSettingsQuery} from "../../../hooks/queries/useFormLayoutSettingsQuery";
import { useSearchParams } from 'react-router-dom';
import {useTextResourcesQuery} from "app-shared/hooks/queries";
import {DEFAULT_LANGUAGE, DEFAULT_SELECTED_LAYOUT_NAME} from "app-shared/constants";
import type {TextResourceIdMutation} from "@altinn/text-editor/src/types";
import {
    useTextIdMutation,
} from 'app-development/hooks/mutations';

export const PageConfigPanel = () => {
    const { app, org } = useStudioUrlParams();
    const { layout, layoutName } = useSelectedFormLayoutWithName();
    const { selectedLayoutSet } = useAppContext();
    const t = useText();
    const editId = useSelector(getCurrentEditId);
    const { data: textResources } = useTextResourcesQuery(org, app);
    const [{ data: layoutSchema }, { data: expressionSchema }] =
        useLayoutSchemaQuery();
    const { mutateAsync: saveLayout } = useFormLayoutMutation(org, app, layoutName, selectedLayoutSet);
    const { mutate: updateLayoutName } = useUpdateLayoutNameMutation(org, app, selectedLayoutSet);
    const { mutate: textIdMutation } = useTextIdMutation(org, app);
    const [openList, setOpenList] = useState<string[]>([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const { data: formLayoutSettings } = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
    
    const layoutIsSelected = layoutName !== DEFAULT_SELECTED_LAYOUT_NAME && layoutName !== undefined;
    const layoutOrder = formLayoutSettings?.pages.order;
    const layoutNameFromTextResource = Object.values(textResources[DEFAULT_LANGUAGE]).find(textResource => textResource.id === layoutName)?.value;
    
    const handleChangeHiddenExpressionOnLayout = async (expression: Expression) => {
        const updatedLayout: IInternalLayout = deepCopy(layout);
        await saveLayout({...updatedLayout, hidden: expression});
    }
    
    const handleDeleteHiddenExpressionOnLayout = async () => {
        const updatedLayout: IInternalLayout = deepCopy(layout);
        await saveLayout({...updatedLayout, hidden: undefined});
    };

    const toggleOpen = (id: string) => {
        if (openList.includes(id)) {
            setOpenList(openList.filter((item) => item !== id));
        } else {
            setOpenList([...openList, id]);
        }
    };

    const handleSaveNewName = (newName: string) => {
        updateLayoutName({ oldName: layoutName, newName });
        setSearchParams({ ...deepCopy(searchParams), layout: newName });
        updateTextId({oldId: layoutName, newId: newName});
    };

    const updateTextId = ({ oldId, newId }: TextResourceIdMutation) => {
        try {
            textIdMutation([{ oldId, newId }]);
        } catch (e: unknown) {
            console.error('Renaming text-id failed:\n', e);
        }
    };
   
    return  (
        <>
            <div className={classes.header}>
                <FileIcon fontSize='24'/>
                <Heading size='xxsmall' level={2}>
                    {!layoutIsSelected ? t('right_menu.content_empty')
                    : layoutNameFromTextResource ?? layoutName}
                </Heading>
                <HelpText title={''} className={classes.helpText}>{}</HelpText>
            </div>
            {layoutIsSelected &&
                <>
            <div className={classes.changePageId}>
            <StudioToggleableTextfieldSchema
                layoutSchema={layoutSchema}
                relatedSchemas={[expressionSchema, ]}
                propertyPath=''
                viewProps={{
                    children: `ID: ${layoutName}`,
                    variant: 'tertiary',
                    fullWidth: true,
                }}
                inputProps={{
                    icon: <KeyVerticalIcon />,
                    value: layoutName,
                    onBlur: (event) => handleSaveNewName(event.target.value),
                    size: 'small',
                }}
                customValidation={(value: string) => {return t(getPageNameErrorKey(value, layoutName, layoutOrder))}}
            />
            </div>
            <Accordion color='subtle'>
                <Accordion.Item open={openList.includes('text')}>
                    <Accordion.Header onHeaderClick={() => toggleOpen('text')}>
                        {t('right_menu.text')}
                    </Accordion.Header>
                    <Accordion.Content>
                        {editId ? <TextResourceEdit/> :
                            <TextResource
                                handleIdChange={() => {}}
                                label={t('ux_editor.modal_properties_textResourceBindings_page_name')}
                                placeholder={t('ux_editor.modal_properties_textResourceBindings_page_name_add')}
                                textResourceId={layoutName}
                            />}
                    </Accordion.Content>
                </Accordion.Item>
                <Accordion.Item open={openList.includes('dynamics')}>
                    <Accordion.Header onHeaderClick={() => toggleOpen('dynamics')}>
                        {t('right_menu.dynamics')}
                    </Accordion.Header>
                    <Accordion.Content>
                        <ExpressionContent
                            expression={layout.hidden ?? null}
                            heading={<Trans
                                i18nKey={'right_menu.expressions_property_preview_hidden'}
                                values={{ componentName: layoutName }}
                                components={{ bold: <strong /> }}
                            />}
                            onChange={(expression) => handleChangeHiddenExpressionOnLayout(expression)}
                            onDelete={() => handleDeleteHiddenExpressionOnLayout()}
                        />
                    </Accordion.Content>
                </Accordion.Item>
            </Accordion>
                </>}
        </>);
}