import type { PolicyAction } from './types';

export const POLICY_ACTIONS: PolicyAction[] = [
  {
    actionId: 'read',
    actionTitle: 'Les',
  },
  {
    actionId: 'write',
    actionTitle: 'Skriv',
  },
  {
    actionId: 'delete',
    actionTitle: 'Slett',
  },
  {
    actionId: 'confirm',
    actionTitle: 'Bekreft',
  },
  {
    actionId: 'sign',
    actionTitle: 'Signer',
  },
  {
    actionId: 'instantiate',
    actionTitle: 'Instansier',
  },
  {
    actionId: 'complete',
    actionTitle: 'Bekreft mottatt tjenesteeier',
  },
  {
    actionId: 'pay',
    actionTitle: 'Betale',
  },
  {
    actionId: 'reject',
    actionTitle: 'Avvise betaling',
  },
  {
    actionId: 'subscribe',
    actionTitle: 'Abonnere på hendelser (Events)',
  },
  {
    actionId: 'publish',
    actionTitle: 'Publisere hendelser (Events)',
  },
  {
    actionId: 'scopeaccess',
    actionTitle: 'Rett til å delegere scope',
  },
  {
    actionId: 'access',
    actionTitle: 'Tilgang',
  },
];
