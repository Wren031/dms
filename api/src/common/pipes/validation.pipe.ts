import { ValidationPipe } from '@nestjs/common';

/**
 * Global validation pipe.
 *  - whitelist: strip properties without validation decorators
 *  - forbidNonWhitelisted: reject unknown properties outright
 *  - transform: enable class-transformer and implicit primitive conversion
 */
export class GlobalValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    });
  }
}
