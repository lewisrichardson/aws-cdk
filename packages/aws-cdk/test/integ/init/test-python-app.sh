#!/bin/bash
set -eu
# This is a backwards compatibility script. All logic has moved to '@aws-cdk-testing/cli-integ'
# and should be called from there directly.

[[ $VIA_NEW_RUNNER == 1 ]]

exec node_modules/.bin/run-suite --use-version=$VERSION init-python
