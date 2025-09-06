const { getMonitorsAndTheirParentsOutputDeepEqualIgnoringArrayOrder } = require('./test-utils')
const { getMonitorsAndTheirParents } = require('./utils')


// TODO

// Hierarchy

// 1
// 3          4
// 5 6        7

// 2
// 8          9
// 10 11      12

// ---

// Null -> 1, 2

// 1 -> 3, 4

// 3 -> 5, 6

// 4 -> 7

// 2 -> 8, 9

// 8 -> 10, 11

// 9 -> 12

function TestGetMonitorsAndTheirParents() {
    const testCases = [
        {
            input: {
                '1': {},
                '2': {},
                '3': {
                    parent: 1
                },
                '4': {
                    parent: 1
                },
                '5': {
                    parent: 3
                },
                '6': {
                    parent: 3
                },
                '7': {
                    parent: 4
                },
                '8': {
                    parent: 2
                },
                '9': {
                    parent: 2
                },
                '10': {
                    parent: 8
                },
                '11': {
                    parent: 8
                },
                '12': {
                    parent: 9
                },
            },
            expectedOutput: {
                oldMonitorIDsWithoutParent: ['1', '2'],
                oldMonitorIDsWithTheirChildren: {
                    '1': ['3', '4'],
                    '3': ['5', '6'],
                    '4': ['7'],
                    '5': [],
                    '6': [],
                    '7': [],
                    '2': ['8', '9'],
                    '8': ['10', '11'],
                    '9': ['12'],
                    '10': [],
                    '11': [],
                    '12': [],
                },
            },
        }
        ,
        {
            input: {
                '12': {
                    parent: 9
                },
                '11': {
                    parent: 8
                },
                '10': {
                    parent: 8
                },
                '9': {
                    parent: 2
                },
                '8': {
                    parent: 2
                },
                '7': {
                    parent: 4
                },
                '6': {
                    parent: 3
                },
                '5': {
                    parent: 3
                },
                '4': {
                    parent: 1
                },
                '3': {
                    parent: 1
                },
                '2': {},
                '1': {},
            },
            expectedOutput: {
                oldMonitorIDsWithoutParent: ['1', '2'],
                oldMonitorIDsWithTheirChildren: {
                    '1': ['3', '4'],
                    '3': ['5', '6'],
                    '4': ['7'],
                    '5': [],
                    '6': [],
                    '7': [],
                    '2': ['8', '9'],
                    '8': ['10', '11'],
                    '9': ['12'],
                    '10': [],
                    '11': [],
                    '12': [],
                },
            },
        }
    ]

    for (const testCaseIndex in testCases) {
        console.log(`Running test case index: ${testCaseIndex}`);
        const testCase = testCases[testCaseIndex]
        const output = getMonitorsAndTheirParents(testCase.input)

        if (!getMonitorsAndTheirParentsOutputDeepEqualIgnoringArrayOrder(output, testCase.expectedOutput)) {
            throw Error(`Failure in test case index: ${testCaseIndex}`)
        }
    }
}

TestGetMonitorsAndTheirParents()
