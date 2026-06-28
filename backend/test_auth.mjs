import { NestFactory } from '@nestjs/core';
import { AppModule } from './dist/src/app.module.js';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // Discover AuthService by scanning providers
  const provider = app.container?.modules?.get(AppModule)?.providers;
  for (const [key, val] of provider || []) {
    const name = val?.metatype?.name;
    if (name === 'AuthService' || name?.includes('AuthService')) {
      console.log('Found:', name);
      const svc = app.get(val.metatype);
      try {
        const result = await svc.register({ username: 'dev3', email: 'dev3@test.com', password: 'developer123', displayName: 'Dev3' });
        console.log('OK:', result.user.username);
      } catch(e) {
        console.log('ERROR:', e.constructor.name, e.message);
        console.log(e.stack?.substring(0, 1000));
      }
      break;
    }
  }
  await app.close();
}
bootstrap();
