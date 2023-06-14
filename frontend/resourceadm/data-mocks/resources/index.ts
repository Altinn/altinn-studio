import { ResourceType } from "resourceadm/types/global";

// RESOURCES
export const mockResources: ResourceType[] = [
  {
    name: 'Ressurs 1',
    createdBy: 'Kåre Fredriksen',
    dateChanged: '25.11.2021',
    hasPolicy: true,
    resourceId: 'resource_id_1',
  },
  {
    name: 'Ressurs 2',
    createdBy: 'Kåre Fredriksen',
    dateChanged: '25.11.2021',
    hasPolicy: true,
    resourceId: 'resource_id_2',
  },
  {
    name: 'Ressurs 9',
    createdBy: 'Kåre Fredriksen',
    dateChanged: '25.11.2021',
    hasPolicy: false,
    resourceId: 'resource_id_9',
  },
  {
    name: 'Ressurs 4',
    createdBy: 'Kåre Fredriksen',
    dateChanged: '25.11.2021',
    hasPolicy: true,
    resourceId: 'resource_id_4',
  },
  {
    name: 'Ressurs 5',
    createdBy: 'Kåre Fredriksen',
    dateChanged: '25.11.2021',
    hasPolicy: true,
    resourceId: 'resource_id_5',
  },
  {
    name: 'Ressurs 7',
    createdBy: 'Kåre Fredriksen',
    dateChanged: '25.11.2021',
    hasPolicy: false,
    resourceId: 'resource_id_7',
  },
  {
    name: 'Ressurs 8',
    createdBy: 'Kåre Fredriksen',
    dateChanged: '25.11.2021',
    hasPolicy: false,
    resourceId: 'resource_id_8',
  },
  {
    name: 'Ressurs 3',
    createdBy: 'Kåre Fredriksen',
    dateChanged: '25.11.2021',
    hasPolicy: true,
    resourceId: 'resource_id_3',
  },
];

// RESOURCE TYPE
export const resourceTypeMockOptions = [
  { value: 'Altinn studio app', label: 'Altinn studio app' },
  { value: 'API', label: 'API' },
  { value: 'Datasett', label: 'Datasett' },
  { value: 'Ekstern app eller tjeneste', label: 'Ekstern app eller tjeneste' },
  { value: 'Hendelse', label: 'Hendelse' },
  { value: 'Livshendelse', label: 'Livshendelse' },
  { value: 'Fysisk tjeneste', label: 'Fysisk tjeneste' },
  { value: 'Begrep', label: 'Begrep' },
];
