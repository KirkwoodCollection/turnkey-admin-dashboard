import React, { createContext, useContext, useState, useCallback } from 'react';
import { TIME_FILTERS, TimeFilter } from '../types';

interface TimeFilterContextType {
  selectedFilter: TimeFilter;
  setSelectedFilter: (filter: TimeFilter) => void;
  availableFilters: TimeFilter[];
  getDateRange: () => { start: Date; end: Date };
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const TimeFilterContext = createContext<TimeFilterContextType | null>(null);

interface TimeFilterProviderProps {
  children: React.ReactNode;
  defaultFilter?: TimeFilter;
}

export const TimeFilterProvider: React.FC<TimeFilterProviderProps> = ({ 
  children,
  defaultFilter = TIME_FILTERS[3] // Default to 24H
}) => {
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>(defaultFilter);
  const [isLoading, setIsLoading] = useState(false);

  const handleFilterChange = useCallback((filter: TimeFilter) => {
    setIsLoading(true);
    setSelectedFilter(filter);
    // Loading will be set to false by components when they finish updating
  }, []);

  const getDateRange = useCallback(() => {
    const end = new Date();
    const start = new Date(end.getTime() - (selectedFilter.hours * 60 * 60 * 1000));
    
    return { start, end };
  }, [selectedFilter]);

  const contextValue: TimeFilterContextType = {
    selectedFilter,
    setSelectedFilter: handleFilterChange,
    availableFilters: TIME_FILTERS,
    getDateRange,
    isLoading,
    setIsLoading,
  };

  return (
    <TimeFilterContext.Provider value={contextValue}>
      {children}
    </TimeFilterContext.Provider>
  );
};

export const useTimeFilter = (): TimeFilterContextType => {
  const context = useContext(TimeFilterContext);
  if (!context) {
    throw new Error('useTimeFilter must be used within a TimeFilterProvider');
  }
  return context;
};