const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

const versionCodeRegexPattern = /(versionCode(?:\s|=)*)(.*)/;
const versionNameRegexPattern = /(versionName(?:\s|=)*)(.*)/;

try {
    const gradlePath = core.getInput('gradlePath', { required: true });
    
    // Specific overrides
    const specificVersionCode = core.getInput('versionCode');
    const specificVersionName = core.getInput('versionName');
    
    // Increment-based inputs
    const versionCodeIncrementBy = core.getInput('versionCodeIncrementBy');
    const versionNameIncrementType = core.getInput('SemanticVersioningOptionToIncrement'); // 'major', 'minor', or 'patch'

    core.info(`Gradle Path: ${gradlePath}`);
    core.info(`Input - specificVersionCode: ${specificVersionCode || 'none'}`);
    core.info(`Input - specificVersionName: ${specificVersionName || 'none'}`);
    core.info(`Input - versionCodeIncrementBy: ${versionCodeIncrementBy || 'none'}`);
    core.info(`Input - versionNameIncrementType: ${versionNameIncrementType || 'none'}`);
    core.info(`Github run number: ${github.context.runNumber}`);

    let fileContents = fs.readFileSync(gradlePath, 'utf8');

    // --- 3. Before updating, get current values ---
    const oldVersionCodeMatch = fileContents.match(versionCodeRegexPattern);
    if (!oldVersionCodeMatch) {
        throw new Error(`Could not find 'versionCode' in ${gradlePath}`);
    }
    // Get the captured group (the number) and parse it as an integer
    const currentVersionCode = parseInt(oldVersionCodeMatch[2].trim());
    core.info(`Found current versionCode: ${currentVersionCode}`);

    const oldVersionNameMatch = fileContents.match(versionNameRegexPattern);
    if (!oldVersionNameMatch) {
        throw new Error(`Could not find 'versionName' in ${gradlePath}`);
    }
    // Get the captured group (the string) and remove any quotes
    const currentVersionName = oldVersionNameMatch[2].trim().replace(/"/g, '').replace(/'/g, '');
    core.info(`Found current versionName: ${currentVersionName}`);


    // --- 4. Determine Final Version Code ---
    // We'll update this variable based on the logic
    let finalVersionCode = currentVersionCode;
    let didUpdateCode = false;

    // Priority 1: Use specificVersionCode if provided
    if (specificVersionCode) {
        finalVersionCode = parseInt(specificVersionCode);
        if (isNaN(finalVersionCode)) {
            throw new Error(`'versionCode' is not a valid number: ${specificVersionCode}`);
        }
        didUpdateCode = true;
        core.info(`Using specific versionCode: ${finalVersionCode}`);
    
    // Priority 2: Use versionCodeIncrementBy if no specific code was given
    } else if (versionCodeIncrementBy) {
        const increment = parseInt(versionCodeIncrementBy);
        if (isNaN(increment)) {
            throw new Error(`'versionCodeIncrementBy' is not a valid number: ${versionCodeIncrementBy}`);
        }
        finalVersionCode = currentVersionCode + increment;
        didUpdateCode = true;
        core.info(`Incrementing versionCode by ${increment} to: ${finalVersionCode}`);
    }


    // --- 5. Determine Final Version Name ---
    let finalVersionName = currentVersionName;
    let didUpdateName = false;

    // Priority 1: Use specificVersionName if provided
    if (specificVersionName) {
        finalVersionName = specificVersionName;
        didUpdateName = true;
        core.info(`Using specific versionName: ${finalVersionName}`);
    
    // Priority 2: Use versionNameIncrementType if no specific name was given
    } else if (versionNameIncrementType && versionNameIncrementType.length > 0) {
        core.info(`Bumping versionName by type: ${versionNameIncrementType}`);
        
        // Parse "1.2.5" into [1, 2, 5]
        const parts = currentVersionName.split('.').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) {
            throw new Error(`Current versionName '${currentVersionName}' is not a valid Major.Minor.Patch format.`);
        }
        
        let [major, minor, patch] = parts;

        switch (versionNameIncrementType.toLowerCase()) {
            case 'major':
                major++;
                minor = 0;
                patch = 0;
                break;
            case 'minor':
                minor++;
                patch = 0;
                break;
            case 'patch':
                patch++;
                break;
            default:
                // If the input is empty or invalid, just warn and do nothing
                core.warning(`Invalid 'SemanticVersioningOptionToIncrement': ${versionNameIncrementType}. Must be 'major', 'minor', or 'patch'. Ignoring name bump.`);
        }

        // Re-assemble the version string
        const newVersionName = `${major}.${minor}.${patch}`;

        // Only set if it actually changed
        if (newVersionName !== currentVersionName) {
            finalVersionName = newVersionName;
            didUpdateName = true;
            core.info(`New bumped versionName: ${finalVersionName}`);
        }
    }

    if (!didUpdateCode && !didUpdateName) {
        core.info("No updates to versionCode or versionName needed based on the config. Exiting.");
        core.setOutput("result", "No changes made");
        return;
    }

    // --- 6. Apply Changes to File Contents ---
    let newFileContents = fileContents;
    if (didUpdateCode) {
        // $1 is the captured group "versionCode " (or "versionCode = ")
        newFileContents = newFileContents.replace(versionCodeRegexPattern, `$1${finalVersionCode}`);
    }
    if (didUpdateName) {
        // $1 is the captured group "versionName ". We add quotes back for safety.
        newFileContents = newFileContents.replace(versionNameRegexPattern, `$1"${finalVersionName}"`);
    }

    // --- 7. Write File ---
    fs.writeFileSync(gradlePath, newFileContents, 'utf8');
    
    core.info("Successfully updated build.gradle.");
    
    // --- 8. Set Outputs ---
    if (didUpdateCode) {
         core.setOutput("newVersionCode", finalVersionCode);
    }
    if (didUpdateName) {
         core.setOutput("newVersionName", finalVersionName);
    }
    core.setOutput("result", "Done");

} catch (error) {
    core.setFailed(error.message);
}