export interface RegisterUserPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  country?: string;
}
