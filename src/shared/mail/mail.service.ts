import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('mail.host'),
      port: this.configService.get<number>('mail.port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('mail.user'),
        pass: this.configService.get<string>('mail.password'),
      },
    });
  }

  async sendVerificationCode(
    email: string,
    name: string,
    code: string,
  ): Promise<void> {
    await this.transporter.sendMail({
      from: this.configService.get<string>('mail.from'),
      to: email,
      subject: 'تفعيل حسابك - كود التحقق',
      html: this.buildVerificationTemplate(name, code),
    });
  }

  async sendPasswordResetEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL_LOCAL}/auth/reset-password?token=${token}`;
    await this.transporter.sendMail({
      from: this.configService.get<string>('mail.from'),
      to: email,
      subject: 'إعادة تعيين كلمة المرور',
      html: this.buildResetPasswordTemplate(name, resetUrl),
    });
    console.log(`${name} - ${resetUrl}`);
  }

  // Email Templates
  private buildVerificationTemplate(name: string, code: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
        <div style="background: #f97316; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">🍕 تفعيل حسابك</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p style="font-size: 18px; color: #374151;">مرحباً <strong>${name}</strong>،</p>
          <p style="color: #6b7280;">شكراً لتسجيلك معنا! استخدم الكود التالي لتفعيل حسابك:</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f97316;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">⏰ هذا الكود صالح لمدة <strong>10 دقائق</strong> فقط.</p>
          <p style="color: #9ca3af; font-size: 12px;">إذا لم تطلب هذا الكود، تجاهل هذه الرسالة.</p>
        </div>
      </div>
    `;
  }

  private buildResetPasswordTemplate(name: string, resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
        <div style="background: #f97316; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">🔐 إعادة تعيين كلمة المرور</h1>
        </div>
        <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px;">
          <p style="font-size: 18px; color: #374151;">مرحباً <strong>${name}</strong>،</p>
          <p style="color: #6b7280;">طلبت إعادة تعيين كلمة المرور. اضغط على الزر أدناه:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background: #f97316; color: white; padding: 14px 32px; 
                      border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
              إعادة تعيين كلمة المرور
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">⏰ هذا الرابط صالح لمدة <strong>30 دقيقة</strong> فقط.</p>
          <p style="color: #9ca3af; font-size: 12px; word-break: break-all;">
            أو انسخ هذا الرابط: ${resetUrl}
          </p>
          <p style="color: #9ca3af; font-size: 12px;">إذا لم تطلب هذا، تجاهل هذه الرسالة وكلمة مرورك ستبقى كما هي.</p>
        </div>
      </div>
    `;
  }
}
