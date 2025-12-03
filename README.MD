# android-version-action v0.1.0

Override your android version number and version code through github actions

## Features
* Override version number to bump version through github actions
* Override version name

## Parameters
`gradlePath`
**Required**, File path to the **Path to the build.gradle file** so that it knows where to find the file that contains the versionCode and versionName attributes.

`versionCode`
**Optional**, Version Code to override

`versionName`
**Optional**, Version Name to override

`versionCodeIncrementBy`
**Optional**, Value for Version Code to be increased by.

`versionNameIncrement`
**Optional**, Increases the selected option. [Major, Minor, Patch]

`SemanticVersioningOptionToIncrement`
**Optional**, Select an option from Major, Minor, or Patch.

## Examples
```
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
      - name: set up JDK 1.11
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: 11.0.22+7
      - name: Bump version
        uses: vamsi-alluri/android-version-actions@v1.2.2
        with:
          gradlePath: app/build.gradle # or app/build.gradle.kts 
          versionCode: ${{github.run_number}}
          versionName: 1.0.0
```

