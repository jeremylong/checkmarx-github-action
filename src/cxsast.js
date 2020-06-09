const core = require('@actions/core')
const utils = require('./utils.js')
const envs = process.env
const GITHUB_REPOSITORY = utils.getLastString(envs.GITHUB_REPOSITORY)
const GITHUB_REF = utils.getLastString(envs.GITHUB_REF)
const GITHUB_WORKSPACE = envs.GITHUB_WORKSPACE
const GITHUB_SHA = envs.GITHUB_SHA ? envs.GITHUB_SHA : "Unknown Commit SHA"
let user
let password
let token
let project
let team
let preset
let config
let scanComment = "git " + GITHUB_REF + "@" + GITHUB_SHA
let high = -1
let medium = -1
let low = -1
let forceScan = false
let incremental = false
let excludeFolders
let excludeFiles
let _private = false
let reportXml
let reportPdf
let reportRtf
let reportCsv
let defaultFolderExclusions = [
    "cxcli", //Folder created when downloading CLI
    "test", // Tests
    "tests", // Tests
    "mock", // Tests
    "mocks", // Tests
    "spec", // Tests
    "unit", // Tests
    "debug", // Tests
    "e2e", //Tests
    "androidTest", // Tests (Android)
    "build", // Build Folders
    "dist", // Build Folders
    "deploy", // Build Folders
    "venv", // Build Folders (Python)
    "maven", // Build Folders
    "gradle", // Build Folders (Android)
    "target", // Build Folders
    "example", // Dead Code
    "examples", // Dead Code
    "samples", // Dead Code
    "bin", // Non-relevant folders
    "gen", // Non-relevant folders
    "out", // Non-relevant folders
    "docs", // Non-relevant folders
    "proguard", // Non-relevant folders (Android)
    "lint", // Non-relevant folders
    "images", // Non-relevant folders
    "swagger", // Non-relevant folders (Swagger)
    "coverage", // Non-relevant folders
    "generated", // Non-relevant folders
    ".vs", // Non-relevant folders (Visual Studio)
    ".idea", // Non-relevant folders (IntelliJ IDEA)
    ".temp", // Non-relevant folders (Temporary)
    ".tmp", // Non-relevant folders (Temporary)
    ".grunt", // Non-relevant folders (Grunt)
    ".cache", // Non-relevant folders (Cache)
    ".dynamodb", // Non-relevant folders (Dinamo DB)
    ".fusebox", // Non-relevant folders (Fusebox)
    ".serverless", // Non-relevant folders (Serverless)
    ".nyc_output", // Non-relevant folders (NYC)
    ".git", // Non-relevant folders (Git)
    ".github", // Non-relevant folders (Github)
    ".dependabot", // Non-relevant folders (Dependabot)
    ".semaphore", // Non-relevant folders (Semaphore CI)
    ".circleci", // Non-relevant folders (Circle CI)
    ".vscode", // Non-relevant folders (VS Code)
    ".nuget", // Non-relevant folders (CSharp)
    ".mvn", // Non-relevant folders (Maven)
    ".m2", // Non-relevant folders (Maven)
    ".DS_Store", // Non-relevant folders
    ".sass-cache", // Non-relevant folders
    ".gradle", // Non-relevant folders (Android)
    "__pycache__", // Non-relevant folders (Python)
    ".pytest_cache", // Non-relevant folders (Python)
    ".settings", // Non-relevant folders (CSharp)
    "res/color*", // Non-relevant folders (Android)
    "res/drawable*", // Non-relevant folders (Android)
    "res/mipmap*", // Non-relevant folders (Android)
    "res/anim*", // Non-relevant folders (Android)
    "*imageset", // Non-relevant folders (IOS)
    "xcuserdata", // Non-relevant folders (IOS)
    "xcshareddata", // Non-relevant folders (IOS)
    "*xcassets", // Non-relevant folders (IOS)
    "*appiconset", // Non-relevant folders (IOS)
    "*xcodeproj", // Non-relevant folders (IOS)
    "*framework", // Non-relevant folders (IOS)
    "*lproj", // Non-relevant folders (IOS)
    "__MACOSX", // Non-relevant folders (IOS)
    "css", // CSS not supported
    "react", //3rd Party Libraries (React)
    "yui", //3rd Party Libraries
    "node_modules", //3rd Party Libraries (Node JS)
    "jquery*", //3rd Party Libraries (JS)
    "angular*", //3rd Party Libraries (JS)
    "bootstrap*", //3rd Party Libraries (JS)
    "modernizr*", //3rd Party Libraries (JS)
    "bower_components", //3rd Party Libraries (Bower)
    "jspm_packages", //3rd Party Libraries (JS)
    "typings",  //3rd Party Libraries (Typescript)
    "dojo", //3rd Party Libraries
    "package", //3rd Party Libraries (CSharp)
    "packages", //3rd Party Libraries (CSharp)
    "vendor", //3rd Party Libraries (Golang)
    "xjs", //3rd Party Libraries (JS)
].join()
let defaultFileExclusions = [
    "**/*.min.js", //3rd Party Libraries (JS)
    "**/*.spec", // Tests (JS/Typescript/Node JS)
    "**/*.spec.*", // Tests (JS/Typescript/Node JS)
    "**/*Test.*", // Tests
    "**/Test*", // Tests
    "**/test*", // Tests
    "**/*Mock*", // Tests
    "**/Mock*", // Tests
    "**/package-lock.json", // 3rd party libraries
    "**/LICENSE", // Non-relevant files
    "**/*.md", // Non-relevant files
    "**/.gitignore", // Non-relevant files
    "**/.npmignore", // Non-relevant files
    "**/.editorconfig", // Non-relevant files
    "**/*.pdf", // Non-relevant files
    "**/*.markdown", // Non-relevant files
    "**/*.db", // Non-relevant files
    "**/*.apk", // Non-relevant files (Android)
    "**/*.ipa", // Non-relevant files (IOS)
    "**/*.ico", // Non-relevant files (Icons)
    "**/*.sh", // Non-relevant files (Bash)
    "**/*.bat", // Non-relevant files (Batch)
    "**/*.ps1", // Non-relevant files (Powershell)
    "**/*.svg", // Non-relevant files (SVG Images)
    "**/*.zip", // Non-relevant files (Zip)
].join()

