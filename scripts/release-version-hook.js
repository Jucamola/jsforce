const fs = require('node:fs');

/**
 * Pre-version generation hook for conventional-changelog-action.
 * Ensures the prerelease tag uses the current package.json base version
 * (e.g. 3.12.0 -> 3.12.0-custom.0 instead of bumping patch to 3.12.1-custom.0).
 *
 * @param {string} calculatedVersion - The version calculated by conventional-changelog
 * @returns {string} The version to use
 */
exports.preVersionGeneration = (calculatedVersion) => {
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const baseVersion = pkg.version.replace(/-.*$/, ''); // strip any existing prerelease tag

    // If calculatedVersion is already a prerelease for baseVersion, return it
    if (calculatedVersion.startsWith(`${baseVersion}-`)) {
      return calculatedVersion;
    }

    // Extract identifier count if available (e.g., from '3.12.1-custom.0' -> '0')
    const match = calculatedVersion.match(/-custom\.(\d+)$/);
    const counter = match ? match[1] : '0';

    const customVersion = `${baseVersion}-custom.${counter}`;
    console.log(`preVersionGeneration: overriding ${calculatedVersion} -> ${customVersion}`);
    return customVersion;
  } catch (err) {
    console.error('Error in preVersionGeneration hook:', err);
    return calculatedVersion;
  }
};
