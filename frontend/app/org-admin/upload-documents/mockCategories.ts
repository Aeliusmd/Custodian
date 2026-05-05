import type { Category } from '../categories/types';

export const mockCategories: Category[] = [
  {
    id: 'CAT-001',
    name: 'Legal Contracts',
    description: 'All legal agreements, NDAs, and binding contracts',
    createdDate: '2025-01-10',
    docCount: 3240,
    fields: [
      { id: 'f1', name: 'Contract Date', type: 'Date', required: true },
      { id: 'f2', name: 'Counterparty Name', type: 'Text', required: true },
      { id: 'f3', name: 'Contract Type', type: 'Dropdown', required: true, options: ['NDA', 'Service Agreement', 'Employment', 'Vendor'] },
      { id: 'f4', name: 'Expiry Date', type: 'Date', required: false },
      { id: 'f5', name: 'Contract Value', type: 'Number', required: false },
    ],
  },
  {
    id: 'CAT-002',
    name: 'Financial Reports',
    description: 'Quarterly and annual financial statements',
    createdDate: '2025-01-10',
    docCount: 2810,
    fields: [
      { id: 'f6', name: 'Report Period', type: 'Dropdown', required: true, options: ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'] },
      { id: 'f7', name: 'Fiscal Year', type: 'Number', required: true },
      { id: 'f8', name: 'Prepared By', type: 'Text', required: true },
    ],
  },
  {
    id: 'CAT-003',
    name: 'HR Documents',
    description: 'Employee records and HR documentation',
    createdDate: '2025-02-05',
    docCount: 1950,
    fields: [
      { id: 'f10', name: 'Employee Name', type: 'Text', required: true },
      { id: 'f11', name: 'Employee ID', type: 'Text', required: true },
      { id: 'f12', name: 'Document Type', type: 'Dropdown', required: true, options: ['Offer Letter', 'Contract', 'Performance Review', 'Termination'] },
      { id: 'f13', name: 'Effective Date', type: 'Date', required: true },
    ],
  },
  {
    id: 'CAT-004',
    name: 'Compliance',
    description: 'Regulatory compliance and audit documents',
    createdDate: '2025-02-20',
    docCount: 1620,
    fields: [
      { id: 'f14', name: 'Regulation Name', type: 'Text', required: true },
      { id: 'f15', name: 'Audit Date', type: 'Date', required: true },
      { id: 'f16', name: 'Compliance Status', type: 'Dropdown', required: true, options: ['Compliant', 'Non-Compliant', 'Under Review'] },
    ],
  },
  {
    id: 'CAT-005',
    name: 'Operations',
    description: 'SOPs and operational manuals',
    createdDate: '2025-03-01',
    docCount: 1380,
    fields: [
      { id: 'f19', name: 'Department', type: 'Dropdown', required: true, options: ['IT', 'Finance', 'HR', 'Legal', 'Operations'] },
      { id: 'f20', name: 'Version', type: 'Text', required: true },
      { id: 'f21', name: 'Effective Date', type: 'Date', required: true },
    ],
  },
  {
    id: 'CAT-006',
    name: 'Client Proposals',
    description: 'Business proposals and pitch documents',
    createdDate: '2025-03-15',
    docCount: 890,
    fields: [
      { id: 'f22', name: 'Client Name', type: 'Text', required: true },
      { id: 'f23', name: 'Proposal Date', type: 'Date', required: true },
      { id: 'f25', name: 'Status', type: 'Dropdown', required: true, options: ['Draft', 'Sent', 'Accepted', 'Rejected'] },
    ],
  },
];