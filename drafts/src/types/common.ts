export interface AppError {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
}

export interface PageResult<T> {
  items: T[];
  total: number;
}
