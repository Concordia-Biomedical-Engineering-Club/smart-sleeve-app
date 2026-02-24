import React from 'react';
import { render } from '@testing-library/react-native';
import ModalScreen from '../app/modal'; // adjust path if needed

// Mock expo-router
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

describe('ModalScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Settings Menu title and all navigation links', () => {
    const { getByText } = render(<ModalScreen />);

    // Check title text
    expect(getByText('Settings Menu')).toBeTruthy();

    // Check navigation links
    expect(getByText('Go to Home (Index)')).toBeTruthy();
    expect(getByText('Go to Explore')).toBeTruthy();
    expect(getByText('Go to Auth')).toBeTruthy();
    expect(getByText('Go to Test BLE')).toBeTruthy();
    expect(getByText('Go to Progress')).toBeTruthy();
    
    // Check dismiss link
    expect(getByText('Dismiss')).toBeTruthy();
  });
});
