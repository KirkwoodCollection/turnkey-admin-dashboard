import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Stack,
  Divider,
  Badge,
  IconButton,
  Tooltip,
  Button,
  Switch,
} from '@mui/material';
import {
  ExpandMoreRounded,
  FilterListRounded,
  ClearRounded,
  BookmarkRounded,
  TuneRounded,
} from '@mui/icons-material';
import { EVENT_CATEGORIES, EVENT_METADATA, EventType } from '../types';

export interface EventFilters {
  categories: string[];
  eventTypes: EventType[];
  importance: string[];
  timeRange: string;
  searchText: string;
  showOnlyConversions: boolean;
  showOnlyCritical: boolean;
  sessionId?: string;
}

interface EventFiltersProps {
  onFiltersChange: (filters: EventFilters) => void;
  initialFilters?: Partial<EventFilters>;
  totalEventCount?: number;
  filteredEventCount?: number;
}

export const EventFilters: React.FC<EventFiltersProps> = ({
  onFiltersChange,
  initialFilters = {},
  totalEventCount = 0,
  filteredEventCount = 0
}) => {
  const [filters, setFilters] = useState<EventFilters>({
    categories: [],
    eventTypes: [],
    importance: [],
    timeRange: '24h',
    searchText: '',
    showOnlyConversions: false,
    showOnlyCritical: false,
    ...initialFilters
  });

  const [savedFilters, setSavedFilters] = useState<EventFilters[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['categories']));

  const updateFilters = useCallback((newFilters: EventFilters) => {
    setFilters(newFilters);
    onFiltersChange(newFilters);
  }, [onFiltersChange]);

  const handleCategoryChange = useCallback((category: string, checked: boolean) => {
    const newCategories = checked 
      ? [...filters.categories, category]
      : filters.categories.filter(c => c !== category);
    
    updateFilters({ ...filters, categories: newCategories });
  }, [filters, updateFilters]);

  const handleEventTypeChange = useCallback((eventType: EventType, checked: boolean) => {
    const newEventTypes = checked
      ? [...filters.eventTypes, eventType]  
      : filters.eventTypes.filter(t => t !== eventType);
    
    updateFilters({ ...filters, eventTypes: newEventTypes });
  }, [filters, updateFilters]);

  const handleImportanceChange = useCallback((event: SelectChangeEvent<string[]>) => {
    const importance = event.target.value as string[];
    updateFilters({ ...filters, importance });
  }, [filters, updateFilters]);

  const handleQuickFilter = useCallback((filterType: string) => {
    switch (filterType) {
      case 'conversions':
        updateFilters({
          ...filters,
          eventTypes: [EventType.RESERVATION_CONFIRMED],
          showOnlyConversions: true
        });
        break;
      case 'critical':
        updateFilters({
          ...filters,
          importance: ['critical'],
          showOnlyCritical: true
        });
        break;
      case 'widget_lifecycle':
        updateFilters({
          ...filters,
          categories: ['widget_lifecycle']
        });
        break;
      case 'booking_process':
        updateFilters({
          ...filters,
          categories: ['booking_process']
        });
        break;
    }
  }, [filters, updateFilters]);

  const clearFilters = useCallback(() => {
    const clearedFilters: EventFilters = {
      categories: [],
      eventTypes: [],
      importance: [],
      timeRange: '24h',
      searchText: '',
      showOnlyConversions: false,
      showOnlyCritical: false
    };
    updateFilters(clearedFilters);
  }, [updateFilters]);

  const saveCurrentFilters = useCallback(() => {
    const newSavedFilters = [...savedFilters, { ...filters }];
    setSavedFilters(newSavedFilters);
    localStorage.setItem('eventFilterPresets', JSON.stringify(newSavedFilters));
  }, [filters, savedFilters]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // Calculate filter statistics
  const filterStats = useMemo(() => {
    const selectedCategories = filters.categories.length;
    const selectedEventTypes = filters.eventTypes.length;
    const activeFilters = selectedCategories + selectedEventTypes + 
                         filters.importance.length + 
                         (filters.searchText ? 1 : 0) +
                         (filters.showOnlyConversions ? 1 : 0) +
                         (filters.showOnlyCritical ? 1 : 0);
                         
    return {
      activeFilters,
      filteringPercent: totalEventCount > 0 ? ((totalEventCount - filteredEventCount) / totalEventCount * 100) : 0
    };
  }, [filters, totalEventCount, filteredEventCount]);

  const getCategoryEventCount = useCallback((category: string) => {
    return EVENT_CATEGORIES[category as keyof typeof EVENT_CATEGORIES]?.length || 0;
  }, []);

  return (
    <Box 
      sx={{ 
        width: 350, 
        borderRight: 1, 
        borderColor: 'divider', 
        bgcolor: 'background.paper',
        height: '100vh',
        overflow: 'auto'
      }}
    >
      {/* Filter Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', bgcolor: 'primary.light' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterListRounded />
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
              Event Filters
            </Typography>
          </Box>
          <Tooltip title="Clear all filters">
            <IconButton size="small" onClick={clearFilters}>
              <ClearRounded />
            </IconButton>
          </Tooltip>
        </Stack>
        
        {/* Filter Statistics */}
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {filteredEventCount.toLocaleString()} of {totalEventCount.toLocaleString()} events
            {filterStats.activeFilters > 0 && (
              <Chip 
                label={`${filterStats.activeFilters} active filters`}
                size="small" 
                sx={{ ml: 1 }}
                color="primary"
              />
            )}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Quick Filters */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Quick Filters
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            <Chip
              label="Conversions"
              clickable
              onClick={() => handleQuickFilter('conversions')}
              color={filters.showOnlyConversions ? 'primary' : 'default'}
              icon={<BookmarkRounded />}
              size="small"
            />
            <Chip
              label="Critical Events"
              clickable
              onClick={() => handleQuickFilter('critical')}
              color={filters.showOnlyCritical ? 'error' : 'default'}
              size="small"
            />
            <Chip
              label="Widget Lifecycle"
              clickable
              onClick={() => handleQuickFilter('widget_lifecycle')}
              color={filters.categories.includes('widget_lifecycle') ? 'secondary' : 'default'}
              size="small"
            />
            <Chip
              label="Booking Process"
              clickable
              onClick={() => handleQuickFilter('booking_process')}
              color={filters.categories.includes('booking_process') ? 'secondary' : 'default'}
              size="small"
            />
          </Stack>
        </Box>

        {/* Time Range */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={filters.timeRange}
            label="Time Range"
            onChange={(e) => updateFilters({ ...filters, timeRange: e.target.value })}
          >
            <MenuItem value="1h">Last Hour</MenuItem>
            <MenuItem value="6h">Last 6 Hours</MenuItem>
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
          </Select>
        </FormControl>

        {/* Search Text */}
        <TextField
          fullWidth
          label="Search Events"
          placeholder="Search by event name or details..."
          value={filters.searchText}
          onChange={(e) => updateFilters({ ...filters, searchText: e.target.value })}
          sx={{ mb: 2 }}
          InputProps={{
            endAdornment: filters.searchText && (
              <IconButton size="small" onClick={() => updateFilters({ ...filters, searchText: '' })}>
                <ClearRounded />
              </IconButton>
            )
          }}
        />

        {/* Importance Filter */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Importance Level</InputLabel>
          <Select
            multiple
            value={filters.importance}
            label="Importance Level"
            onChange={handleImportanceChange}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => (
                  <Chip 
                    key={value} 
                    label={value} 
                    size="small" 
                    color={value === 'critical' ? 'error' : 'default'}
                  />
                ))}
              </Box>
            )}
          >
            <MenuItem value="low">Low</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="critical">Critical</MenuItem>
          </Select>
        </FormControl>

        <Divider sx={{ my: 2 }} />

        {/* Event Categories */}
        <Accordion expanded={expandedSections.has('categories')} onChange={() => toggleSection('categories')}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Event Categories
              </Typography>
              <Badge badgeContent={filters.categories.length} color="primary">
                <TuneRounded fontSize="small" />
              </Badge>
            </Stack>
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {Object.entries(EVENT_CATEGORIES).map(([category, _events]) => (
                <FormControlLabel
                  key={category}
                  control={
                    <Checkbox
                      checked={filters.categories.includes(category)}
                      onChange={(e) => handleCategoryChange(category, e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography variant="body2">
                        {category.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {getCategoryEventCount(category)} events
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Specific Event Types */}
        <Accordion expanded={expandedSections.has('eventTypes')} onChange={() => toggleSection('eventTypes')}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" width="100%">
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Specific Events
              </Typography>
              <Badge badgeContent={filters.eventTypes.length} color="primary">
                <Typography variant="caption">(28 types)</Typography>
              </Badge>
            </Stack>
          </AccordionSummary>
          <AccordionDetails sx={{ maxHeight: 300, overflow: 'auto' }}>
            <FormGroup>
              {Object.entries(EVENT_METADATA).map(([eventType, metadata]) => (
                <FormControlLabel
                  key={eventType}
                  control={
                    <Checkbox
                      checked={filters.eventTypes.includes(eventType as EventType)}
                      onChange={(e) => handleEventTypeChange(eventType as EventType, e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          backgroundColor: metadata.color
                        }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: metadata.importance === 'critical' ? 600 : 400 }}>
                          {metadata.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {metadata.category} • {metadata.importance}
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Advanced Options */}
        <Accordion expanded={expandedSections.has('advanced')} onChange={() => toggleSection('advanced')}>
          <AccordionSummary expandIcon={<ExpandMoreRounded />}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Advanced Options
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.showOnlyConversions}
                    onChange={(e) => updateFilters({ ...filters, showOnlyConversions: e.target.checked })}
                  />
                }
                label="Show only conversion events"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.showOnlyCritical}
                    onChange={(e) => updateFilters({ ...filters, showOnlyCritical: e.target.checked })}
                  />
                }
                label="Show only critical events"
              />
              
              <TextField
                fullWidth
                label="Filter by Session ID"
                placeholder="Enter session ID..."
                value={filters.sessionId || ''}
                onChange={(e) => updateFilters({ ...filters, sessionId: e.target.value || undefined })}
                size="small"
              />
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Save/Load Filters */}
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button
            variant="outlined"
            size="small"
            fullWidth
            onClick={saveCurrentFilters}
            disabled={filterStats.activeFilters === 0}
          >
            Save Current Filters
          </Button>
          
          {savedFilters.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {savedFilters.length} saved filter preset(s)
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};