import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
} from '@mui/material';
import {
  PlayArrowRounded,
  StopRounded,
  RefreshRounded,
  CheckCircleRounded,
  ErrorRounded,
  TimerRounded,
  InfoRounded,
  BugReportRounded,
} from '@mui/icons-material';
import { IntegrationTestSuite, IntegrationTestResult } from '../../types';

interface IntegrationTestRunnerProps {
  testSuite: IntegrationTestSuite | null;
  isRunning: boolean;
  onRunTests: () => void;
  onRefresh?: () => void;
  disabled?: boolean;
}

export const IntegrationTestRunner: React.FC<IntegrationTestRunnerProps> = ({
  testSuite,
  isRunning,
  onRunTests,
  onRefresh,
  disabled = false,
}) => {
  const [selectedTest, setSelectedTest] = useState<IntegrationTestResult | null>(null);

  const getStatusIcon = (status: IntegrationTestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircleRounded sx={{ color: 'success.main' }} />;
      case 'failed':
        return <ErrorRounded sx={{ color: 'error.main' }} />;
      case 'running':
        return <TimerRounded sx={{ color: 'info.main' }} />;
      default:
        return <InfoRounded />;
    }
  };

  const getStatusColor = (status: IntegrationTestResult['status']) => {
    switch (status) {
      case 'passed':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatDuration = (durationMs: number) => {
    if (durationMs < 1000) return `${durationMs}ms`;
    const seconds = (durationMs / 1000).toFixed(2);
    return `${seconds}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Auto-refresh when running
  useEffect(() => {
    if (!isRunning || !onRefresh) return;

    const interval = setInterval(() => {
      onRefresh();
    }, 2000);

    return () => clearInterval(interval);
  }, [isRunning, onRefresh]);

  const runningTests = testSuite?.tests.filter(t => t.status === 'running') || [];

  return (
    <>
      <Card>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReportRounded />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Integration Tests
              </Typography>
              {testSuite && (
                <Chip
                  label={testSuite.overall_status.toUpperCase()}
                  color={getStatusColor(testSuite.overall_status) as any}
                  size="small"
                />
              )}
            </Box>

            <Stack direction="row" spacing={1}>
              {onRefresh && (
                <Tooltip title="Refresh test results">
                  <IconButton onClick={onRefresh} disabled={isRunning}>
                    <RefreshRounded />
                  </IconButton>
                </Tooltip>
              )}
              
              <Button
                variant="contained"
                startIcon={isRunning ? <StopRounded /> : <PlayArrowRounded />}
                onClick={onRunTests}
                disabled={disabled}
                color={isRunning ? 'secondary' : 'primary'}
              >
                {isRunning ? 'Running...' : 'Run Tests'}
              </Button>
            </Stack>
          </Stack>

          {/* Test Progress */}
          {isRunning && (
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Running tests...
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {runningTests.length > 0 && `${runningTests.length} running`}
                </Typography>
              </Stack>
              <LinearProgress />
            </Box>
          )}

          {/* Test Summary */}
          {testSuite && (
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  p: 2,
                  bgcolor: 'success.light',
                  borderRadius: 1,
                  minWidth: 100,
                }}>
                  <CheckCircleRounded sx={{ color: 'success.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {testSuite.summary.passed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Passed
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  p: 2,
                  bgcolor: testSuite.summary.failed > 0 ? 'error.light' : 'grey.100',
                  borderRadius: 1,
                  minWidth: 100,
                }}>
                  <ErrorRounded sx={{ color: testSuite.summary.failed > 0 ? 'error.main' : 'grey.500' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {testSuite.summary.failed}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Failed
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  p: 2,
                  bgcolor: 'info.light',
                  borderRadius: 1,
                  minWidth: 100,
                }}>
                  <TimerRounded sx={{ color: 'info.main' }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {formatDuration(testSuite.summary.duration_ms)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Duration
                    </Typography>
                  </Box>
                </Box>
              </Stack>

              <Typography variant="body2" color="text.secondary">
                Last run: {formatTimestamp(testSuite.timestamp)}
              </Typography>
            </Box>
          )}

          {/* Test Results */}
          {testSuite ? (
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                Test Results ({testSuite.tests.length} tests)
              </Typography>

              {testSuite.tests.length === 0 ? (
                <Alert severity="info">
                  No integration tests configured
                </Alert>
              ) : (
                <List>
                  {testSuite.tests.map((test) => (
                    <React.Fragment key={test.test_name}>
                      <ListItem
                        sx={{
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          mb: 1,
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <ListItemIcon>
                          {getStatusIcon(test.status)}
                        </ListItemIcon>
                        
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                {test.test_name}
                              </Typography>
                              <Chip
                                label={test.status.toUpperCase()}
                                size="small"
                                color={getStatusColor(test.status) as any}
                                variant="outlined"
                              />
                              <Typography variant="body2" color="text.secondary">
                                {formatDuration(test.duration_ms)}
                              </Typography>
                            </Stack>
                          }
                          secondary={
                            test.error_message && (
                              <Typography 
                                variant="body2" 
                                color="error.main"
                                sx={{ mt: 0.5 }}
                              >
                                {test.error_message}
                              </Typography>
                            )
                          }
                        />

                        <Stack direction="row" alignItems="center">
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                            {formatTimestamp(test.timestamp)}
                          </Typography>
                          
                          {test.details && (
                            <Tooltip title="Show details">
                              <IconButton
                                size="small"
                                onClick={() => setSelectedTest(test)}
                              >
                                <InfoRounded />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Box>
          ) : (
            <Alert severity="info">
              No test results available. Run tests to see results.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Details Dialog */}
      <Dialog
        open={Boolean(selectedTest)}
        onClose={() => setSelectedTest(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedTest && getStatusIcon(selectedTest.status)}
            <Typography variant="h6">
              {selectedTest?.test_name} - Details
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {selectedTest && (
            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Test Information
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Status:</Typography>
                      <Chip 
                        label={selectedTest.status.toUpperCase()} 
                        size="small" 
                        color={getStatusColor(selectedTest.status) as any}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Duration:</Typography>
                      <Typography variant="body2">{formatDuration(selectedTest.duration_ms)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Timestamp:</Typography>
                      <Typography variant="body2">{formatTimestamp(selectedTest.timestamp)}</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Box>

              {selectedTest.error_message && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Error Message
                  </Typography>
                  <Alert severity="error">
                    {selectedTest.error_message}
                  </Alert>
                </Box>
              )}

              {selectedTest.details && (
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Test Details
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <pre style={{ 
                      whiteSpace: 'pre-wrap', 
                      fontSize: '0.875rem',
                      margin: 0,
                      fontFamily: 'monospace',
                    }}>
                      {JSON.stringify(selectedTest.details, null, 2)}
                    </pre>
                  </Paper>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setSelectedTest(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};