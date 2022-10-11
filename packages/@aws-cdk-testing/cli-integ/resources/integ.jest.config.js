const path = require('path');

module.exports = {
    moduleFileExtensions: [
        "js",
    ],
    testMatch: [
        `<rootDir>/tests/${process.env.TEST_SUITE_NAME}/**/*.integtest.js`,
    ],
    testEnvironment: "node",
    rootDir: path.resolve(__dirname, '..'),
    bail: 1,
    testTimeout: 300000,
    reporters: [
        "default",
          [ "jest-junit", { suiteName: "jest tests", outputDirectory: "coverage" } ]
    ]
};
