# TurnkeyHMS Admin Dashboard - Documentation

## Overview
This directory contains comprehensive documentation for the TurnkeyHMS Admin Dashboard web application.

## Directory Structure

```
docs/
├── README.md                           # This file - documentation overview
├── architecture/                       # System architecture and design
│   ├── admin-dashboard-improved.mmd    # Main dashboard architecture diagram
│   └── admin-dashboard-notes.md        # Architecture notes and explanations
├── system/                             # System-level documentation
│   └── HEALTH_MONITORING.md           # System health monitoring implementation
├── features/                           # Feature-specific documentation
├── api/                               # API documentation (future)
└── deployment/                        # Deployment guides (future)
```

## Architecture Documentation

### 📊 [Admin Dashboard Architecture](./architecture/admin-dashboard-improved.mmd)
- **File**: `architecture/admin-dashboard-improved.mmd` 
- **Type**: Mermaid diagram (.mmd)
- **Description**: Complete architectural overview of the Admin Dashboard web application
- **Accuracy**: 95% verified against codebase implementation
- **Last Updated**: Based on codebase analysis findings

### 📝 [Architecture Notes](./architecture/admin-dashboard-notes.md)
- **File**: `architecture/admin-dashboard-notes.md`
- **Description**: Detailed explanations of architectural decisions and improvements
- **Includes**: API endpoints, authentication flow, service integrations
- **Purpose**: Developer onboarding and architecture understanding

## System Documentation

### 🏥 [Health Monitoring System](./system/HEALTH_MONITORING.md)
- **File**: `system/HEALTH_MONITORING.md`
- **Description**: Comprehensive system health monitoring implementation
- **Includes**: Health API integration, monitoring components, dashboard visualization
- **Purpose**: System administration and operational monitoring

## How to Use This Documentation

### For Developers
1. **New Team Members**: Start with the architecture diagram and notes
2. **Code Changes**: Update diagrams when modifying system architecture
3. **API Integration**: Refer to confirmed endpoints in architecture notes

### For Mermaid Chart Integration
These `.mmd` files are designed to work with:
- Mermaid Chart VS Code/Cursor extension
- MermaidChart.com web interface
- Local Mermaid preview tools

### Viewing Diagrams
1. **In Cursor/VS Code**: Install Mermaid Chart extension for live preview
2. **Web Interface**: Copy content to [mermaidchart.com](https://mermaidchart.com) or [mermaid.live](https://mermaid.live)
3. **Command Line**: Use Mermaid CLI tools for rendering

## Maintenance

### Updating Diagrams
- Diagrams should be updated when architectural changes occur
- Verify accuracy against actual codebase implementation
- Update corresponding notes documentation

### Adding New Documentation
- Follow the established directory structure
- Include both diagram files (.mmd) and explanatory notes (.md)
- Update this README when adding new sections

## Contributing

When contributing to documentation:
1. Ensure diagrams reflect actual implementation
2. Include explanatory notes for complex architectures  
3. Update accuracy percentages based on verification
4. Follow Mermaid best practices for diagram clarity

## Implementation Verification

The architecture documentation in this directory has been verified against the actual codebase implementation:

- ✅ **API Endpoints**: Confirmed via `src/api/` and `src/services/`
- ✅ **Authentication**: Verified Firebase Auth integration
- ✅ **Component Structure**: Matched against `src/components/` organization
- ✅ **Service Integration**: Confirmed WebSocket and API client patterns
- ✅ **Data Flow**: Validated Analytics Service as primary data source

**Last Verification**: Current codebase analysis  
**Verification Method**: Static code analysis and endpoint discovery






