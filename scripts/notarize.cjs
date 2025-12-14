/**
 * macOS Notarization Script
 * 
 * This script handles Apple notarization for macOS builds.
 * It only runs when the required environment variables are set.
 * 
 * Required Environment Variables (set in GitHub Secrets):
 * - APPLE_ID: Your Apple Developer account email
 * - APPLE_APP_SPECIFIC_PASSWORD: App-specific password from appleid.apple.com
 * - APPLE_TEAM_ID: Your Apple Developer Team ID
 * 
 * To enable notarization:
 * 1. Create an app-specific password at https://appleid.apple.com
 * 2. Add the secrets to your GitHub repository
 * 3. Set "notarize": true in package.json mac config
 * 4. Set "identity": "Developer ID Application: Your Name (TEAM_ID)" in package.json
 */

const { notarize } = require('@electron/notarize');
const path = require('path');

exports.default = async function notarizing(context) {
    const { electronPlatformName, appOutDir } = context;

    // Only notarize macOS builds
    if (electronPlatformName !== 'darwin') {
        console.log('Skipping notarization: not macOS');
        return;
    }

    // Skip if credentials not provided
    if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD || !process.env.APPLE_TEAM_ID) {
        console.log('Skipping notarization: credentials not provided');
        console.log('To enable notarization, set APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, and APPLE_TEAM_ID');
        return;
    }

    const appName = context.packager.appInfo.productFilename;
    const appPath = path.join(appOutDir, `${appName}.app`);

    console.log(`Notarizing ${appPath}...`);

    try {
        await notarize({
            appPath,
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD,
            teamId: process.env.APPLE_TEAM_ID,
        });
        console.log('Notarization complete!');
    } catch (error) {
        console.error('Notarization failed:', error);
        // Don't fail the build if notarization fails - just warn
        console.warn('Build will continue without notarization');
    }
};
