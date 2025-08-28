# Policy Editor

This is the `policy editor`-package. The package is supposed to render an editor component
that can be used to view and modify policies for apps and resources. The editor displays all
rules available in the policy, and makes it possible to add more rules, delete rules, and
clone rules.
The editor makes use of a list of possible actions, as well as a list of possible subjects,
that can be assigned to the policy, which must be provided through its props when using the
component.

## Usage

```tsx
import {
  PolicyEditor,
  PolicyAction,
  Policy,
  PolicySubject,
} from '@altinn/policy-editor';

const exampleActions: PolicyAction[] = [
  { actionId: 'read', actionTitle: 'Les', actionDescription: null },
  { actionId: 'write', actionTitle: 'Skriv', actionDescription: null },
  { actionId: 'delete', actionTitle: 'Slett', actionDescription: null },
];

const exampleSubjects: PolicySubject[] = [
  {
    subjectDescription: 'Daglig leder fra enhetsregisteret',
    subjectId: 'DAGL',
    subjectSource: 'altinn:rolecode',
    subjectTitle: 'Daglig leder',
  },
  {
    subjectDescription: 'Regnskapsfører',
    subjectId: 'REGNA',
    subjectSource: 'altinn:rolecode',
    subjectTitle: 'Regnskapsfører',
  },
];

const examplePolicyData: Policy = {
    requiredAuthenticationLevelEndUser: '3',
    requiredAuthenticationLevelOrg: '3',
    rules: [
      ruleId: 'urn:altinn:example:ruleid:1',
      description: 'Policy description',
      actions: ['read', 'write'],
      resources:['urn:altinn:org:[ORG]', 'urn:altinn:app:[APP]'],
      subject: ['urn:altinn:rolecode:DAGL'],
    ],
  };

export const MyComponent = () => {
  const handleSavePolicy = (policy: Policy) => {}

  return (
    <PolicyEditor
      policy={examplePolicyData}
      actions={exampleActions}
      subjects={exampleSubjects}
      onSave={handleSavePolicy}
      showAllErrors={false}
      usageType='app'
    />
  );
};
```

## Props documentation

This is all the possible props of the component.

#### policy

- Type: `Policy`
- Description: The policy to be shown an modified. The object looks the same as it does
  in its usage in backend, and when it is received through an API.

#### actions

- Type: `PolicyAction[]`
- Description: A list of the possible actions that can be given to a specific rule inside
  a policy.

#### Subjects

- Type: `PolicySubject[]`
- Description: A list of the possible subjects that can be given to a specific rule inside
  a policy.

#### resourceId

- Type: `string`
- Description: Optional field. The ID of the resource the policy belongs to if the usage
  of the component is for resources.

#### onSave

- Type: `function`
- Description: Function that receives a policy of the Policy type as property,
  and can be used to save the policy. The policy is saved when the user navigates away from
  a field in the editor.

#### showAllErrors

- Type: `boolean`
- Description: A flag to decide when errors in the policy editor should be shown. Example
  of errors are that a rule is missing actions and subjects. Example of when this flag might
  be set to true is when a user navigates to another page and you want to hightlight to the
  user that there are errors in the policy.

#### usageType

- Type: `PolicyEditorUsage`
- Description: The type of parent app using the policy editor. Currently the two options
  are 'app' and 'resource'
