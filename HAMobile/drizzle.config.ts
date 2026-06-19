import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/data/local/esquema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
});
