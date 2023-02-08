module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: {
    'window': {},
    'document': {}
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: './test/tsconfig.json',
        diagnostics: {
          ignoreCodes: ['TS151001']
        }
      }
    ]
  }
};