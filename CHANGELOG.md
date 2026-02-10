# Change Log

## 1.2.0 - Feb 10, 2026

- Fix binary script (to pull update paths from createDatabaseRunner instead of handling it on it's own). So it all comes from one source of truth
  - Add `getAvailableScripts` method to runners internal API
- **Make API stricter for script names**
  - The library requires that a script name is the full filename not the filename without extension
    - So `npx sanity-runner my-script` becomes `npx sanity-runner my-script.js`
  - There is a new config option for extensions (regex) that determine what scripts to search for in updated dir

## 1.1.0 - Feb 10, 2026

- **Fix path issues**
  - Fix issue in how update scripts were being resolved
    - Was allowing relative paths to import() which doesn't make sense (as they are relative to the file calling import which is outside users control). Now they are resolved to project and users config.paths.updates and import() is always given absolute path
  - Fix how paths are resolved
    - If you pass absolute paths you get them, if you pass relative it's resolved relative to cwd 
  - Add logs for the resolved paths to the script startup for debugging/confirmation
- Test with latest version of Sanity tools
  - Update manual-test from sanity and sanity/cli from 4.20.3 to 5.9.0 (to test)