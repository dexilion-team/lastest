import * as os from 'os';
import { Config } from '../types';

export interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  context?: string;
}

export class ErrorLogger {
  private static errors: ErrorLog[] = [];
  private static appName = 'lasTest';
  private static appVersion = '0.1.0';
  private static config?: Config;

  static setConfig(config: Config) {
    this.config = config;
  }

  static captureError(error: Error, context?: string) {
    this.errors.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  static getErrors(): ErrorLog[] {
    return [...this.errors];
  }

  static hasErrors(): boolean {
    return this.errors.length > 0;
  }

  static clearErrors() {
    this.errors = [];
  }

  static generateEmailBody(): string {
    const sanitizedConfig = this.sanitizeConfig();
    const errorDetails = this.formatErrors();

    return `=== lasTest Error Report ===
App: ${this.appName}
Version: ${this.appVersion}
Timestamp: ${new Date().toISOString()}

=== Error Details ===
${errorDetails}

=== Configuration ===
${JSON.stringify(sanitizedConfig, null, 2)}

=== System Info ===
Platform: ${os.platform()}
OS Version: ${os.release()}
Node Version: ${process.version}
Architecture: ${os.arch()}`;
  }

  static generateEmailSubject(): string {
    const errorType = this.errors.length > 0 ? this.errors[0].message.split(':')[0] : 'Unknown Error';
    return `${this.appName} v${this.appVersion} Error Report - ${errorType}`;
  }

  static getMailtoLink(): string {
    const subject = encodeURIComponent(this.generateEmailSubject());
    const body = encodeURIComponent(this.generateEmailBody());
    return `mailto:lastest@dexilion.com?subject=${subject}&body=${body}`;
  }

  private static formatErrors(): string {
    return this.errors
      .map((error, index) => {
        let formatted = `Error #${index + 1}:
Timestamp: ${error.timestamp}
Message: ${error.message}`;

        if (error.context) {
          formatted += `\nContext: ${error.context}`;
        }

        if (error.stack) {
          formatted += `\nStack Trace:\n${error.stack}`;
        }

        return formatted;
      })
      .join('\n\n---\n\n');
  }

  private static sanitizeConfig(): Partial<Config> | null {
    if (!this.config) {
      return null;
    }

    // Return config without sensitive data (there are no API keys stored in config)
    // All config fields are safe to include
    return { ...this.config };
  }
}
