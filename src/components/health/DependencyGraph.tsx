import React, { useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Tooltip,
  IconButton,
  Alert,
  Switch,
  FormControlLabel,
  Paper,
} from '@mui/material';
import {
  AccountTreeRounded,
  InfoRounded,
  ZoomInRounded,
  ZoomOutRounded,
  CenterFocusStrongRounded,
} from '@mui/icons-material';
import { ServiceDependency, ServiceHealthStatus, HEALTH_STATUS_COLORS } from '../../types';

interface DependencyGraphProps {
  dependencies: ServiceDependency[];
  services: ServiceHealthStatus[];
  onServiceClick?: (serviceId: string) => void;
  height?: number;
}

interface GraphNode {
  id: string;
  label: string;
  status: ServiceHealthStatus['status'];
  x: number;
  y: number;
  level: number;
  criticalPath: boolean;
}

interface GraphEdge {
  from: string;
  to: string;
  criticalPath: boolean;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  dependencies,
  services,
  onServiceClick,
  height = 400,
}) => {
  const [showCriticalPathOnly, setShowCriticalPathOnly] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const serviceHealthMap = useMemo(() => {
    return services.reduce((acc, service) => {
      acc[service.service_name] = service.status;
      return acc;
    }, {} as Record<string, ServiceHealthStatus['status']>);
  }, [services]);

  const { nodes, edges, criticalServices } = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const criticalServices = new Set<string>();

    // Create nodes from dependencies
    const allServices = new Set<string>();
    dependencies.forEach(dep => {
      allServices.add(dep.service_name);
      dep.depends_on.forEach(service => allServices.add(service));
      if (dep.critical_path) {
        criticalServices.add(dep.service_name);
        dep.depends_on.forEach(service => criticalServices.add(service));
      }
    });

    // Build dependency levels for layout
    const serviceLevels = new Map<string, number>();
    const visited = new Set<string>();

    const calculateLevel = (serviceName: string, level = 0): number => {
      if (visited.has(serviceName)) {
        return serviceLevels.get(serviceName) || 0;
      }
      
      visited.add(serviceName);
      const dep = dependencies.find(d => d.service_name === serviceName);
      
      if (!dep || dep.depends_on.length === 0) {
        serviceLevels.set(serviceName, 0);
        return 0;
      }

      const maxDependencyLevel = Math.max(
        ...dep.depends_on.map(depName => calculateLevel(depName, level + 1))
      );
      
      const serviceLevel = maxDependencyLevel + 1;
      serviceLevels.set(serviceName, serviceLevel);
      return serviceLevel;
    };

    // Calculate levels for all services
    Array.from(allServices).forEach(service => calculateLevel(service));

    const levelWidth = 300;
    const nodeHeight = 60;

    // Position nodes
    Array.from(allServices).forEach(serviceName => {
      const level = serviceLevels.get(serviceName) || 0;
      const status = serviceHealthMap[serviceName] || 'unhealthy';
      const servicesAtLevel = Array.from(allServices).filter(s => serviceLevels.get(s) === level);
      const indexAtLevel = servicesAtLevel.indexOf(serviceName);
      
      nodes.push({
        id: serviceName,
        label: serviceName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        status,
        x: level * levelWidth,
        y: indexAtLevel * (nodeHeight + 20) + 50,
        level,
        criticalPath: criticalServices.has(serviceName),
      });
    });

    // Create edges
    dependencies.forEach(dep => {
      dep.depends_on.forEach(depService => {
        edges.push({
          from: depService,
          to: dep.service_name,
          criticalPath: dep.critical_path,
        });
      });
    });

    return { nodes, edges, criticalServices };
  }, [dependencies, serviceHealthMap]);

  const filteredNodes = showCriticalPathOnly 
    ? nodes.filter(node => node.criticalPath)
    : nodes;

  const filteredEdges = showCriticalPathOnly
    ? edges.filter(edge => edge.criticalPath)
    : edges;

  const getNodeColor = (status: ServiceHealthStatus['status']) => {
    return HEALTH_STATUS_COLORS[status];
  };

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId === selectedNode ? null : nodeId);
    onServiceClick?.(nodeId);
  };

  const getConnectedServices = (serviceName: string) => {
    const dep = dependencies.find(d => d.service_name === serviceName);
    return {
      dependsOn: dep?.depends_on || [],
      dependentServices: dep?.dependent_services || [],
    };
  };

  if (dependencies.length === 0) {
    return (
      <Card>
        <CardContent>
          <Alert severity="info" icon={<InfoRounded />}>
            No dependency information available
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const svgWidth = Math.max(800, (Math.max(...nodes.map(n => n.level)) + 1) * 300);
  const svgHeight = Math.max(height, Math.max(...nodes.map(n => n.y)) + 100);

  return (
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountTreeRounded />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Service Dependencies
            </Typography>
            {criticalServices.size > 0 && (
              <Chip 
                label={`${criticalServices.size} Critical`} 
                size="small" 
                color="error"
                variant="outlined"
              />
            )}
          </Box>
          
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={showCriticalPathOnly}
                  onChange={(e) => setShowCriticalPathOnly(e.target.checked)}
                  size="small"
                />
              }
              label="Critical Path Only"
            />
            
            <IconButton 
              size="small" 
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.2, 2))}
            >
              <ZoomInRounded />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.2, 0.5))}
            >
              <ZoomOutRounded />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => setZoomLevel(1)}
            >
              <CenterFocusStrongRounded />
            </IconButton>
          </Stack>
        </Stack>

        <Paper 
          sx={{ 
            overflow: 'auto',
            maxHeight: height,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Box
            sx={{
              width: svgWidth * zoomLevel,
              height: svgHeight * zoomLevel,
              minHeight: height,
            }}
          >
            <svg
              width={svgWidth * zoomLevel}
              height={svgHeight * zoomLevel}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              style={{ display: 'block' }}
            >
              {/* Edges */}
              {filteredEdges.map((edge, index) => {
                const fromNode = nodes.find(n => n.id === edge.from);
                const toNode = nodes.find(n => n.id === edge.to);
                
                if (!fromNode || !toNode) return null;

                const x1 = fromNode.x + 120;
                const y1 = fromNode.y + 25;
                const x2 = toNode.x;
                const y2 = toNode.y + 25;

                return (
                  <g key={`edge-${index}`}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={edge.criticalPath ? '#f44336' : '#ccc'}
                      strokeWidth={edge.criticalPath ? 3 : 2}
                      strokeDasharray={edge.criticalPath ? 'none' : '5,5'}
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                );
              })}

              {/* Arrow marker definition */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 10 3.5, 0 7"
                    fill="#666"
                  />
                </marker>
              </defs>

              {/* Nodes */}
              {filteredNodes.map((node) => {
                const isSelected = selectedNode === node.id;
                const connected = getConnectedServices(node.id);
                
                return (
                  <g key={node.id}>
                    <Tooltip
                      title={
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {node.label}
                          </Typography>
                          <Typography variant="body2">Status: {node.status}</Typography>
                          <Typography variant="body2">
                            Depends on: {connected.dependsOn.length || 'None'}
                          </Typography>
                          <Typography variant="body2">
                            Dependents: {connected.dependentServices.length || 'None'}
                          </Typography>
                          {node.criticalPath && (
                            <Chip 
                              label="Critical Path" 
                              size="small" 
                              color="error" 
                              sx={{ mt: 1 }}
                            />
                          )}
                        </Box>
                      }
                    >
                      <g>
                        <rect
                          x={node.x}
                          y={node.y}
                          width="120"
                          height="50"
                          rx="8"
                          fill={getNodeColor(node.status)}
                          fillOpacity={isSelected ? 0.9 : 0.7}
                          stroke={isSelected ? '#000' : node.criticalPath ? '#f44336' : '#ccc'}
                          strokeWidth={isSelected ? 3 : node.criticalPath ? 2 : 1}
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleNodeClick(node.id)}
                        />
                        <text
                          x={node.x + 60}
                          y={node.y + 30}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="11"
                          fontWeight="600"
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          onClick={() => handleNodeClick(node.id)}
                        >
                          {node.label.length > 12 ? `${node.label.slice(0, 12)}...` : node.label}
                        </text>
                      </g>
                    </Tooltip>
                  </g>
                );
              })}
            </svg>
          </Box>
        </Paper>

        {/* Legend */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Legend
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box 
                sx={{ 
                  width: 16, 
                  height: 16, 
                  bgcolor: HEALTH_STATUS_COLORS.healthy,
                  borderRadius: 1,
                }} 
              />
              <Typography variant="body2">Healthy</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box 
                sx={{ 
                  width: 16, 
                  height: 16, 
                  bgcolor: HEALTH_STATUS_COLORS.degraded,
                  borderRadius: 1,
                }} 
              />
              <Typography variant="body2">Degraded</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box 
                sx={{ 
                  width: 16, 
                  height: 16, 
                  bgcolor: HEALTH_STATUS_COLORS.unhealthy,
                  borderRadius: 1,
                }} 
              />
              <Typography variant="body2">Unhealthy</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box 
                sx={{ 
                  width: 16, 
                  height: 2, 
                  bgcolor: '#f44336',
                }} 
              />
              <Typography variant="body2">Critical Path</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box 
                sx={{ 
                  width: 16, 
                  height: 2, 
                  bgcolor: '#ccc',
                  backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 3px, white 3px, white 6px)',
                }} 
              />
              <Typography variant="body2">Dependency</Typography>
            </Box>
          </Stack>
        </Box>

        {selectedNode && (
          <Alert 
            severity="info" 
            sx={{ mt: 2 }}
            onClose={() => setSelectedNode(null)}
          >
            <Typography variant="body2">
              <strong>{selectedNode}</strong> selected. Click on another service to see its details or click here to deselect.
            </Typography>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};