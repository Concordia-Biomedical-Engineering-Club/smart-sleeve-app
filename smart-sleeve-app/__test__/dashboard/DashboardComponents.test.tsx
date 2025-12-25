import React from 'react';
import { render } from '@testing-library/react-native';
import { SegmentedControl } from '@/components/dashboard/SegmentedControl';
import { CircularDataCard } from '@/components/dashboard/CircularDataCard';
import StatCard from '@/components/StatCard';

// Mock IconSymbol since it might use fonts not available in test env
jest.mock('@/components/ui/icon-symbol', () => ({
  IconSymbol: () => 'IconSymbol',
}));

describe('Dashboard Components', () => {
  it('renders SegmentedControl with options', () => {
    const { getByText } = render(
      <SegmentedControl 
        options={['Daily', 'Weekly']} 
        selectedOption="Daily" 
        onSelect={() => {}} 
      />
    );
    expect(getByText('Daily')).toBeTruthy();
    expect(getByText('Weekly')).toBeTruthy();
  });

  it('renders StatCard with value and label', () => {
    const { getByText } = render(
      <StatCard value="100" label="Test Label" />
    );
    expect(getByText('100')).toBeTruthy();
    expect(getByText('Test Label')).toBeTruthy();
  });

  it('renders CircularDataCard correctly', () => {
    const { getByText } = render(
        <CircularDataCard 
            title="Test Chart" 
            currentValue="50" 
            goalValue="100" 
            percentage={50} 
        />
    );
    expect(getByText('Test Chart')).toBeTruthy();
    expect(getByText('50')).toBeTruthy();
    expect(getByText('Goal:')).toBeTruthy();
  });
});
