export interface SearchResult {
  id: string;
  documentName: string;
  category: string;
  uploadedBy: string;
  uploadDate: string;
  snippet: string;
  keywords: string[];
}

export const SEARCH_SUGGESTIONS = [
  'service agreement',
  'financial summary',
  'employee handbook',
  'iso 27001',
  'operations manual',
  'client proposal',
  'nda',
  'compliance report',
] as const;

export const MOCK_SEARCH_RESULTS: SearchResult[] = [
  {
    id: 'sr-001',
    documentName: 'Service Agreement - Apex Corp.pdf',
    category: 'Legal',
    uploadedBy: 'James Whitfield',
    uploadDate: '2026-04-10',
    snippet: 'This service agreement includes payment terms, scope of services, renewal conditions, and confidentiality clauses for Apex Corp.',
    keywords: ['service agreement', 'payment terms', 'confidentiality'],
  },
  {
    id: 'sr-002',
    documentName: 'Q1 2026 Financial Summary.xlsx',
    category: 'Financial Reports',
    uploadedBy: 'Sarah Lin',
    uploadDate: '2026-04-10',
    snippet: 'The quarterly financial summary covers revenue growth, operating expenses, and budget variances for the first quarter of 2026.',
    keywords: ['financial summary', 'revenue', 'budget variances'],
  },
  {
    id: 'sr-003',
    documentName: 'Employee Handbook v3.2.pdf',
    category: 'HR Documents',
    uploadedBy: 'Mark Torres',
    uploadDate: '2026-04-09',
    snippet: 'The handbook outlines leave policy, conduct expectations, benefits, and onboarding procedures for all employees.',
    keywords: ['employee handbook', 'leave policy', 'onboarding'],
  },
  {
    id: 'sr-004',
    documentName: 'ISO 27001 Audit Report.pdf',
    category: 'Governance',
    uploadedBy: 'Nina Patel',
    uploadDate: '2026-04-09',
    snippet: 'Audit findings confirm the organization meets ISO 27001 controls for access management, incident response, and asset control.',
    keywords: ['iso 27001', 'access management', 'incident response'],
  },
  {
    id: 'sr-005',
    documentName: 'Operations Manual 2026.pdf',
    category: 'Strategy',
    uploadedBy: 'Ava Reynolds',
    uploadDate: '2026-04-08',
    snippet: 'The operations manual describes escalation procedures, service workflows, and department responsibilities for 2026.',
    keywords: ['operations manual', 'workflow', 'escalation'],
  },
];