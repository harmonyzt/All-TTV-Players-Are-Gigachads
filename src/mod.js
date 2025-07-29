// WARNING TO THE "CURIOUS": TURN BACK NOW.
//
// This code is not optimized, not documented and is not meant to be understood.  
//
// USER ACKNOWLEDGES THAT:
// - Looking at the code voids all warranties
// - "It works on my machine" is the final ruling
// - Any attempts to "fix" it will result in immediate karma
//
// harmony - 3/30/2025

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');

class TwitchPlayers {
    CFG = require("../cfg/config.json");
    // Using BotCallsigns config file
    constructor() {
        this.CallsignsConfigPath = path.resolve(__dirname, '../../BotCallsigns/config/config.json');
        const data = fs.readFileSync(this.CallsignsConfigPath, 'utf8');
        this.CallsignsConfig = JSON.parse(data);
    }

    preSptLoad(container) {
        const { CFG: config, CallsignsConfig: CallsignConfig } = this;

        // Other
        const RouterService = container.resolve("StaticRouterModService");
        const logger = container.resolve("WinstonLogger");

        // File/Folder Paths
        const sain_NicknamePersonalities = './BepInEx/plugins/SAIN/NicknamePersonalities.json';
        const CallsignsMod = "./user/mods/BotCallsigns";

        // Names/Personalities
        const globalNames = require("../names/global_names.json");
        const tempNames = require("../temp/dont_touch.json");
        const twitchNames = "./user/mods/TwitchPlayers/names/ttv_names.json";
        const tempNamesPath = path.resolve(process.cwd(), 'user/mods/TwitchPlayers/temp/dont_touch.json')
        const customNamesPath = path.resolve(process.cwd(), 'user/mods/TwitchPlayers/names/your_names.json')

        // For running RouterService once
        let runOnce = 1

        // Check for custom names and personalities file and create if doesn't exist
        if (!fs.existsSync(customNamesPath)) {
            const defaultStructure = {
                customNames: {
                    "RealCustomsRat": "Rat",
                    "jinglemyballs": "Chad",
                    "Chad_Slayer": "GigaChad",
                    "Solaraint": "Wreckless",
                    "LVNDMARK": "SnappingTurtle",
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
                    "GeorG": "Wreckless",
                    "DrakiaXYZ": "SnappingTurtle",
                    "RaiRaiTheRaichu": "Wreckless",
                    "Refringe": "SnappingTurtle",
                    "Chomp": "SnappingTurtle",
                    "100KmhAMGPeek": "Wreckless",
                    "waffle.lord": "SnappingTurtle",
                    "Amands2Mello": "Wreckless",
                    "CWX": "SnappingTurtle",
                    "Jehree": "Wreckless",
                    "BigShlongHaver": "SnappingTurtle",
                    "BIGDICK18CM": "Wreckless",
                    "Legion": "Wreckless"
                }
            };
            try {
                fs.writeFileSync(customNamesPath, JSON.stringify(defaultStructure, null, 2));
                logger.log(`[Twitch Players] Created missing file: ${customNamesPath}`, "cyan");
            } catch (error) {
                logger.log(`[Twitch Players] Failed to create missing file: ${customNamesPath}. Report to developer.`, "red");
            }
        }

        //*************************************************
        //*                  MISC                         *
        //*************************************************

        function copyFolder(srcFolder, destFolder) {
            try {
                fs.cpSync(srcFolder, destFolder, { recursive: true, force: true });
                logger.log("[Twitch Players Auto-Updater] Successfully installed latest custom SAIN preset. You can find in F6 menu!", "cyan");
            } catch (error) {
                logger.log(`[Twitch Players Auto-Updater] Error when tried updating/installing our SAIN preset! ${error.message}`, "red");
            }
        }

        flagChecker();

        //*************************************************
        //*                 MAIN FUNC                     *
        //*************************************************

        // Check when BotCallsigns mod will be ready
        function flagChecker() {
            if (!fs.existsSync(CallsignsMod)) {
                logger.log("[Twitch Players Validator] 'BotCallsigns' folder is missing/was renamed. Make sure you have installed this mod's dependencies. MOD WILL NOT WORK.", "red");
                return;
            }

            if (config.debugLogging)
                logger.log("[Twitch Players Validator] Waiting for flag...", "cyan");

            const namesReadyPath = path.resolve(__dirname, '../temp/mod.ready');

            // Check if it already exists (it shouldn't)
            if (fs.existsSync(namesReadyPath)) {
                fs.unlinkSync(namesReadyPath);
            }

            const checkForNamesReady = setInterval(() => {
                if (fs.existsSync(namesReadyPath)) {
                    handleFlagFound();
                    clearInterval(checkForNamesReady);
                }
            }, 1000);

            function handleFlagFound() {
                fs.unlinkSync(namesReadyPath);
                if (config.debugLogging)
                    logger.log("[Twitch Players Validator] Detected and removed flag file from BotCallsigns mod for the next run", "cyan");

                nameChecker();
            }
        }

        function nameChecker() {
            const BC_BEAR = path.resolve(process.cwd(), 'user/mods/BotCallsigns/names/bear.json');
            const BC_USEC = path.resolve(process.cwd(), 'user/mods/BotCallsigns/names/usec.json');
            const BC_BEARExtra = path.resolve(process.cwd(), 'user/mods/BotCallsigns/config/bear_extra_names.json');
            const BC_USECExtra = path.resolve(process.cwd(), 'user/mods/BotCallsigns/config/usec_extra_names.json');
            let allNames = [];
            let isTTVfileUpdateNeeded = false;

            function loadNamesFromFile(filePath) {
                try {
                    const rawData = fs.readFileSync(filePath, 'utf-8');
                    const data = JSON.parse(rawData);
                    return data.Names && Array.isArray(data.Names) ? data.Names : [];
                } catch (e) {
                    logger.log(`[Twitch Players Validator] Error loading file ${filePath}: ${e.message}`, "red");
                    return [];
                }
            }

            // Default names
            const mainNames = [
                ...loadNamesFromFile(BC_BEAR),
                ...loadNamesFromFile(BC_USEC)
            ];

            // Extra names if enabled in BotCallsigns
            if (CallsignConfig.addExtraNames) {
                if (config.debugLogging)
                    logger.log("[Twitch Players Validator] Checking Extra names from BotCallsigns", "cyan");

                const extraNames = [
                    ...loadNamesFromFile(BC_BEARExtra),
                    ...loadNamesFromFile(BC_USECExtra)
                ];
                allNames = [...mainNames, ...extraNames];
            } else {
                if (config.debugLogging)
                    logger.log("[Twitch Players Validator] Checking Names from BotCallsigns", "cyan");

                allNames = mainNames;
            }

            // Temporary. Disabled bot callsigns support for now.
            allNames = mainNames;

            const uniqueNames = [...new Set(allNames)];
            const newTempData = { Names: uniqueNames };

            // Check if file update needed
            const namesChanged = (
                uniqueNames.length !== tempNames.Names.length ||
                !uniqueNames.every(name => tempNames.Names.includes(name))
            );

            if (namesChanged) {
                try {
                    fs.writeFileSync(tempNamesPath, JSON.stringify(newTempData, null, 2));
                    isTTVfileUpdateNeeded = true;

                    if (config.debugLogging)
                        logger.log(`[Twitch Players Validator] Updated our temp file with ${uniqueNames.length} names`, "cyan");
                } catch (error) {
                    if (config.debugLogging)
                        logger.log(`[Twitch Players Validator] Failed to update temp file: ${error.message}`, "red");
                }
            } else {
                logger.log("[Twitch Players Validator] No name changes detected", "cyan");
            }

            configManager(newTempData, config.forceMainFileRewrite ? true : isTTVfileUpdateNeeded);

            return newTempData;
        }

        //*************************************************
        //*             CONFIG MANAGER                    *
        //*************************************************

        function configManager(NamesData, updateTTVfile = false) {

            // Check and install/update SAIN preset
            if (config.SAINAutoUpdatePreset) {
                const ourVersionPath = path.resolve(process.cwd(), './user/mods/TwitchPlayers/preset/Death Wish [Twitch Players]/Info.json');
                const InstalledVersionPath = path.resolve(process.cwd(), './BepInEx/plugins/SAIN/Presets/Death Wish [Twitch Players]/Info.json');
                checkForUpdate(ourVersionPath, InstalledVersionPath);
            }

            // If for some reason BotCallsigns config was not found
            if (!CallsignConfig) {
                logger.log("[Twitch Players Config Manager] Bot Callsigns config is missing. Make sure you have installed this mod's dependencies or wait for bot callsigns to create the config first. MOD WILL NOT WORK.", "red");
                return;
            }

            // Tell user to change one of the settings
            if (config.globalMode && config.randomizePersonalitiesOnServerStart) {
                logger.log("[Twitch Players Config Manager] Global Mode and Randomize Personalities settings are not compatible. Turn off one of the settings. MOD WILL NOT WORK.", "red");
                return;
            }

            // If user has progressive difficulty disabled, set preset defaults
            if (!config.SAINProgressiveDifficulty && config.SAINAlwaysSetPresetDefaults) {
                adjustDifficulty(50, true);
            }

            // If update to the file needed, we do that, and then whatever we want after
            if (updateTTVfile) {
                updateTTVJSfile(NamesData);
            } else {
                modThink(NamesData);
            }
        }

        // WTF to do?
        function modThink(NamesData) {
            // If no changes were made to config
            if (!config.randomizePersonalitiesOnServerStart && !config.globalMode) {
                pushNewestUpdateToSAIN();
            }

            // If randomizePersonalitiesOnServerStart
            if (!config.globalMode && config.randomizePersonalitiesOnServerStart) {
                randomizePersonalitiesWithoutRegenerate();
            }

            // If global mode
            if (config.globalMode && !config.randomizePersonalitiesOnServerStart) {
                handleGlobalMode(NamesData);
            }
        }

        //*************************************************
        //*          PERSONALITIES GENERATION             *
        //*************************************************

        function updateTTVJSfile(BotNameData) {
            // Process names
            const TTVNames = BotNameData.Names.filter(exportedTTVName =>
                /twitch|ttv|twiitch|chad|gigachad|youtube|_TV/i.test(exportedTTVName)
            );

            const updatedTTVNames = { generatedTwitchNames: {} };

            TTVNames.forEach(name => {
                updatedTTVNames.generatedTwitchNames[name] = getRandomPersonalityWithWeighting(config.personalitiesToUse);
            });

            fs.readFile(twitchNames, 'utf8', (err, data) => {
                if (err) throw err;

                const ttvNameData = JSON.parse(data);
                ttvNameData.generatedTwitchNames = updatedTTVNames.generatedTwitchNames;
                fs.writeFile(twitchNames, JSON.stringify(ttvNameData, null, 2), (err) => {
                    if (err) throw err;

                    if (config.debugLogging)
                        logger.log("[Twitch Players] Updated our main file ttv_names.json", "cyan");

                    modThink();
                })
            });
        }

        function handleGlobalMode(BotNameData) {
            const configPersonalities = config.personalitiesToUse;

            if (Object.keys(configPersonalities).length > 1) {
                let existingNamesData = JSON.parse(fs.readFileSync(customNamesPath, 'utf8'));

                const allNames = BotNameData.Names;
                const existingNames = existingNamesData.generatedGlobalNames || {};
                const customNames = existingNamesData.customNames || {};

                const updatedAllGlobalNames = { generatedGlobalNames: { ...existingNames } };

                allNames.forEach(name => {
                    if (customNames[name]) {
                        return;
                    }
                    if (existingNames[name]) {
                        return;
                    }
                    updatedAllGlobalNames.generatedGlobalNames[name] = getRandomPersonalityWithWeighting(configPersonalities);
                });

                const pathToGlobalNames = "./user/mods/TwitchPlayers/names/global_names.json";

                fs.readFile(pathToGlobalNames, 'utf8', (err, data) => {
                    if (err) throw err;

                    const ttvNameData = JSON.parse(data);
                    ttvNameData.generatedGlobalNames = { ...ttvNameData.generatedGlobalNames, ...updatedAllGlobalNames.generatedGlobalNames, ...existingNamesData.customNames }

                    fs.writeFile(pathToGlobalNames, JSON.stringify(ttvNameData, null, 2), (err) => {
                        if (err) throw err;
                        logger.log("[Twitch Players Global Mode] Data updated at global_names.json successfully. Pushing changes to SAIN...", "cyan");
                        pushNewestUpdateToSAIN();
                    });
                });
            } else {
                logger.log("[Twitch Players Global Mode] There was only one personality chosen in the config file. Falling back and pushing updates. Disable randomizePersonalitiesOnServerStart or add one more personality for this to work.", "yellow");
                pushNewestUpdateToSAIN();
            }
        }

        // Default handling of randomizing personalities without regenerating ttv_names.json
        function randomizePersonalitiesWithoutRegenerate() {
            const configPersonalities = config.personalitiesToUse;

            if (Object.keys(configPersonalities).length > 1) {
                fs.readFile(twitchNames, 'utf8', (err, data) => {
                    if (err) throw err;

                    const ttvNameData = JSON.parse(data);

                    // Assigning new random personality to the name
                    for (let key in ttvNameData.generatedTwitchNames) {
                        if (ttvNameData.generatedTwitchNames.hasOwnProperty(key)) {
                            ttvNameData.generatedTwitchNames[key] = getRandomPersonalityWithWeighting(configPersonalities);
                        }
                    }

                    fs.writeFile(twitchNames, JSON.stringify(ttvNameData, null, 2), (err) => {
                        if (err) throw err;
                        if (config.debugLogging)
                            logger.log("[Twitch Players] Randomized personalities. Pushing changes to SAIN...", "cyan");

                        pushNewestUpdateToSAIN();
                    })
                });
            } else {
                logger.log("[Twitch Players] There was only one personality chosen in the config file. Falling back and pushing existing names. Global mod won't make any changes.", "yellow");
                pushNewestUpdateToSAIN();
            }
        }

        // Push update
        function pushNewestUpdateToSAIN() {
            if (!fs.existsSync(sain_NicknamePersonalities)) {
                logger.log("[Twitch Players] Couldn't find SAIN's personalities file. If you have just updated SAIN to the latest, launch the game client at least once for this mod to work.", "yellow");
                return;
            }

            if (config.debugLogging)
                logger.log("[Twitch Players] SAIN personalities file detected!", "green");

            fs.readFile(sain_NicknamePersonalities, 'utf8', (err, data) => {
                if (err) throw err;
                const SAINPersData = JSON.parse(data);

                const yourNames = require("../names/your_names.json");

                const rawData = fs.readFileSync(twitchNames, "utf8");
                const twitchNamesFile = JSON.parse(rawData);

                const combinedNames = {
                    ...twitchNamesFile.generatedTwitchNames,
                    ...yourNames.customNames
                };

                SAINPersData.NicknamePersonalityMatches = config.globalMode ? globalNames.generatedGlobalNames : combinedNames;

                fs.writeFile(sain_NicknamePersonalities, JSON.stringify(SAINPersData, null, 2), (err) => {
                    if (err) throw err;

                    logger.log("[Twitch Players] Personalities data was written to SAIN file successfully!", "green");
                });
            });
        }

        //*************************************************
        //*             DYNAMIC SAIN PRESET               *
        //*************************************************
        function calculateDifficulty(playerLevel) {
            // This is just to track what's happening
            const baseSettings = {
                VisibleDistCoef: 1.0, // higher = harder
                GainSightCoef: 1.0, // higher = harder
                ScatteringCoef: 1.0, // lower = harder
                HearingDistanceCoef: 1.0, // higher = harder
                AggressionCoef: 1.0, // higher = harder
                PRECISION_SPEED_COEF: 1.0, // higher = harder
                ACCURACY_SPEED_COEF: 1.0, // lower = harder
            };

            const tiers = [
                {
                    levelRange: [1, 4],
                    settings: {
                        VisibleDistCoef: 1.5,
                        GainSightCoef: 1.0,
                        ScatteringCoef: 0.7,
                        HearingDistanceCoef: 1.3,
                        AggressionCoef: 1.2,
                        PRECISION_SPEED_COEF: 0.8,
                        ACCURACY_SPEED_COEF: 1.0
                    },
                },
                {
                    levelRange: [5, 14],
                    settings: {
                        VisibleDistCoef: 1.5,
                        GainSightCoef: 1.3,
                        ScatteringCoef: 0.7,
                        HearingDistanceCoef: 1.3,
                        AggressionCoef: 1.2,
                        PRECISION_SPEED_COEF: 0.8,
                        ACCURACY_SPEED_COEF: 1.0,
                    },
                },
                {
                    levelRange: [15, 29],
                    settings: {
                        VisibleDistCoef: 2.0,
                        GainSightCoef: 1.5,
                        ScatteringCoef: 0.4,
                        HearingDistanceCoef: 1.6,
                        AggressionCoef: 1.3,
                        PRECISION_SPEED_COEF: 1.2,
                        ACCURACY_SPEED_COEF: 0.8,
                    },
                },
                {
                    levelRange: [30, 39],
                    settings: {
                        VisibleDistCoef: 2.3,
                        GainSightCoef: 2.5,
                        ScatteringCoef: 0.2,
                        HearingDistanceCoef: 1.8,
                        AggressionCoef: 1.4,
                        PRECISION_SPEED_COEF: 2.0,
                        ACCURACY_SPEED_COEF: 0.6,
                    },
                },
                {
                    levelRange: [40, 49],
                    settings: {
                        VisibleDistCoef: 2.5,
                        GainSightCoef: 3.0,
                        ScatteringCoef: 0.1,
                        HearingDistanceCoef: 1.9,
                        AggressionCoef: 1.5,
                        PRECISION_SPEED_COEF: 4.0,
                        ACCURACY_SPEED_COEF: 0.3,
                    },
                },
                {
                    levelRange: [50, 59],
                    settings: {
                        VisibleDistCoef: 3.0,
                        GainSightCoef: 4.0,
                        ScatteringCoef: 0.01,
                        HearingDistanceCoef: 1.0,
                        AggressionCoef: 1.0,
                        PRECISION_SPEED_COEF: 6.0,
                        ACCURACY_SPEED_COEF: 0.1
                    },
                },
                {
                    levelRange: [60, 99],
                    settings: {
                        VisibleDistCoef: 3.2,
                        GainSightCoef: 5.0,
                        ScatteringCoef: 0.01,
                        HearingDistanceCoef: 2.2,
                        AggressionCoef: 1.5,
                        PRECISION_SPEED_COEF: 6.5,
                        ACCURACY_SPEED_COEF: 0.05
                    },
                },
            ];

            const tier = tiers.find((t) => playerLevel >= t.levelRange[0] && playerLevel <= t.levelRange[1]);
            return tier ? { tierIndex: tiers.indexOf(tier) + 1, settings: tier.settings } : { tierIndex: 1, settings: tiers[0].settings }; // Defaulting to 1st tier if no match was found (should never happen tbh)
        }

        function adjustDifficulty(playerLevel, silent) {
            if (!silent)
                logger.log(`[Twitch Players] Adjusting global difficulties for our SAIN preset...`, "cyan")

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
                if (config.debugLogging)
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
                        if (config.debugLogging)
                            logger.log("[Twitch Players Auto-Updater] Using latest custom SAIN preset.", "cyan");
                    }
                } catch (error) {
                    logger.log(`[Twitch Players Auto-Updater] Error while trying to update SAIN preset! Please report this to the developer! ${error}`, "red");
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
        //*               ROUTERS AND UTILS               *
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
                if (config.SAINProgressiveDifficulty && config.SAINProgressiveDifficultyDesiredProfile == sessionId || config.SAINProgressiveDifficulty && !config.SAINProgressiveDifficultyDesiredProfile) {
                    runOnce = 1;
                    logger.log(`[Twitch Players] Waiting for user to log in.`, "cyan")
                    adjustDifficulty(1, true);
                }

                return output;
            }
        }], "aki");

        function getRandomPersonalityWithWeighting(personalities) {
            const totalWeight = Object.values(personalities).reduce((sum, weight) => sum + weight, 0);
            const random = Math.random() * totalWeight;

            let cumulativeWeight = 0;
            for (const [personality, weight] of Object.entries(personalities)) {
                cumulativeWeight += weight;
                if (random < cumulativeWeight) {
                    return personality;
                }
            }
        }

    }
}

module.exports = { mod: new TwitchPlayers() };