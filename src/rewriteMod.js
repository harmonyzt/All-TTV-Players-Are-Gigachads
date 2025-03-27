"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');

class TwitchPlayers {
    // Using BotCallsigns config file to indicate if liveMode was enabled or not
    constructor() {
        this.CallsignsConfigPath = path.resolve(__dirname, '../../BotCallsigns/config/config.json');
        const data = fs.readFileSync(this.CallsignsConfigPath, 'utf8');
        this.CallsignsConfig = JSON.parse(data);
    }

    preSptLoad(container) {
        // Configuration
        CFG = require("../cfg/config.json");
        const { CFG: config, CallsignsConfig: CallsignConfig } = this;

        // Other
        const RouterService = container.resolve("StaticRouterModService");
        const logger = container.resolve("WinstonLogger");

        // File/Folder Paths
        const sain_NicknamePersonalities = './BepInEx/plugins/SAIN/NicknamePersonalities.json';
        const CallsignsMod = "./user/mods/BotCallsigns";
        // Names/Personalities
        const twitchNames = "./user/mods/TTV-Players/names/ttv_names.json";
        const customNames = "./user/mods/TTV-Players/names/your_names.json";
        const globalNames = require("../names/global_names.json");
        const tempNames = require("../temp/dont_touch.json");

        // For running RouterService once
        let runOnce = 1

        // Check for custom names and personalities file and create if doesn't exist
        if (!fs.existsSync(customNames)) {
            const defaultStructure = {
                customNames: {
                    "RealCustomsRat": "Rat",
                    "team-killer": "Timmy",
                    "Ownage": "Normal",
                    "jinglemyballs": "Chad",
                    "Chad_Slayer": "GigaChad",
                    "Solaraint": "SnappingTurtle",
                    "LVNDMARK": "Wreckless",
                    "zero_deaths": "Wreckless",
                    "NoGenerals": "Wreckless",
                    "inseq": "Wreckless",
                    "MAZA4KST": "Wreckless",
                    "JoinTheSystemm": "Wreckless",
                    "rasty_airsoft": "Wreckless",
                    "B_KOMHATE": "Wreckless",
                    "fiolochka": "Wreckless",
                    "impatiya": "Wreckless",
                    "WithoutAim": "Wreckless",
                    "kroshka_enot": "Wreckless",
                    "amur_game": "Wreckless",
                    "dezy_hhg": "Wreckless",
                    "Gluhar": "Wreckless",
                    "nesp": "Wreckless",
                    "botinok": "Wreckless",
                    "recrent": "Wreckless",
                    "TheRudyGames": "Wreckless",
                    "Yaros_Nefrit": "Wreckless",
                    "Deadp47": "Wreckless",
                    "DISTRUCT": "Wreckless",
                    "GeorG": "Wreckless"
                }
            };
            try {
                fs.writeFileSync(path, JSON.stringify(defaultStructure, null, 2));
                logger.log(`[Twitch Players] Created custom names file at first run: ${path}`, "cyan");
            } catch (error) {
                logger.log(`[Twitch Players] Failed to create file: ${path}`, "red");
            }
        }

        //*************************************************
        //*                  MANAGER                      *
        //*************************************************

        // Check if player is running Performance Improvements mod that causes unknown crashes/bugs with experimental patches on
        const isRunningPerfImp = "./BepInEx/plugins/PerformanceImprovements.dll";
        if (fs.existsSync(isRunningPerfImp)) {
            logger.log("[Twitch Players] You're running Performance Improvements mod which is known to cause crashes/bugs. If you see this message and crash to desktop in raid/experience any bugs, please consider disabling Experimental Patches in Performance Improvements mod settings (F12 Menu).", "yellow");
            logger.log("[Twitch Players] This is just a warning. The mod will continue to function as intended.", "yellow");
        }

        // Check and install/update SAIN preset
        if (config.SAINAutoUpdatePreset) {
            const ourVersionPath = path.resolve(process.cwd(), './user/mods/TTV-Players/preset/Death Wish [Twitch Players]/Info.json');
            const InstalledVersionPath = path.resolve(process.cwd(), './BepInEx/plugins/SAIN/Presets/Death Wish [Twitch Players]/Info.json');
            checkForUpdate(ourVersionPath, InstalledVersionPath);
        }

        if (!CallsignConfig) {
            logger.log("[Twitch Players Config Manager] Bot Callsigns config is missing. Make sure you have installed this mod's dependencies. MOD WILL NOT WORK.", "red");
            return;
        }

        if (config.globalMode && config.randomizePersonalitiesOnServerStart) {
            logger.log("[Twitch Players Config Manager] Global Mode and Randomize Personalities settings are not compatible. Turn off one of the settings. MOD WILL NOT WORK.", "red");
            return;
        }

        if (!config.globalMode && config.randomizePersonalitiesOnServerStart) {
            randomizePersonalitiesWithoutRegenerate();
        }

        // If user has progressive difficulty disabled, always set preset defaults
        if (!config.SAINProgressiveDifficulty && config.SAINAlwaysSetPresetDefaults) {
            adjustDifficulty(50, true);
        }

        if (!config.randomizePersonalitiesOnServerStart && !config.globalMode) {
            pushNewestUpdateToSAIN();
        }

        //*************************************************
        //*                HANDLE NAMES                   *
        //*************************************************

        // Check when BotCallsigns mod will be ready
        function flagChecker() {
            if (fs.existsSync(pathToCallsigns)) {
                logger.log("[Twitch Players | Live Mode] Live mode is ENABLED! This will parse the data from Bot Callsigns names and make a new file with filtered names...", "cyan");

                const namesReadyPath = path.join(__dirname, '../temp/mod.ready');

                // Watch for the presence of 'mod.ready' file inside temp
                const checkForNamesReady = setInterval(() => {
                    if (fs.existsSync(namesReadyPath)) {
                        // Stop checking for the flag and delete it
                        clearInterval(checkForNamesReady);
                        fs.unlinkSync(namesReadyPath);

                        if (!config.junklessLogging)
                            logger.log("[Twitch Players | Live Mode] Detected and removed flag file from BotCallsigns mod for the next run", "cyan");

                        // Check if total number of names were changed and if so, update
                        nameChecker();
                    }
                }, 1000); // 1 second
            } else {
                logger.log("[Twitch Players Config Manager] 'BotCallsigns' folder is missing/was renamed. Make sure you have installed this mod's dependencies. MOD WILL NOT WORK.", "red");
                return;
            }
        }

        function nameChecker() {
            const tempNames = require("../temp/dont_touch.json");
            const BC_BEAR = "./user/mods/BotCallsigns/names/bear.json";
            const BC_USEC = "./user/mods/BotCallsigns/names/usec.json";
            const BC_BEARExtra = "./user/mods/BotCallsigns/config/bear_extra_names.json";
            const BC_USECExtra = "./user/mods/BotCallsigns/config/usec_extra_names.json";

            function countNamesInFile(filePath) {
                try {
                    const data = require(filePath);
                    return data.Names ? data.Names.length : 0;
                } catch (e) {
                    console.error(`Error loading file ${filePath}:`, e);
                    return 0;
                }
            }

            // Get all the names 
            function getAllNames(includeExtra) {
                const files = includeExtra ? [BC_BEAR, BC_USEC, BC_BEARExtra, BC_USECExtra] : [BC_BEAR, BC_USEC];
                let allNames = [];

                files.forEach(file => {
                    try {
                        const data = require(file);
                        if (data.Names && Array.isArray(data.Names)) {
                            allNames = allNames.concat(data.Names);
                        }
                    } catch (e) {
                        console.error(`Error loading file ${file}:`, e);
                    }
                });

                return allNames;
            }

            // Main logic
            if (CallsignConfig.addExtraNames) {
                const totalNames = countNamesInFile(BC_BEAR) + countNamesInFile(BC_USEC) +
                    countNamesInFile(BC_BEARExtra) + countNamesInFile(BC_USECExtra);

                // Rewrite the temp file
                if (totalNames !== tempNames.Names.length) {
                    const allNames = getAllNames(true);
                    const newTempNames = { Names: [...new Set(allNames)] };
                    fs.writeFileSync("../temp/dont_touch.json", JSON.stringify(newTempNames, null, 2));
                }
            } else {
                const totalNames = countNamesInFile(BC_BEAR) + countNamesInFile(BC_USEC);

                // Rewrite the temp file
                if (totalNames !== tempNames.Names.length) {
                    const allNames = getAllNames(false);
                    const newTempNames = { Names: [...new Set(allNames)] };
                    fs.writeFileSync("../temp/dont_touch.json", JSON.stringify(newTempNames, null, 2));
                }
            }
        }

        //*************************************************
        //*             DYNAMIC SAIN PRESET               *
        //*************************************************
        function calculateDifficulty(playerLevel) {
            // This is just to track what's happening
            const baseSettings = {
                VisibleDistCoef: 1.0, //higher = harder
                GainSightCoef: 1.0, //lower = harder
                ScatteringCoef: 1.0, //lower = harder
                HearingDistanceCoef: 1.0, //higher = harder
                AggressionCoef: 1.0, //higher = harder
                PrecisionSpeedCoef: 1.0, //lower = harder
                AccuracySpeedCoef: 1.0, //lower = harder
            };

            const tiers = [
                {
                    levelRange: [1, 4],
                    settings: {
                        VisibleDistCoef: 0.8,
                        GainSightCoef: 1.2,
                        ScatteringCoef: 1.2,
                        HearingDistanceCoef: 0.8,
                        AggressionCoef: 0.8,
                        PrecisionSpeedCoef: 1.2,
                        AccuracySpeedCoef: 1.2,
                    },
                },
                {
                    levelRange: [5, 14],
                    settings: {
                        VisibleDistCoef: 1.0,
                        GainSightCoef: 1.0,
                        ScatteringCoef: 1.0,
                        HearingDistanceCoef: 1.0,
                        AggressionCoef: 1.0,
                        PrecisionSpeedCoef: 1.0,
                        AccuracySpeedCoef: 1.0,
                    },
                },
                {
                    levelRange: [15, 29],
                    settings: {
                        VisibleDistCoef: 1.2,
                        GainSightCoef: 0.9,
                        ScatteringCoef: 0.9,
                        HearingDistanceCoef: 1.2,
                        AggressionCoef: 1.0,
                        PrecisionSpeedCoef: 0.9,
                        AccuracySpeedCoef: 0.9,
                    },
                },
                {
                    levelRange: [30, 39],
                    settings: {
                        VisibleDistCoef: 2.0,
                        GainSightCoef: 0.8,
                        ScatteringCoef: 0.8,
                        HearingDistanceCoef: 1.4,
                        AggressionCoef: 1.0,
                        PrecisionSpeedCoef: 0.8,
                        AccuracySpeedCoef: 0.8,
                    },
                },
                {
                    levelRange: [40, 49],
                    settings: {
                        VisibleDistCoef: 2.2,
                        GainSightCoef: 0.7,
                        ScatteringCoef: 0.7,
                        HearingDistanceCoef: 1.6,
                        AggressionCoef: 1.3,
                        PrecisionSpeedCoef: 0.7,
                        AccuracySpeedCoef: 0.7,
                    },
                },
                {
                    levelRange: [50, 59],
                    settings: {
                        VisibleDistCoef: 2.3,
                        GainSightCoef: 0.6,
                        ScatteringCoef: 0.3,
                        HearingDistanceCoef: 1.8,
                        AggressionCoef: 1.4,
                        PrecisionSpeedCoef: 0.6,
                        AccuracySpeedCoef: 0.6,
                    },
                },
                {
                    levelRange: [60, 99],
                    settings: {
                        VisibleDistCoef: 2.5,
                        GainSightCoef: 0.5,
                        ScatteringCoef: 0.01,
                        HearingDistanceCoef: 2.0,
                        AggressionCoef: 1.5,
                        PrecisionSpeedCoef: 0.3,
                        AccuracySpeedCoef: 0.4,
                    },
                },
            ];

            const tier = tiers.find((t) => playerLevel >= t.levelRange[0] && playerLevel <= t.levelRange[1]);
            return tier ? { tierIndex: tiers.indexOf(tier) + 1, settings: tier.settings } : { tierIndex: 1, settings: tiers[0].settings }; // Defaulting to 1st tier if no match was found (should never happen tbh)
        }

        function adjustDifficulty(playerLevel, silent) {
            if (!silent)
                logger.log(`[Twitch Players] Adjusting difficulties for SAIN preset...`, "cyan")

            const difficultyData = calculateDifficulty(playerLevel);

            const globalSettingsPath = path.join(__dirname, '../preset/Death Wish [Twitch Players]/GlobalSettings.json');
            const source = path.resolve(__dirname, '../preset/Death Wish [Twitch Players]/GlobalSettings.json');
            const destination = path.resolve(process.cwd(), 'BepInEx/plugins/SAIN/Presets/Death Wish [Twitch Players]/GlobalSettings.json');

            // Update GlobalSettings.json
            const globalSettings = JSON.parse(fs.readFileSync(globalSettingsPath, 'utf-8'));
            globalSettings.Difficulty = difficultyData.settings;
            fs.writeFileSync(globalSettingsPath, JSON.stringify(globalSettings, null, 2));

            // Push GlobalSettings.json
            fs.cpSync(source, destination, { recursive: true, force: true });

            if (!silent)
                logger.log(`[Twitch Players] Done adjusting! Your PMC Level: ${playerLevel}. Twitch Players SAIN preset difficulty tier: ${difficultyData.tierIndex}. Have fun! :)`, "cyan")
        }

        //*************************************************
        //*           SAIN PRESET AUTO-UPDATE             *
        //*************************************************
        function checkForUpdate(localVersionPath, remoteVersionPath) {
            const source = path.resolve(__dirname, '../preset/Death Wish [Twitch Players]');
            const destination = path.resolve(process.cwd(), 'BepInEx/plugins/SAIN/Presets/Death Wish [Twitch Players]');

            // Creating folder if it doesn't exist
            if (!fs.existsSync(destination)) {
                if (!config.junklessLogging)
                    logger.log("[Twitch Players Auto-Updater] First time setup detected. Installing SAIN preset...", "cyan");

                fs.mkdirSync(destination, { recursive: true });
                copyFolder(source, destination);
            } else if (config.SAINAutoUpdatePreset) {
                try {
                    const localSAINData = JSON.parse(fs.readFileSync(localVersionPath, 'utf-8'));
                    const remoteSAINData = JSON.parse(fs.readFileSync(remoteVersionPath, 'utf-8'));

                    const localSAINDateVer = localSAINData.DateCreated;
                    const remoteSAINDateVer = remoteSAINData.DateCreated;

                    const comparison = compareDates(localSAINDateVer, remoteSAINDateVer);

                    if (comparison === 1) {
                        logger.log("[Twitch Players Auto-Updater] Detected outdated custom SAIN preset! Updating...", "cyan");
                        copyFolder(source, destination, true);
                    } else {
                        if (!config.junklessLogging) {
                            logger.log("[Twitch Players Auto-Updater] Using latest custom SAIN preset.", "cyan");
                        }
                    }
                } catch (error) {
                    logger.log("[Twitch Players Auto-Updater] Error while trying to update SAIN preset! Please report this to the developer!", "red");
                }
            }
        }

        function compareDates(date1, date2) {
            const d1 = new Date(date1);
            const d2 = new Date(date2);

            if (d1 > d2) return 1;
            if (d1 < d2) return -1;
            return 0;
        }

        //*************************************************
        //*          PERSONALITIES GENERATION             *
        //*************************************************
        
        // Push update
        function pushNewestUpdateToSAIN() {
            if (!fs.existsSync(pathToSAINPersonalities)) {
                logger.log("[Twitch Players] Couldn't find SAIN's personalities file. If you have just updated SAIN to the latest, launch the game client at least once for this mod to work.", "yellow");
                return;
            }

            if (!config.junklessLogging)
                logger.log("[Twitch Players] SAIN personalities file detected!", "green");

            fs.readFile(pathToSAINPersonalities, 'utf8', (err, data) => {
                if (err) throw err;
                const SAINPersData = JSON.parse(data);

                const yourNames = require("../names/your_names.json");
                const combinedNames = {
                    ...ttvNames.generatedTwitchNames,
                    ...yourNames.customNames
                };

                SAINPersData.NicknamePersonalityMatches = config.globalMode ? globalNames.generatedGlobalNames : combinedNames;

                fs.writeFile(pathToSAINPersonalities, JSON.stringify(SAINPersData, null, 2), (err) => {
                    if (err) throw err;
                    logger.log("[Twitch Players] Personalities data was written to SAIN file successfully!", "green");
                });
            });
        }
        //*************************************************
        //*               ROUTER SERVICES                 *
        //*************************************************
        RouterService.registerStaticRouter("TTVGetProfileInfo", [{
            url: "/launcher/profile/info",
            action: async (url, info, sessionId, output) => {
                const profile = JSON.parse(output);
                const playerLevel = profile.currlvl;

                if (playerLevel >= 1 && config.SAINProgressiveDifficulty && runOnce) {
                    if (config.SAINProgressiveDifficultyDesiredProfile == sessionId) {
                        logger.log(`[Twitch Players] Desired profile ${config.SAINProgressiveDifficultyDesiredProfile} logged in.`, "cyan")
                        adjustDifficulty(playerLevel, false);
                        runOnce = 0;
                    } else if (!config.SAINProgressiveDifficultyDesiredProfile && runOnce) {
                        adjustDifficulty(playerLevel, false);
                        runOnce = 0;
                    } else if (config.SAINProgressiveDifficultyDesiredProfile != sessionId && config.SAINProgressiveDifficulty && runOnce) {
                        adjustDifficulty(playerLevel, false);
                        runOnce = 0;
                    }
                }

                return output;
            }
        }], "aki");

        RouterService.registerStaticRouter("TTVCheckProfileLogOut", [{
            url: "/launcher/profiles",
            action: async (url, info, sessionId, output) => {

                // Can run level and difficulty tiering once again
                if (config.SAINProgressiveDifficulty && !config.SAINProgressiveDifficultyDesiredProfile) {
                    runOnce = 1;
                    logger.log(`[Twitch Players] Waiting for user to log in.`, "cyan")
                    adjustDifficulty(1, true);
                }

                return output;
            }
        }], "aki");

    }
}

module.exports = { mod: new TwitchPlayers() };