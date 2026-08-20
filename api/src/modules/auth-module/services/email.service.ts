import { Injectable, Logger } from '@nestjs/common';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * Email delivery abstraction.
 *
 * The current implementation is a development stub: it does not send real
 * emails. Token delivery in development is handled via DEV_RETURN_TOKENS in
 * the API responses. In production, plug in a real mail provider
 * (SendGrid, SES, ...) behind this interface.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(message: EmailMessage): Promise<void> {
    this.logger.log(`[email-stub] to=${message.to} subject=${message.subject}`);
  }
}
