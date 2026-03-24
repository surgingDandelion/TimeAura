export interface TagEntity {
  id: string;
  name: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TagCountItem extends TagEntity {
  count: number;
}

export interface CreateTagInput {
  name: string;
  color: string;
}

export interface UpdateTagPatch {
  name?: string;
  color?: string;
  sortOrder?: number;
}
