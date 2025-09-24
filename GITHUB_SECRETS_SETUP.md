# GitHub Secrets Configuration for Admin Dashboard

## Required GitHub Repository Secrets

To deploy the Admin Dashboard with proper API authentication, add these secrets to the GitHub repository:

### Analytics Service Authentication
```
Name: VITE_ANALYTICS_API_KEY
Value: analytics-prod-37341e59036fdca793c95437e5ba178a888bb3aeaca11c281cae796dde91995b
```

### Events Service Authentication (PENDING)
```
Name: VITE_EVENTS_INTERNAL_API_KEY
Value: [TO BE PROVIDED BY EVENTS TEAM]
```

## How to Add Secrets

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add each secret with the exact name and value above

## Verification

Test that secrets are working in GitHub Actions:
```yaml
- name: Test Analytics API
  run: |
    curl -H "X-API-Key: ${{ secrets.VITE_ANALYTICS_API_KEY }}" \
      http://localhost:8001/api/v1/analytics/metrics
```

## Security Notes

- ✅ These secrets are only accessible to GitHub Actions
- ✅ Never commit actual API keys to source code
- ✅ Use environment variables in development
- ⚠️ Consider rotating Analytics key (was exposed in chat)

## Current Status

- ✅ **Analytics API Key**: Configured and tested
- ✅ **Events API Key**: Added to GitHub Secrets by Infra team
- ✅ **Local Development**: Working with .env file
- ✅ **Production Deployment**: Ready for deployment

## Contact

- **Analytics Team**: Key provided ✅
- **Events Team**: Please provide `INTERNAL_API_KEY` value
- **Infra Team**: Ready to add secrets to GitHub