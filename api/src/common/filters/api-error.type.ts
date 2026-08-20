export interface ApiErrorBody {
  success: false;
  message: string;
  statusCode: number;
  errors?: string[];
}
