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

// SECTORS
export const resourceSectorsMockOptions = [
  { value: 'Sector 1', label: 'Sector 1' },
  { value: 'Sector 2', label: 'Sector 2' },
  { value: 'Sector 3', label: 'Sector 3' },
  { value: 'Sector 4', label: 'Sector 4' },
  { value: 'Sector 5', label: 'Sector 5' },
  { value: 'Sector 6', label: 'Sector 6' },
  { value: 'Sector 7', label: 'Sector 7' },
  { value: 'Sector 8', label: 'Sector 8' },
]

// THEMATIC AREA
export const resourceThematicAreaMockOptions = [
  { value: 'Thematic Area 1', label: 'Thematic Area 1' },
  { value: 'Thematic Area 2', label: 'Thematic Area 2' },
  { value: 'Thematic Area 3', label: 'Thematic Area 3' },
  { value: 'Thematic Area 4', label: 'Thematic Area 4' },
  { value: 'Thematic Area 5', label: 'Thematic Area 5' },
  { value: 'Thematic Area 6', label: 'Thematic Area 6' },
  { value: 'Thematic Area 7', label: 'Thematic Area 7' },
  { value: 'Thematic Area 8', label: 'Thematic Area 8' },
]
