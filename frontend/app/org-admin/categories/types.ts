export interface MetadataField {
  id: string;
  name: string;
  type: 'Text' | 'Number' | 'Date' | 'Dropdown' | 'NIC' | 'Author' | 'Email' | 'Phone' | 'URL';
  required: boolean;
  options?: string[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  fields: MetadataField[];
  createdDate: string;
  docCount: number;
}
