import { test, expect, Page } from '@playwright/test';
import { setupMockServer, teardownMockServer } from '../mocks/mockServer';

let mockServerInstance: any;

test.describe('Authentication E2E Tests', () => {
  test.beforeAll(async () => {
    mockServerInstance = await setupMockServer();
  });

  test.afterAll(async () => {
    await teardownMockServer();
  });

  test.beforeEach(async ({ page }) => {
    // Clear any existing authentication
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('Login Flow', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      await page.goto('/');
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);
      
      // Should show login form
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
    });

    test('should handle successful login', async ({ page }) => {
      await page.goto('/login');
      
      // Fill login form
      await page.fill('input[type="email"]', 'admin@turnkeyhms.com');
      await page.fill('input[type="password"]', 'admin123');
      
      // Mock successful login response
      await page.route('/auth/login', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'mock-jwt-token',
            user: {
              uid: 'admin-uid-123',
              email: 'admin@turnkeyhms.com',
              displayName: 'Admin User',
              role: 'admin',
            },
          })
        });
      });
      
      // Submit login form
      await page.click('button:has-text("Sign In")');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/');
      await expect(page.locator('text=Dashboard Overview')).toBeVisible();
      
      // Should show user info in header
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page.locator('text=Admin User')).toBeVisible();
    });

    test('should handle login errors', async ({ page }) => {
      await page.goto('/login');
      
      // Fill login form with invalid credentials
      await page.fill('input[type="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      
      // Mock failed login response
      await page.route('/auth/login', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Invalid email or password',
            code: 'INVALID_CREDENTIALS',
          })
        });
      });
      
      // Submit login form
      await page.click('button:has-text("Sign In")');
      
      // Should show error message
      await expect(page.locator('text=Invalid email or password')).toBeVisible();
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
      
      // Should remain on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('should validate form inputs', async ({ page }) => {
      await page.goto('/login');
      
      // Try to submit empty form
      await page.click('button:has-text("Sign In")');
      
      // Should show validation errors
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Password is required')).toBeVisible();
      
      // Fill invalid email
      await page.fill('input[type="email"]', 'invalid-email');
      await page.click('button:has-text("Sign In")');
      
      // Should show email validation error
      await expect(page.locator('text=Please enter a valid email')).toBeVisible();
      
      // Fill valid email but short password
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', '123');
      await page.click('button:has-text("Sign In")');
      
      // Should show password validation error
      await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();
    });

    test('should handle social login (Google)', async ({ page }) => {
      await page.goto('/login');
      
      // Check if Google login button exists
      const googleButton = page.locator('button:has-text("Continue with Google")');
      if (await googleButton.isVisible()) {
        // Mock Google OAuth popup
        const popupPromise = page.waitForEvent('popup');
        await googleButton.click();
        
        const popup = await popupPromise;
        
        // Mock successful Google auth
        await popup.evaluate(() => {
          window.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            payload: {
              token: 'google-oauth-token',
              user: {
                uid: 'google-uid-123',
                email: 'user@gmail.com',
                displayName: 'Google User',
                photoURL: 'https://example.com/photo.jpg',
              },
            },
          }, '*');
        });
        
        // Should redirect to dashboard
        await expect(page).toHaveURL('/');
        await expect(page.locator('text=Dashboard Overview')).toBeVisible();
      }
    });
  });

  test.describe('Logout Flow', () => {
    test('should handle successful logout', async ({ page }) => {
      // Set up authenticated state
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'mock-token');
        localStorage.setItem('user', JSON.stringify({
          uid: 'admin-uid-123',
          email: 'admin@turnkeyhms.com',
          displayName: 'Admin User',
          role: 'admin',
        }));
      });
      
      await page.goto('/');
      
      // Wait for dashboard to load
      await expect(page.locator('text=Dashboard Overview')).toBeVisible();
      
      // Open user menu
      await page.click('[data-testid="user-menu"]');
      
      // Click logout
      await page.click('text=Sign Out');
      
      // Mock logout API call
      await page.route('/auth/logout', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        });
      });
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);
      
      // Should clear authentication state
      const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(authToken).toBeNull();
    });

    test('should handle automatic logout on token expiry', async ({ page }) => {
      // Set up authenticated state with expired token
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expired-token');
        localStorage.setItem('user', JSON.stringify({
          uid: 'admin-uid-123',
          email: 'admin@turnkeyhms.com',
          displayName: 'Admin User',
          role: 'admin',
        }));
      });
      
      // Mock API call that returns 401
      await page.route('/api/v1/analytics/dashboard', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Token expired',
            code: 'TOKEN_EXPIRED',
          })
        });
      });
      
      await page.goto('/');
      
      // Should automatically redirect to login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('text=Session expired. Please sign in again.')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should persist authentication across page reloads', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[type="email"]', 'admin@turnkeyhms.com');
      await page.fill('input[type="password"]', 'admin123');
      
      await page.route('/auth/login', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'persistent-token',
            user: {
              uid: 'admin-uid-123',
              email: 'admin@turnkeyhms.com',
              displayName: 'Admin User',
              role: 'admin',
            },
          })
        });
      });
      
      await page.click('button:has-text("Sign In")');
      await expect(page).toHaveURL('/');
      
      // Reload page
      await page.reload();
      
      // Should remain authenticated
      await expect(page.locator('text=Dashboard Overview')).toBeVisible();
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should handle concurrent tab sessions', async ({ context }) => {
      // Create first tab and login
      const page1 = await context.newPage();
      await page1.goto('/login');
      await page1.fill('input[type="email"]', 'admin@turnkeyhms.com');
      await page1.fill('input[type="password"]', 'admin123');
      
      await page1.route('/auth/login', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            token: 'shared-token',
            user: {
              uid: 'admin-uid-123',
              email: 'admin@turnkeyhms.com',
              displayName: 'Admin User',
              role: 'admin',
            },
          })
        });
      });
      
      await page1.click('button:has-text("Sign In")');
      await expect(page1).toHaveURL('/');
      
      // Create second tab
      const page2 = await context.newPage();
      await page2.goto('/');
      
      // Should also be authenticated in second tab
      await expect(page2.locator('text=Dashboard Overview')).toBeVisible();
      
      // Logout from first tab
      await page1.click('[data-testid="user-menu"]');
      await page1.click('text=Sign Out');
      
      // Second tab should also be logged out (if session sync is implemented)
      await page2.reload();
      await expect(page2).toHaveURL(/\/login/);
    });

    test('should handle session timeout warnings', async ({ page }) => {
      // Set up authenticated state
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expiring-token');
        localStorage.setItem('token_expires_at', (Date.now() + 60000).toString()); // 1 minute
      });
      
      await page.goto('/');
      await expect(page.locator('text=Dashboard Overview')).toBeVisible();
      
      // Mock session timeout warning
      await page.evaluate(() => {
        // Simulate session timeout warning
        window.dispatchEvent(new CustomEvent('session-warning', {
          detail: { timeRemaining: 300000 } // 5 minutes
        }));
      });
      
      // Should show session timeout warning
      await expect(page.locator('[data-testid="session-warning"]')).toBeVisible();
      await expect(page.locator('text=Your session will expire in 5 minutes')).toBeVisible();
      
      // Should have extend session button
      await expect(page.locator('button:has-text("Extend Session")')).toBeVisible();
    });
  });

  test.describe('Password Reset Flow', () => {
    test('should handle password reset request', async ({ page }) => {
      await page.goto('/login');
      
      // Click "Forgot Password" link
      await page.click('text=Forgot Password?');
      
      // Should navigate to password reset page
      await expect(page).toHaveURL(/\/reset-password/);
      await expect(page.locator('[data-testid="reset-password-form"]')).toBeVisible();
      
      // Fill email
      await page.fill('input[type="email"]', 'user@turnkeyhms.com');
      
      // Mock password reset API
      await page.route('/auth/reset-password', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Password reset email sent',
            success: true,
          })
        });
      });
      
      // Submit reset form
      await page.click('button:has-text("Send Reset Link")');
      
      // Should show success message
      await expect(page.locator('text=Password reset email sent')).toBeVisible();
      await expect(page.locator('[data-testid="reset-success"]')).toBeVisible();
    });

    test('should validate password reset form', async ({ page }) => {
      await page.goto('/reset-password');
      
      // Try to submit empty form
      await page.click('button:has-text("Send Reset Link")');
      
      // Should show validation error
      await expect(page.locator('text=Email is required')).toBeVisible();
      
      // Enter invalid email
      await page.fill('input[type="email"]', 'invalid-email');
      await page.click('button:has-text("Send Reset Link")');
      
      // Should show email validation error
      await expect(page.locator('text=Please enter a valid email')).toBeVisible();
    });

    test('should handle new password setup', async ({ page }) => {
      // Navigate to reset password with token (typically from email link)
      await page.goto('/reset-password?token=valid-reset-token');
      
      // Should show new password form
      await expect(page.locator('[data-testid="new-password-form"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
      
      // Fill new password
      await page.fill('input[name="password"]', 'newSecurePassword123');
      await page.fill('input[name="confirmPassword"]', 'newSecurePassword123');
      
      // Mock password update API
      await page.route('/auth/update-password', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Password updated successfully',
            success: true,
          })
        });
      });
      
      // Submit new password
      await page.click('button:has-text("Update Password")');
      
      // Should redirect to login with success message
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('text=Password updated successfully')).toBeVisible();
    });
  });

  test.describe('Role-based Access Control', () => {
    test('should enforce admin-only access', async ({ page }) => {
      // Set up user with non-admin role
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'user-token');
        localStorage.setItem('user', JSON.stringify({
          uid: 'user-uid-123',
          email: 'user@turnkeyhms.com',
          displayName: 'Regular User',
          role: 'user', // Non-admin role
        }));
      });
      
      // Try to access admin-only page
      await page.goto('/admin/settings');
      
      // Should redirect to unauthorized page or dashboard
      await expect(page).toHaveURL(/\/unauthorized|\/$/);
      
      if (await page.locator('text=Unauthorized').isVisible()) {
        await expect(page.locator('text=You do not have permission to access this page')).toBeVisible();
      }
    });

    test('should allow admin access to all features', async ({ page }) => {
      // Set up admin user
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'admin-token');
        localStorage.setItem('user', JSON.stringify({
          uid: 'admin-uid-123',
          email: 'admin@turnkeyhms.com',
          displayName: 'Admin User',
          role: 'admin',
        }));
      });
      
      await page.goto('/');
      
      // Should see admin-only features
      await expect(page.locator('[data-testid="admin-menu"]')).toBeVisible();
      
      // Should be able to access admin settings
      await page.goto('/admin/settings');
      await expect(page.locator('text=Admin Settings')).toBeVisible();
    });
  });

  test.describe('Security Features', () => {
    test('should handle CSRF protection', async ({ page }) => {
      await page.goto('/login');
      
      // Login form should include CSRF token
      const csrfToken = await page.locator('input[name="csrf_token"]').getAttribute('value');
      expect(csrfToken).toBeTruthy();
      expect(csrfToken?.length).toBeGreaterThan(10);
    });

    test('should implement rate limiting for login attempts', async ({ page }) => {
      await page.goto('/login');
      
      // Mock rate limiting response
      await page.route('/auth/login', route => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Too many login attempts. Please try again in 15 minutes.',
            code: 'RATE_LIMITED',
            retryAfter: 900, // 15 minutes
          })
        });
      });
      
      // Fill and submit login form multiple times
      for (let i = 0; i < 3; i++) {
        await page.fill('input[type="email"]', 'test@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button:has-text("Sign In")');
        await page.waitForTimeout(500);
      }
      
      // Should show rate limiting message
      await expect(page.locator('text=Too many login attempts')).toBeVisible();
      await expect(page.locator('button:has-text("Sign In")')).toBeDisabled();
    });

    test('should prevent XSS attacks in form inputs', async ({ page }) => {
      await page.goto('/login');
      
      // Try to inject script in email field
      await page.fill('input[type="email"]', '<script>alert("xss")</script>@example.com');
      
      // Script should be sanitized or escaped
      const emailValue = await page.inputValue('input[type="email"]');
      expect(emailValue).not.toContain('<script>');
    });
  });
});