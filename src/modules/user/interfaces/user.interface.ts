export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  DELIVERY = 'delivery',
}

// ─── Core domain interfaces ───────────────────────────────────────────────────
export interface IUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  address: string | null;
  avatarUrl: string | null;
  avatarPublicId: string | null;
  role: UserRole;
  isVerified: boolean;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** الـ user بعد إزالة الحقول الحساسة — ده اللي بيتبعت للـ client */
export interface IUserPublic {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phonePrimary: string;
  phoneSecondary: string | null;
  address: string | null;
  avatarUrl: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVerificationCode {
  id: string;
  userId: string;
  code: string;
  expiresAt: Date;
  lastSentAt: Date;
  createdAt: Date;
}

// ─── Repository contract ──────────────────────────────────────────────────────
// لو غيرت الـ ORM، بس الـ repository class بتتغير مش أي حاجة تانية.

export interface IUserRepository {
  findAll(): Promise<IUser[]>;
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  findByPhone(phone: string): Promise<IUser | null>;
  findByResetToken(token: string): Promise<IUser | null>;
  markEmailVerified(userId: string): Promise<void>;
  updateAvatar(
    userId: string,
    avatarUrl: string,
    avatarPublicId: string,
  ): Promise<void>;
  setResetPasswordToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void>;
  updatePassword(userId: string, hashedPassword: string): Promise<void>;
  createVerificationCode(
    userId: string,
    code: string,
    expiresAt: Date,
  ): Promise<IVerificationCode>;
  findVerificationCode(
    userId: string,
    code: string,
  ): Promise<IVerificationCode | null>;
  findLatestVerificationCode(userId: string): Promise<IVerificationCode | null>;
  deleteVerificationCodes(userId: string): Promise<void>;
}
