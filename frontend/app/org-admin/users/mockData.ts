import type { OrgUser } from './types';

export const MOCK_USERS: OrgUser[] = [
  {
    id: 'u1001',
    name: 'Alex Harrison',
    email: 'alex.harrison@custodox.com',
    role: 'User',
    status: 'Active',
    avatar: 'AH',
    createdDate: '2026-03-18',
  },
  {
    id: 'u1002',
    name: 'Mia Patel',
    email: 'mia.patel@custodox.com',
    role: 'Admin',
    status: 'Active',
    avatar: 'MP',
    createdDate: '2026-03-22',
  },
  {
    id: 'u1003',
    name: 'Jordan Lee',
    email: 'jordan.lee@custodox.com',
    role: 'User',
    status: 'Inactive',
    avatar: 'JL',
    createdDate: '2026-04-02',
  },
  {
    id: 'u1004',
    name: 'Sophia Grant',
    email: 'sophia.grant@custodox.com',
    role: 'User',
    status: 'Active',
    avatar: 'SG',
    createdDate: '2026-04-08',
  },
  {
    id: 'u1005',
    name: 'Noah Bennett',
    email: 'noah.bennett@custodox.com',
    role: 'Admin',
    status: 'Active',
    avatar: 'NB',
    createdDate: '2026-04-10',
  },
];