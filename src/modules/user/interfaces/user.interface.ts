export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  DELIVERY = 'delivery',
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  phone_primary: string;
  phone_secondary?: string;
  address?: string;
  avatar_url?: string;
  avatar_public_id?: string;
  role: UserRole;
  is_verified: boolean;
  reset_password_token?: string;
  reset_password_expires?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface VerificationCode {
  id: string;
  user_id: string;
  code: string;
  expires_at: Date;
  last_sent_at: Date;
  created_at: Date;
}
