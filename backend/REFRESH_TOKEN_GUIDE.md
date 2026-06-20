# Google OAuth Refresh Token Setup Guide

## Current Issue
Your current `tokens.json` file doesn't have a `refresh_token`, which means the system has to re-authenticate every time the access token expires (every ~1 hour).

## What Changed

### ✅ Fixed Token Refresh Logic
Modified `backend/configs/googleSheetClient.js` to:
1. **Automatically refresh access tokens** when they expire (if refresh_token exists)
2. **Save refreshed tokens** back to tokens.json automatically
3. **Force consent screen** on first auth to get refresh_token

### How Google OAuth Tokens Work
- **Access Token**: Expires after 1 hour, used for API calls
- **Refresh Token**: Never expires (or lasts very long ~6 months), used to get new access tokens
- **With Refresh Token**: System automatically gets new access tokens without re-authentication

## Steps to Get Refresh Token

### Option 1: Re-authenticate (Recommended)

1. **Delete current tokens**:
   ```bash
   cd backend
   del tokens.json
   ```

2. **Restart the backend server**:
   ```bash
   npm start
   ```

3. **Browser will open automatically** showing Google OAuth consent screen

4. **Grant permissions** - Important: You'll see "This app will have access to..." - click **Allow**

5. **New tokens.json will be created** with refresh_token included

6. **Verify refresh_token exists**:
   ```bash
   type tokens.json
   ```

   You should see:
   ```json
   {
     "access_token": "...",
     "refresh_token": "...",  ← This line should be present
     "scope": "...",
     "token_type": "Bearer",
     "expiry_date": ...
   }
   ```

### Option 2: Manual Token Deletion (If server is already running)

1. Stop the server (Ctrl+C)
2. Delete tokens.json
3. Start server again
4. Browser opens → Grant permissions
5. Done!

## How Auto-Refresh Works

Once you have a refresh_token:

1. **Access token expires** (after 1 hour)
2. **System automatically refreshes** on next API call
3. **New access token saved** to tokens.json
4. **No user interaction needed** - seamless!

Console will show:
```
♻️ Access token expired, will auto-refresh on next API call
🔄 Tokens refreshed automatically
💾 Updated tokens saved to tokens.json
```

## Token Lifespan

- **Access Token**: 1 hour (standard Google OAuth, cannot be changed)
- **Refresh Token**: ~6 months (or until revoked)
- **With auto-refresh**: System works seamlessly for ~6 months without re-authentication

## Important Notes

⚠️ **Cannot increase access token duration to 1 day**: Google OAuth standard is 1 hour for access tokens. This is a security feature and cannot be changed.

✅ **Solution**: Use refresh tokens to automatically get new access tokens every hour without user interaction.

🔒 **Security**: Keep tokens.json secure, don't commit to Git (already in .gitignore).

## Troubleshooting

### If refresh still not working:

1. Check `tokens.json` has `refresh_token` field
2. Check console logs for "♻️ Access token expired, will auto-refresh"
3. If you see "⚠️ No valid tokens", delete tokens.json and re-authenticate
4. Make sure `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_SECRET_KEY`, and `GOOGLE_OAUTH_REDIRECT_URI` are set in `.env`

### If OAuth consent screen shows error:

1. Verify OAuth credentials in Google Cloud Console
2. Make sure redirect URI `http://localhost:8000/oauth2callback` is added to authorized redirect URIs
3. Check that all required APIs are enabled (Sheets, Drive, Slides, Docs)
