# Analytics Components Module

## Purpose
Visualization components for booking analytics, including funnels, heatmaps, and conversion metrics.

## Component Guidelines
- All charts use Plotly.js for consistency
- Data transformation happens in hooks, not components
- Components are purely presentational
- Loading and error states are mandatory

## Data Flow
1. Parent provides filtered data via props
2. Component transforms data for visualization
3. User interactions emit events upward
4. Never fetch data directly from components

## Specific Components

### FunnelChart
- Displays conversion funnel through booking stages
- Props: `stages`, `timeRange`, `onStageClick`
- Calculates drop-off percentages
- Supports drill-down navigation

### HeatmapGrid
- 2D matrix visualization (dates × hotels)
- Props: `data`, `colorScale`, `onCellClick`
- Supports zoom and pan
- Tooltips show detailed metrics

### ConversionMetrics
- Key performance indicators display
- Props: `metrics`, `comparison`, `trend`
- Auto-refreshes every 30 seconds
- Animated transitions for value changes

### JourneyTimeline
- User journey progression visualization
- Props: `sessions`, `selectedSession`
- Shows time spent at each stage
- Identifies bottlenecks

## Testing Requirements
- Snapshot tests for all components
- Data transformation unit tests
- Interactive behavior tests
- Performance benchmarks for large datasets