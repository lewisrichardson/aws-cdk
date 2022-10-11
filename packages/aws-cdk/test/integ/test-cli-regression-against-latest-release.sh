#!/bin/bash
set -eu
# This is a backwards compatibility script. All logic has moved to '@aws-cdk-testing/cli-integ'
# and should be called from there directly.

[[ $VIA_NEW_RUNNER == 1 ]]
# Contract: '@aws-cdk-testing/cli-integ' package is installed in NPM root in current directory

previous=$(node_modules/.bin/query-github last-release --prior-to $VERSION)

# Install the right version of @aws-cdk-testing/cli-integ
mkdir the_tests
npm install --prefix the_tests --no-save --force @aws-cdk-testing/cli-integ@$previous || {
    echo "During migration, @aws-cdk-testing/cli-integ@$previous does not exist yet." >&2
    exit 0
}

# Apply new patches to old tests
node_modules/.bin/apply-patches $previous $(the_tests/node_modules/.bin/test-root)

# Old tests, new CLI, old framework
exec the_tests/node_modules/.bin/run-suite --use-version=$VERSION --framework-version=$previous cli-integ-tests
