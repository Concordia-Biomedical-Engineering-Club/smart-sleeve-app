import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'react-native',
  testEnvironment: 'node',

  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],

  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@react-navigation)/)',
  ],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

export default config;
