module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'ts-jest': {
      tsconfig: './test/tsconfig.json',
      diagnostics: {
        ignoreCodes: ['TS151001']
      }
    },
    'window': {},
    'document': {}
  }
};