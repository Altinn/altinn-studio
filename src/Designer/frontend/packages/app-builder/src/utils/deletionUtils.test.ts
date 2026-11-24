import { describe, expect, it } from 'vitest';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { LayoutComponent, PageLayout } from '../types';
import {
  findRuleReferences,
  getDeletionCandidates,
  getOwnFieldNames,
  getOwnTextKeys,
} from './deletionUtils';
import type { AllLayouts, DeletionContext } from './deletionUtils';

// Layout files can hold expressions and plain-string bindings, which the shared type does not allow.
const asComponent = (component: Record<string, unknown>): LayoutComponent =>
  component as LayoutComponent;

const input: LayoutComponent = {
  id: 'Input-1',
  type: ComponentType.Input,
  textResourceBindings: { title: 'Side1.Input-1.title', description: 'shared.description' },
  dataModelBindings: { simpleBinding: { field: 'fornavn', dataType: 'model' } },
};
const otherInput = asComponent({
  id: 'Input-2',
  type: ComponentType.Input,
  textResourceBindings: { title: 'shared.description' },
  dataModelBindings: { simpleBinding: 'etternavn' },
});

const createLayout = (components: LayoutComponent[]): PageLayout => ({
  $schema: '',
  data: { layout: components },
});

const schema: JsonSchema = {
  properties: { fornavn: { type: 'string' }, etternavn: { type: 'string' } },
};

const createContext = (overrides: Partial<DeletionContext> = {}): DeletionContext => ({
  components: [input],
  layoutSetName: 'form',
  pageName: 'Side1',
  allLayouts: { form: { Side1: createLayout([input, otherInput]) } },
  existingTextKeys: ['Side1.Input-1.title', 'shared.description'],
  dataModel: { dataType: 'model', schema },
  ...overrides,
});

describe('getDeletionCandidates', () => {
  it('selects texts that only this component uses', () => {
    const { texts } = getDeletionCandidates(createContext());
    expect(texts.find(({ name }) => name === 'Side1.Input-1.title')).toMatchObject({
      usedBy: [],
      isSelectedByDefault: true,
    });
  });

  it('keeps texts that another component uses, and says which', () => {
    const { texts } = getDeletionCandidates(createContext());
    const sharedText = texts.find(({ name }) => name === 'shared.description');
    expect(sharedText.isSelectedByDefault).toBe(false);
    expect(sharedText.usedBy.map(({ component }) => component.id)).toEqual(['Input-2']);
  });

  it('counts a text used in an expression in another layout set', () => {
    const expressionUser = asComponent({
      id: 'Paragraph-1',
      type: ComponentType.Paragraph,
      textResourceBindings: { title: ['if', true, ['text', 'Side1.Input-1.title'], 'x'] },
    });
    const allLayouts: AllLayouts = {
      form: { Side1: createLayout([input]) },
      receipt: { Kvittering: createLayout([expressionUser]) },
    };
    const { texts } = getDeletionCandidates(createContext({ allLayouts }));
    const title = texts.find(({ name }) => name === 'Side1.Input-1.title');
    expect(title.usedBy).toEqual([
      { layoutSetName: 'receipt', pageName: 'Kvittering', component: expressionUser },
    ]);
  });

  it('does not select an unused text that the builder did not make for the component', () => {
    const unusedShared = asComponent({ ...input, textResourceBindings: { title: 'appName' } });
    const { texts } = getDeletionCandidates(
      createContext({
        components: [unusedShared],
        allLayouts: { form: { Side1: createLayout([unusedShared]) } },
        existingTextKeys: ['appName'],
      }),
    );
    expect(texts).toEqual([{ name: 'appName', usedBy: [], isSelectedByDefault: false }]);
  });

  it('does not select a text named after another component or another page', () => {
    const borrowed = asComponent({
      ...input,
      textResourceBindings: { title: 'Side1.Input-9.title', description: 'Side2.Input-1.title' },
    });
    const { texts } = getDeletionCandidates(
      createContext({
        components: [borrowed],
        allLayouts: { form: { Side1: createLayout([borrowed]) } },
        existingTextKeys: ['Side1.Input-9.title', 'Side2.Input-1.title'],
      }),
    );
    expect(texts.map(({ isSelectedByDefault }) => isSelectedByDefault)).toEqual([false, false]);
  });

  it('leaves out texts that do not exist', () => {
    const { texts } = getDeletionCandidates(createContext({ existingTextKeys: [] }));
    expect(texts).toEqual([]);
  });

  it('offers a field that only this component uses, without selecting it', () => {
    const { fields } = getDeletionCandidates(createContext());
    expect(fields).toEqual([{ name: 'fornavn', usedBy: [], isSelectedByDefault: false }]);
  });

  it('keeps a field that another component binds to or reads in an expression', () => {
    const sameField = asComponent({
      ...otherInput,
      dataModelBindings: { simpleBinding: 'fornavn' },
    });
    const expressionUser: LayoutComponent = {
      id: 'Heading-1',
      type: ComponentType.Heading,
      hidden: ['equals', ['dataModel', 'fornavn'], ''],
    };
    for (const user of [sameField, expressionUser]) {
      const allLayouts: AllLayouts = { form: { Side1: createLayout([input, user]) } };
      const { fields } = getDeletionCandidates(createContext({ allLayouts }));
      expect(fields[0].isSelectedByDefault).toBe(false);
      expect(fields[0].usedBy.map(({ component }) => component.id)).toEqual([user.id]);
    }
  });

  it('has no fields when there is no data model', () => {
    const { fields } = getDeletionCandidates(createContext({ dataModel: undefined }));
    expect(fields).toEqual([]);
  });
});

