import {
  getUpdatedRules,
  getActionOptions,
  getPolicyRuleIdString,
  getCcrSubjects,
  getAltinnSubjects,
  getOtherSubjects,
} from './index';
import {
  mockActionId1,
  mockActionId2,
  mockActionId3,
  mockActionId4,
  mockActions,
} from '../../../test/mocks/policyActionMocks';
import {
  mockPolicyRuleCard1,
  mockPolicyRuleCard2,
  mockPolicyRuleCards,
  mockRuleId1,
} from '../../../test/mocks/policyRuleMocks';
import { policySubjectOrg } from '..';

describe('PolicyRuleUtils', () => {
  describe('getUpdatedRules', () => {
    it('should update a rule in the list', () => {
      const updatedRule = { ...mockPolicyRuleCard1, description: 'Updated Rule' };
      const updatedRules = getUpdatedRules(
        updatedRule,
        mockPolicyRuleCard1.ruleId,
        mockPolicyRuleCards,
      );

      expect(updatedRules.length).toBe(2);
      expect(updatedRules[0].description).toBe('Updated Rule');
    });

    it('should handle updating a rule that does not exist', () => {
      const updatedRule = { ...mockPolicyRuleCard1, description: 'Updated Rule' };
      const updatedRules = getUpdatedRules(updatedRule, '789', mockPolicyRuleCards);

      expect(updatedRules.length).toBe(2);
      expect(updatedRules[0].description).toBe(mockPolicyRuleCard1.description);
    });
  });

  describe('getActionOptions', () => {
    it('should return action options not included in the policy rule', () => {
      const actionOptions = getActionOptions(mockActions, mockPolicyRuleCard1);

      expect(actionOptions.length).toBe(1); // Action 1 and action 2 are removed
      expect(actionOptions.map((a) => a.value)).toEqual([mockActionId3]); // 3 not in the rule
    });

    it('should return all action options if none are included in the policy rule', () => {
      const actionOptions = getActionOptions(mockActions, mockPolicyRuleCard2);

      expect(actionOptions.length).toBe(4);
      expect(actionOptions.map((a) => a.value)).toEqual([
        mockActionId1,
        mockActionId2,
        mockActionId3,
        mockActionId4,
      ]);
    });

    it('should return an empty array if all actions are included in the policy rule', () => {
      const actionOptions = getActionOptions(mockActions, {
        ...mockPolicyRuleCard1,
        actions: [mockActionId1, mockActionId2, mockActionId3, mockActionId4],
      });

      expect(actionOptions.length).toBe(0);
    });
  });

  describe('getPolicyRuleIdString', () => {
    it('should return the string representation of the rule ID', () => {
      const ruleIdString = getPolicyRuleIdString(mockPolicyRuleCard1);

      expect(ruleIdString).toBe(mockRuleId1.split(':').pop());
    });
  });

  const testSubjects = [
    {
      id: '2651ed07-f31b-4bc1-87bd-4d270742a19d',
      name: 'Innehaver',
      description: 'Fysisk person som er eier av et enkeltpersonforetak',
      urn: 'urn:altinn:external-role:ccr:innehaver',
      legacyRoleCode: 'INNH',
      legacyUrn: 'urn:altinn:rolecode:INNH',
      provider: {
        id: '0195ea92-2080-758b-89db-7735c4f68320',
        name: 'Enhetsregisteret',
        code: 'sys-ccr',
      },
    },
    {
      id: '3c99647d-10b5-447e-9f0b-7bef1c7880f7',
      name: 'Samferdsel',
      description:
        'Rollen gir rettighet til tjenester relatert til samferdsel. For eksempel tjenester fra Statens Vegvesen, Sjøfartsdirektoratet og Luftfartstilsynet. Ved regelverksendringer eller innføring av nye digitale tjenester kan det bli endringer i tilganger som rolen gir.',
      urn: 'urn:altinn:rolecode:UILUF',
      legacyRoleCode: 'UILUF',
      legacyUrn: 'urn:altinn:rolecode:UILUF',
      provider: {
        id: '0195ea92-2080-777d-8626-69c91ea2a05d',
        name: 'Altinn 2',
        code: 'sys-altinn2',
      },
    },
    {
      id: '1c6eeec1-fe70-4fc5-8b45-df4a2255dea6',
      name: 'Privatperson',
      description:
        'Denne rollen er hentet fra Folkeregisteret og gir rettighet til flere tjenester.',
      urn: 'urn:altinn:role:privatperson',
      legacyRoleCode: 'PRIV',
      legacyUrn: 'urn:altinn:rolecode:PRIV',
      provider: {
        id: '0195ea92-2080-777d-8626-69c91ea2a05d',
        name: 'Altinn 2',
        code: 'sys-altinn2',
      },
    },
    {
      id: 'e16ab886-1e1e-4f45-8f79-46f06f720f3e',
      name: 'Selvregistrert bruker',
      description: 'Selvregistrert bruker',
      urn: 'urn:altinn:role:selvregistrert',
      legacyRoleCode: 'SELN',
      legacyUrn: 'urn:altinn:rolecode:SELN',
      provider: {
        id: '0195ea92-2080-777d-8626-69c91ea2a05d',
        name: 'Altinn 2',
        code: 'sys-altinn2',
      },
    },
    policySubjectOrg,
  ];
  describe('getCcrSubjects', () => {
    it('should return ccr subjects', () => {
      const ccrSubjects = getCcrSubjects(testSubjects);

      expect(ccrSubjects.map((x) => x.legacyUrn)).toEqual(['urn:altinn:rolecode:INNH']);
    });
  });

  describe('getAltinnSubjects', () => {
    it('should return ccr subjects', () => {
      const ccrSubjects = getAltinnSubjects(testSubjects);

      expect(ccrSubjects.map((x) => x.legacyUrn)).toEqual(['urn:altinn:rolecode:UILUF']);
    });
  });

  describe('getOtherSubjects', () => {
    it('should return ccr subjects', () => {
      const ccrSubjects = getOtherSubjects(testSubjects);

      expect(ccrSubjects.map((x) => x.legacyUrn)).toEqual([
        'urn:altinn:rolecode:PRIV',
        'urn:altinn:rolecode:SELN',
        policySubjectOrg.urn,
      ]);
    });
  });
});
