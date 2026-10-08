/**
 * Sends text messages. Inject this abstract class; the concrete provider is chosen in SmsModule
 * (console in development, a real gateway in production, a fake in tests).
 */
export abstract class SmsSender {
  abstract send(phone: string, message: string): Promise<void>;
}