describe('getDeletionCandidates for several components', () => {
  it('offers what only the deleted components use, together with extra texts', () => {
    const { texts, fields } = getDeletionCandidates(
      createContext({
        components: [input, otherInput],
        extraTextKeys: ['Side1'],
        deletedPageName: 'Side1',
        existingTextKeys: ['Side1.Input-1.title', 'shared.description', 'Side1'],
      }),
    );
    expect(texts.map(({ name, isSelectedByDefault }) => [name, isSelectedByDefault])).toEqual([
      ['Side1.Input-1.title', true],
      ['shared.description', false],
      ['Side1', true],
    ]);
    expect(fields.map(({ name }) => name)).toEqual(['fornavn', 'etternavn']);
  });

  it('keeps the title of a deleted page when another layout set has a page with the same name', () => {
    const { texts } = getDeletionCandidates(
      createContext({
        components: [input],
        extraTextKeys: ['Side1'],
        deletedPageName: 'Side1',
        allLayouts: {
          form: { Side1: createLayout([input]) },
          other: { Side1: createLayout([]) },
        },
        existingTextKeys: ['Side1.Input-1.title', 'Side1'],
      }),
    );
    expect(texts.find(({ name }) => name === 'Side1').isSelectedByDefault).toBe(false);
  });
});

describe('findRuleReferences', () => {
  const rule = ['equals', ['component', 'Input-1'], 'x'];
  const ruled = asComponent({ id: 'Paragraph-1', type: ComponentType.Paragraph, hidden: rule });

  it('finds components and pages whose rules check a deleted component', () => {
    const conditionalPage: PageLayout = {
      $schema: '',
      data: { layout: [], hidden: rule as unknown as boolean },
    };
    const layouts = { Side1: createLayout([input, ruled]), Side2: conditionalPage };
    expect(findRuleReferences(layouts, new Set(['Input-1']))).toEqual([
      { pageName: 'Side1', component: ruled },
      { pageName: 'Side2' },
    ]);
  });

  it('leaves out the deleted page and the deleted components', () => {
    const layouts = { Side1: createLayout([input, ruled]) };
    expect(findRuleReferences(layouts, new Set(['Input-1', 'Paragraph-1']))).toEqual([]);
    expect(findRuleReferences(layouts, new Set(['Input-1']), 'Side1')).toEqual([]);
  });
});

describe('getOwnTextKeys', () => {
  it('returns text bindings and option texts once each', () => {
    const checkboxes: LayoutComponent = {
      id: 'Checkboxes-1',
      type: ComponentType.Checkboxes,
      textResourceBindings: { title: 'title' },
      options: [
        { value: '1', label: 'option1', description: 'title' },
        { value: '2', label: 'option2' },
      ],
    };
    expect(getOwnTextKeys(checkboxes)).toEqual(['title', 'option1', 'option2']);
  });
});

describe('getOwnFieldNames', () => {
  it('returns fields in the given data model, and fields without a data type', () => {
    const component = asComponent({
      id: 'Address-1',
      type: ComponentType.Address,
      dataModelBindings: {
        address: { field: 'adresse', dataType: 'model' },
        zipCode: 'postnr',
        postPlace: { field: 'poststed', dataType: 'other' },
      },
    });
    expect(getOwnFieldNames(component, 'model')).toEqual(['adresse', 'postnr']);
  });
});
