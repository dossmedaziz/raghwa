export interface PushMessage {
  /** Expo push token, e.g. "ExponentPushToken[xxxxxxxx]". */
  to: string;
  title: string;
  body: string;
  /** Delivered to the app with the notification (e.g. which reservation to open on tap). */
  data: Record<string, string>;
}

export interface PushResult {
  /** Tokens the push service rejected for good (app uninstalled, logged out…): the caller forgets them. */
  invalidTokens: string[];
}

/**
 * Sends push notifications to the mobile app. Inject this abstract class; the concrete provider is chosen in
 * PushModule (Expo in development and production, console when PUSH_DRIVER=console, a fake in tests).
 */
export abstract class PushSender {
  abstract send(messages: PushMessage[]): Promise<PushResult>;
}
