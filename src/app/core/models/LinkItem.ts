export interface LinkItem {
  id: string;
  title: string;
  url: string;
  iconClass: string;
  description?: string;
  active: boolean;
}

export type LinkItemPayload = Omit<LinkItem, 'id' | 'createdAt' | 'updatedAt'>;