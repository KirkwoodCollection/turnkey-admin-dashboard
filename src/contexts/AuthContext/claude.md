# AuthContext Provider

## Purpose
React Context provider for managing user authentication state and permissions.

## Context Architecture
Integrates with Firebase Auth to provide authentication state and role-based access control.

## Context Interface
```typescript
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: Permission[];
  role: UserRole;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // Permission checks
  hasPermission: (permission: Permission) => boolean;
  canAccess: (resource: string) => boolean;
}
```

## Provider Implementation
```typescript
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Firebase Auth integration
  // Token management
  // Permission resolution
  // Auto-refresh logic
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Usage Pattern
```typescript
// At app root
<AuthProvider>
  <Router />
</AuthProvider>

// In components
const { user, hasPermission, logout } = useContext(AuthContext);

// Route protection
const ProtectedRoute = ({ children, requiredPermission }) => {
  const { hasPermission } = useAuth();
  return hasPermission(requiredPermission) ? children : <Unauthorized />;
};
```

## Features
- Firebase Auth integration
- Automatic token refresh
- Role-based access control
- Route protection utilities
- Session persistence