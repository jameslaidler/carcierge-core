import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'trade-in/index': 'src/trade-in/index.ts',
    'payments/index': 'src/payments/index.ts',
    'offers/index': 'src/offers/index.ts',
    'doc-fees/index': 'src/doc-fees/index.ts',
    'product-config/index': 'src/product-config/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
});