async function getSastCmd(server, action, skipIfFail) {
    if (utils.isValidUrl(server) && utils.isValidAction(action)) {
        let cxUsername = core.getInput('cxUsername', { required: false })
        let cxPassword = core.getInput('cxPassword', { required: false })
        let cxToken = core.getInput('cxToken', { required: false })
        let cxProject = core.getInput('cxProject', { required: false })
        let cxTeam = core.getInput('cxTeam', { required: true })
        let cxPreset = core.getInput('cxPreset', { required: false })
        let cxHigh = core.getInput('cxHigh', { required: false })
        let cxMedium = core.getInput('cxMedium', { required: false })
        let cxLow = core.getInput('cxLow', { required: false })
        let cxComment = core.getInput('cxComment', { required: false })
        let cxForceScan = core.getInput('cxForceScan', { required: false })
        let cxIncremental = core.getInput('cxIncremental', { required: false })
        let cxExcludeFolders = core.getInput('cxExcludeFolders', { required: false })
        let cxExcludeFiles = core.getInput('cxExcludeFiles', { required: false })
        let cxConfiguration = core.getInput('cxConfiguration', { required: false })
        let cxPrivate = core.getInput('cxPrivate', { required: false })
        let cxReportXML = core.getInput('cxReportXML', { required: false })
        let cxReportPDF = core.getInput('cxReportPDF', { required: false })
        let cxReportRTF = core.getInput('cxReportRTF', { required: false })
        let cxReportCSV = core.getInput('cxReportCSV', { required: false })
        let cxGithubIssues = core.getInput('cxGithubIssues', { required: false })

        if (utils.isValidString(cxToken)) {
            core.info('cxToken was provided')
            token = cxToken.trim()
        } else {
            core.info('cxToken was not provided')
            if (utils.isValidString(cxUsername)) {
                core.info('cxUsername: ' + cxUsername)
                user = cxUsername.trim()
            } else {
                let message = "Please provide 'cxUsername' input (string) : " + cxUsername
                if (skipIfFail && skipIfFail != "false") {
                    core.warning(message)
                    core.warning("Step was skipped")
                    return true
                } else {
                    core.setFailed(message)
                    return
                }
            }

            if (utils.isValidString(cxPassword)) {
                password = cxPassword.trim()
            } else {
                let message = "Please provide 'cxPassword' input (string)"
                if (skipIfFail && skipIfFail != "false") {
                    core.warning(message)
                    core.warning("Step was skipped")
                    return true
                } else {
                    core.setFailed(message)
                    return
                }
            }
        }

        if (utils.isValidString(cxProject)) {
            cxProject = cxProject.trim()
            core.info('cxProject: ' + cxProject)
        } else {
            cxProject = GITHUB_REPOSITORY + "-" + GITHUB_REF
            core.info('cxProject: ' + cxProject)
        }

        if (utils.isValidTeam(cxTeam)) {
            core.info('cxTeam: ' + cxTeam)
            team = cxTeam.trim()
            if(team.indexOf("/") != -1){
                project = team + "/" + cxProject
            } else{
                project = team + "\\" + cxProject
            }
        } else {
            let message = "Please provide 'cxTeam' input (string): " + cxTeam
            if (skipIfFail && skipIfFail != "false") {
                core.warning(message)
                core.warning("Step was skipped")
                return true
            } else {
                core.setFailed(message)
                return
            }
        }

        if (utils.isValidString(cxPreset)) {
            core.info('cxPreset: ' + cxPreset)
            preset = cxPreset.trim()
        } else {
            core.info('"cxPreset" not provided')
            core.info('Default Preset will be used: Checkmarx Default')
        }

        if (utils.isValidString(cxConfiguration)) {
            core.info('cxConfiguration: ' + cxConfiguration)
            config = cxConfiguration.trim()
        } else {
            core.info('"cxConfiguration" not provided')
            core.info('Default Configuration will be used: Default Configuration')
        }

        if (utils.isValidString(cxExcludeFolders)) {
            core.info('cxExcludeFolders: ' + cxExcludeFolders)
            excludeFolders = defaultFolderExclusions + "," + cxExcludeFolders.trim()
            core.info("Following folder exclusions will be applied:")
            core.info(excludeFolders)
        } else {
            excludeFolders = defaultFolderExclusions
            core.info("No 'cxExcludeFolders' input provided")
            core.info("Default Folder exclusions will be applied:")
            core.info(defaultFolderExclusions)
        }

        if (utils.isValidString(cxExcludeFiles)) {
            core.info('cxExcludeFiles: ' + cxExcludeFiles)
            excludeFiles = cxExcludeFiles.trim()
            core.info("Following file exclusions will be applied:")
            core.info(excludeFiles)
        } else {
            core.info("No 'cxExcludeFiles' input provided")
            core.info("Default File exclusions will be applied:")
            core.info(defaultFileExclusions)
        }

        if (utils.isValidString(cxComment)) {
            core.info('cxComment: ' + cxComment)
            scanComment = cxComment.trim()
        } else {
            core.info('"cxComment" not provided')
            core.info('Default Comment will be used: ' + scanComment)
        }

        if (utils.isValidInt(cxHigh)) {
            core.info('cxHigh: ' + cxHigh)
            high = parseInt(cxHigh)
        } else {
            core.info('SAST High Threshold valid not provided : ' + cxHigh)
        }

        if (utils.isValidInt(cxMedium)) {
            core.info('cxMedium: ' + cxMedium)
            medium = parseInt(cxMedium)
        } else {
            core.info('SAST Medium Threshold valid not provided : ' + cxMedium)
        }

        if (utils.isValidInt(cxLow)) {
            core.info('cxLow: ' + cxLow)
            low = parseInt(cxLow)
        } else {
            core.info('SAST Low Threshold valid not provided : ' + cxLow)
        }

        if (utils.isBoolean(cxForceScan)) {
            core.info('cxForceScan: ' + cxForceScan)
            forceScan = cxForceScan
        } else {
            core.info('Force Scan valid flag not provided')
            forceScan = false
        }

        if (utils.isBoolean(cxIncremental)) {
            core.info('cxIncremental: ' + cxIncremental)
            incremental = cxIncremental
        } else {
            core.info('Incremental Scan valid flag not provided')
            incremental = false
        }

        if (utils.isBoolean(cxPrivate)) {
            core.info('cxPrivate: ' + cxPrivate)
            _private = cxPrivate
        } else {
            core.info('Private Scan valid flag not provided')
            _private = false
        }

        if (utils.isValidString(cxReportXML)) {
            core.info('cxReportXML: ' + cxReportXML)
            reportXml = cxReportXML.trim()
        } else {
            core.info("No 'cxReportXML' input provided")
        }

        if (utils.isValidString(cxReportPDF)) {
            core.info('cxReportPDF: ' + cxReportPDF)
            reportPdf = cxReportPDF.trim()
        } else {
            core.info("No 'cxReportPDF' input provided")
        }

        if (utils.isValidString(cxReportRTF)) {
            core.info('cxReportRTF: ' + cxReportRTF)
            reportRtf = cxReportRTF.trim()
        } else {
            core.info("No 'cxReportRTF' input provided")
        }

        if (utils.isValidString(cxReportCSV)) {
            core.info('cxReportCSV: ' + cxReportCSV)
            reportCsv = cxReportCSV.trim()
        } else {
            core.info("No 'cxReportCSV' input provided")
        }


        if (utils.isBoolean(cxGithubIssues)) {
            core.info('cxGithubIssues: ' + cxGithubIssues)
            if (cxGithubIssues && cxGithubIssues != "false") {
                if (!utils.isValidString(reportXml)) {
                    reportXml = "report.xml"
                    core.info('cxReportXML will be the default: ' + reportXml)
                } else {
                    core.info('cxReportXML: ' + cxReportXML)
                }
            }
        } else {
            core.info('cxGithubIssues was not provided')
        }

        let credentials = ""

        if (token && token.length > 0) {
            credentials = " -CxToken " + token
        } else {
            credentials = " -CxUser " + user + " -CxPassword " + password
        }

        if (preset) {
            preset = " -preset \"" + preset + "\""
        } else {
            preset = ""
        }

        let command = action +
            " -CxServer " + server +
            credentials +
            " -ProjectName \"" + project + "\"" +
            preset +
            " -LocationType folder" +
            " -LocationPath \"" + GITHUB_WORKSPACE + "\""

        if (config) {
            command += " -Configuration \"" + config + "\""
        }

        if (excludeFolders) {
            command += " -LocationPathExclude \"" + excludeFolders + "\""
        }

        if (excludeFiles) {
            command += " -LocationFilesExclude \"" + excludeFiles + "\""
        }

        if (high >= 0) {
            command += " -SASTHigh " + high
        }

        if (medium >= 0) {
            command += " -SASTMedium " + medium
        }

        if (low >= 0) {
            command += " -SASTLow " + low
        }

        if (forceScan && forceScan != "false") {
            command += " -ForceScan"
        }

        if (incremental && incremental != "false") {
            command += " -Incremental"
        }

        if (_private && _private != "false") {
            command += " -Private"
        }

        if (scanComment) {
            command += " -Comment \"" + scanComment + "\""
        }

        if (reportXml) {
            command += " -ReportXML \"" + reportXml + "\""
        }

        if (reportPdf) {
            command += " -ReportPDF \"" + reportPdf + "\""
        }

        if (reportRtf) {
            command += " -ReportRTF \"" + reportRtf + "\""
        }

        if (reportCsv) {
            command += " -ReportCSV \"" + reportCsv + "\""
        }

        return command
    } else {
        let message = "Invalid Server or action : " + server + " " + action
        if (skipIfFail && skipIfFail != "false") {
            core.warning(message)
            core.warning("Step was skipped")
            return true
        } else {
            core.setFailed(message)
            return
        }
    }
}

module.exports = {
    getSastCmd: getSastCmd
}