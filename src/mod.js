"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');

class ttvPlayers {
    CFG = require("../cfg/config.json");

    // Using BotCallsigns config file to indicate if liveMode was enabled or not
    constructor() {
        this.BotCallsignsConfigPath = path.resolve(__dirname, '../../BotCallsigns/config/config.json');
        const data = fs.readFileSync(this.BotCallsignsConfigPath, 'utf8');
        this.BotCallsignsConfig = JSON.parse(data);
    }

    preSptLoad(container) {
        const RouterService = container.resolve("StaticRouterModService");
        const logger = container.resolve("WinstonLogger");

        var runOnce = 1;

        RouterService.registerStaticRouter("CheckForProfileGet", [{
            url: "/launcher/profile/info",
            action: async (url, info, sessionId, output) => {
                const profile = JSON.parse(output);
                const playerLevel = profile.currlvl;

                if (playerLevel >= 1 && this.CFG.SAINProgressiveDifficulty && runOnce) {
                    adjustDifficulty(playerLevel);
                    runOnce = 0;
                }

                return output;
            }
        }], "aki");

        RouterService.registerStaticRouter("CheckProfileLogOut", [{
            url: "/launcher/profiles",
            action: async (url, info, sessionId, output) => {

                // Can run level and difficulty tier once again
                if(this.CFG.SAINProgressiveDifficulty && runOnce == 0){
                    runOnce = 1;
                    logger.log(`[Twitch Players] SAIN progressive difficulty adjustment can be ran again once user logs in`, "cyan")
                }

                return output;
            }
        }], "aki");

        RouterService.registerStaticRouter("CheckPRegister", [{
            url: "/launcher/profile/register",
            action: async (url, info, sessionId, output) => {

                // Can run level and difficulty tier once again
                if(this.CFG.SAINProgressiveDifficulty && runOnce == 0){
                    runOnce = 1;
                    logger.log(`[Twitch Players] New profile created. SAIN progressive difficulty adjustment can be ran again`, "cyan")
                }

                return output;
            }
        }], "aki");


        //*************************************************
        //*             DYNAMIC SAIN PRESET               *
        //*************************************************
        function calculateDifficulty(playerLevel) {

            // This is just to track what's happening
            const baseSettings = {
                VisibleDistCoef: 1.0, //higher = hard
                GainSightCoef: 1.0, //lower = hard
                ScatteringCoef: 1.0, //lower = hard
                HearingDistanceCoef: 1.0, //higher = hard
                AggressionCoef: 1.0, //higher = hard
                PrecisionSpeedCoef: 1.0, //lower = hard
                AccuracySpeedCoef: 1.0, //lower = hard
            };

            const tiers = [
                {
                    levelRange: [1, 9],
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
                    levelRange: [10, 19],
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
                    levelRange: [20, 29],
                    settings: {
                        VisibleDistCoef: 1.2,
                        GainSightCoef: 0.9,
                        ScatteringCoef: 0.9,
                        HearingDistanceCoef: 1.2,
                        AggressionCoef: 1.2,
                        PrecisionSpeedCoef: 0.9,
                        AccuracySpeedCoef: 0.9,
                    },
                },
                {
                    levelRange: [30, 39],
                    settings: {
                        VisibleDistCoef: 1.4,
                        GainSightCoef: 0.8,
                        ScatteringCoef: 0.8,
                        HearingDistanceCoef: 1.4,
                        AggressionCoef: 1.4,
                        PrecisionSpeedCoef: 0.8,
                        AccuracySpeedCoef: 0.8,
                    },
                },
                {
                    levelRange: [40, 49],
                    settings: {
                        VisibleDistCoef: 1.6,
                        GainSightCoef: 0.7,
                        ScatteringCoef: 0.7,
                        HearingDistanceCoef: 1.6,
                        AggressionCoef: 1.6,
                        PrecisionSpeedCoef: 0.7,
                        AccuracySpeedCoef: 0.7,
                    },
                },
                {
                    levelRange: [50, 59],
                    settings: {
                        VisibleDistCoef: 1.8,
                        GainSightCoef: 0.6,
                        ScatteringCoef: 0.3,
                        HearingDistanceCoef: 1.8,
                        AggressionCoef: 1.8,
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
                        AggressionCoef: 2.0,
                        PrecisionSpeedCoef: 0.45,
                        AccuracySpeedCoef: 0.45,
                    },
                },
            ];

            //doesnt look too hard, but took me 1000000 years.
            const tier = tiers.find((t) => playerLevel >= t.levelRange[0] && playerLevel <= t.levelRange[1]);
            return tier ? { tierIndex: tiers.indexOf(tier) + 1, settings: tier.settings } : { tierIndex: 1, settings: tiers[0].settings }; // Defaulting to 1st tier if no match was found (should never happen tbh)
        }


        function adjustDifficulty(playerLevel) {
            logger.log(`[Twitch Players] Adjusting difficulties for SAIN preset... Current PMC level: ${playerLevel}`, "cyan")
            const difficultyData = calculateDifficulty(playerLevel);

            const globalSettingsPath = path.join(__dirname, '../preset/Death Wish [Twitch Players]/GlobalSettings.json');
            const source = path.resolve(__dirname, '../preset/Death Wish [Twitch Players]');
            const destination = path.resolve(process.cwd(), 'BepInEx/plugins/SAIN/Presets/Death Wish [Twitch Players]');

            // Update GlobalSettings.json and push the preset
            const globalSettings = JSON.parse(fs.readFileSync(globalSettingsPath, 'utf-8'));
            globalSettings.Difficulty = difficultyData.settings;
            fs.writeFileSync(globalSettingsPath, JSON.stringify(globalSettings, null, 2));

            // Update SAIN preset fully
            fs.cpSync(source, destination, { recursive: true, force: true });

            logger.log(`[Twitch Players] Done! Current PMC Level: ${playerLevel}. SAIN Difficulty Tier: ${difficultyData.tierIndex}. Have fun! :)`, "cyan")
        }
    }

    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const { CFG: config, BotCallsignsConfig: BCConfig } = this;

        if (!BCConfig) {
            logger.log("[Twitch Players] Bot Callsigns config missing. MOD WILL NOT WORK.", "red");
            return;
        }

        const pathToSAINPersonalities = './BepInEx/plugins/SAIN/NicknamePersonalities.json';
        const pathToCallsigns = "./user/mods/BotCallsigns";
        const pathToTTVNames = "./user/mods/TTV-Players/names/ttv_names.json";
        const pathToGlobalNames = "./user/mods/TTV-Players/names/global_names.json";

        if (!BCConfig) {
            logger.log("[Twitch Players] COULD NOT LOAD BOT CALLSIGNS CONFIG FILE. MAKE SURE YOU HAVE BOT CALLSIGNS MOD INSTALLED RIGHT. MOD WILL NOT WORK.", "red");
            return;
        }

        // For updating SAIN preset
        const ourVersionPath = path.resolve(process.cwd(), './user/mods/TTV-Players/preset/Death Wish [Twitch Players]/Info.json');
        const InstalledVersionPath = path.resolve(process.cwd(), './BepInEx/plugins/SAIN/Presets/Death Wish [Twitch Players]/Info.json');

        // Check and install/update SAIN preset
        checkForUpdate(ourVersionPath, InstalledVersionPath);

        // Loading names
        const ttvNames = require("../names/ttv_names.json");
        const yourNames = require("../names/your_names.json");
        const globalNames = require("../names/global_names.json");

        // Generate a new file with twitch names if we have liveMode enabled. This file will be pushed to SAIN's personalities once done
        if (fs.existsSync(pathToCallsigns) && BCConfig.liveMode && !config.globalMode) {
            logger.log("[Twitch Players | Live Mode] Live mode is ENABLED! This will parse the data from BotCallsign names and make a new file with filtered names...", "cyan");

            const namesReadyPath = path.join(__dirname, '../temp/names.ready');

            // Watch for the presence of 'names.ready' file inside temp
            const checkForNamesReady = setInterval(() => {
                if (fs.existsSync(namesReadyPath)) {
                    // Stop checking for the flag
                    clearInterval(checkForNamesReady);

                    // Delete that flag
                    fs.unlinkSync(namesReadyPath);
                    logger.log("[Twitch Players | Live Mode] Detected and removed flag file from BotCallsigns mod for the next run", "cyan");

                    generateTTVPersonalities(BCConfig.liveMode);
                }
            }, 1000); // Check every 1 second for names.ready
        } else if (config.randomizePersonalitiesOnServerStart) {
            randomizePersonalitiesWithoutRegenerate();
        }

        //function getRandomPersonalityIgnoreWeights(personalities) {
        //    const personalityModes = Object.keys(personalities);
        //    if (personalityModes.length > 1) {
        //        return personalityModes[Math.floor(Math.random() * personalityModes.length)];
        //    } else {
        //        return personalityModes[0];
        //    }
        //}

        //*************************************************
        //*        RANDOM PERSONALITY ASSIGNMENT           *
        //*************************************************
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

        // Main Function
        // Proccesses and pushes changes from fresh names_temp.json file if liveMode was enabled
        function generateTTVPersonalities(_liveMode) {
            if (!_liveMode && config.globalMode) {
                randomizePersonalitiesGlobalMode();
                return;
            }

            let callsignAllNames;
            const namesTempPath = path.join(__dirname, '../temp/names_temp.json');

            try {
                callsignAllNames = require(namesTempPath);

                if (!callsignAllNames) {
                    logger.log("[Twitch Players | Live Mode] File names_temp.json is empty... This shouldn't happen! Report this to the developer ASAP! You may want to disable live mode!", "red");
                    return;
                }

                logger.log("[Twitch Players | Live Mode] Loaded BotCallsigns names...", "cyan");
            } catch (error) {
                logger.log("[Twitch Players | Live Mode] There was an error with loading names_temp.json! Make sure it exists in the temp mod directory!", "red");
                return;
            }

            // Process names
            const TTVNames = JSON.stringify(callsignAllNames.names.filter(exportedTTVName => /twitch|ttv|twiitch|_TV/i.test(exportedTTVName)));
            const parsedTTVNames = JSON.parse(TTVNames);
            const updatedTTVNames = { generatedTwitchNames: {} };

            parsedTTVNames.forEach(name => {
                updatedTTVNames.generatedTwitchNames[name] = getRandomPersonalityWithWeighting(config.personalitiesToUse);
            });

            fs.readFile(pathToTTVNames, 'utf8', (err, data) => {
                if (err) throw err;

                const ttvNameData = JSON.parse(data);
                ttvNameData.generatedTwitchNames = updatedTTVNames.generatedTwitchNames;
                fs.writeFile(pathToTTVNames, JSON.stringify(ttvNameData, null, 2), (err) => {
                    if (err) throw err;
                    logger.log("[Twitch Players | Live Mode] Data updated at ttv_names.json successfully! Pushing changes to SAIN...", "cyan");
                    pushNewestUpdateToSAIN(config.globalMode, BCConfig.liveMode);
                })
            });
        }

        function randomizePersonalitiesWithoutRegenerate() {
            const configPersonalities = config.personalitiesToUse;

            if (Object.keys(configPersonalities).length > 1) {
                fs.readFile(pathToTTVNames, 'utf8', (err, data) => {
                    if (err) throw err;

                    const ttvNameData = JSON.parse(data);

                    // Assigning new random personality to the name
                    for (let key in ttvNameData.generatedTwitchNames) {
                        if (ttvNameData.generatedTwitchNames.hasOwnProperty(key)) {
                            ttvNameData.generatedTwitchNames[key] = getRandomPersonalityWithWeighting(configPersonalities);
                        }
                    }

                    fs.writeFile(pathToTTVNames, JSON.stringify(ttvNameData, null, 2), (err) => {
                        if (err) throw err;
                        logger.log("[Twitch Players] Randomized personalities. Pushing changes to SAIN...", "cyan");
                        pushNewestUpdateToSAIN(config.globalMode, BCConfig.liveMode);
                    })
                });
            } else {
                logger.log("[Twitch Players] There was only one personality chosen in the config file. Falling back and pushing updates. Global mod won't make any changes.", "yellow");
                pushNewestUpdateToSAIN(config.globalMode, BCConfig.liveMode);
            }
        }

        function randomizePersonalitiesGlobalMode() {
            const configPersonalities = config.personalitiesToUse;

            const namesTempPath = path.join(__dirname, '../temp/names_temp.json');

            if (Object.keys(configPersonalities).length > 1) {
                const namesTempPath = path.join(__dirname, '../temp/names_temp.json');
                let callsignAllNames = require(namesTempPath);


                const AllNames = JSON.stringify(callsignAllNames.names);
                const parsedAllNames = JSON.parse(AllNames);
                const updatedAllGlobalNames = { generatedGlobalNames: {} };

                parsedAllNames.forEach(name => {
                    updatedAllGlobalNames.generatedGlobalNames[name] = getRandomPersonalityForGlobalMode(personalityModes);
                });

                fs.readFile(pathToGlobalNames, 'utf8', (err, data) => {
                    if (err) throw err;

                    const ttvNameData = JSON.parse(data);
                    ttvNameData.generatedGlobalNames = updatedAllGlobalNames.generatedGlobalNames;
                    fs.writeFile(pathToGlobalNames, JSON.stringify(ttvNameData, null, 2), (err) => {
                        if (err) throw err;
                        logger.log("[Twitch Players | Global Mode] Data updated at global_names.json successfully. This mode doesn't support custom names and personalities. Pushing changes to SAIN...", "cyan");
                        pushNewestUpdateToSAIN(config.globalMode, BCConfig.liveMode);
                    })
                });
            } else {
                logger.log("[Twitch Players] There was only one personality chosen in the config file. Falling back and pushing updates. Disable randomizePersonalitiesOnServerStart or add one more personality for this to work.", "yellow");
                pushNewestUpdateToSAIN(config.globalMode, BCConfig.liveMode);
            }
        }

        //*************************************************
        //*        UPDATE SAIN PERSONALITIES FILE         *
        //*************************************************
        function pushNewestUpdateToSAIN(_globalMode, _liveMode) {
            if (_liveMode && !_globalMode) {
                if (fs.existsSync(pathToSAINPersonalities)) {
                    logger.log("[Twitch Players | Live Mode] SAIN personalities file detected!", "green");

                    fs.readFile(pathToSAINPersonalities, 'utf8', (err, data) => {
                        if (err) throw err;
                        const SAINPersData = JSON.parse(data);

                        // Combining ttvNames and yourNames if this was enabled
                        if (config.useCustomNamesAndPersonalities) {
                            const combinedNames = {
                                ...ttvNames.generatedTwitchNames,
                                ...yourNames.customNames
                            };

                            SAINPersData.NicknamePersonalityMatches = combinedNames;
                        } else {
                            SAINPersData.NicknamePersonalityMatches = ttvNames.generatedTwitchNames;
                        }

                        fs.writeFile(pathToSAINPersonalities, JSON.stringify(SAINPersData, null, 2), (err) => {
                            if (err) throw err;
                            logger.log("[Twitch Players | Live Mode] Data was written to SAIN file successfully!", "green");
                        });
                    });
                } else {
                    logger.log("[Twitch Players | Live Mode] Couldn't find SAIN's personalities file. If you have just updated SAIN to the latest, launch the game client at least once for this mod to work.", "yellow");
                    return;
                }
                // Normal Handling
            } else if (!_liveMode && !_globalMode) {
                if (fs.existsSync(pathToSAINPersonalities)) {
                    logger.log("[Twitch Players] SAIN personalities file detected!", "green");

                    fs.readFile(pathToSAINPersonalities, 'utf8', (err, data) => {
                        if (err) throw err;
                        const SAINPersData = JSON.parse(data);

                        // Combining ttvNames and yourNames if this was enabled
                        if (config.useCustomNamesAndPersonalities) {
                            const combinedNames = {
                                ...ttvNames.generatedTwitchNames,
                                ...yourNames.customNames
                            };

                            SAINPersData.NicknamePersonalityMatches = combinedNames;
                        } else {
                            SAINPersData.NicknamePersonalityMatches = ttvNames.generatedTwitchNames;
                        }

                        fs.writeFile(pathToSAINPersonalities, JSON.stringify(SAINPersData, null, 2), (err) => {
                            if (err) throw err;
                            logger.log("[Twitch Players] Data was written to SAIN file successfully!", "green");
                        });
                    });
                }
            } else if (_globalMode) {
                if (fs.existsSync(pathToSAINPersonalities)) {
                    logger.log("[Twitch Players | Global Mode] SAIN personalities file detected!", "cyan");

                    fs.readFile(pathToSAINPersonalities, 'utf8', (err, data) => {
                        if (err) throw err;
                        const SAINPersData = JSON.parse(data);

                        SAINPersData.NicknamePersonalityMatches = globalNames.generatedGlobalNames;

                        fs.writeFile(pathToSAINPersonalities, JSON.stringify(SAINPersData, null, 2), (err) => {
                            if (err) throw err;
                            logger.log("[Twitch Players | Global Mode] Data was written to SAIN file successfully!", "cyan");
                        });
                    });
                }
            } else {
                logger.log("[Twitch Players] Couldn't find SAIN's personalities file. If you have just updated SAIN to the latest, launch the game client at least once for this mod to work.", "yellow");
                return;
            }
        }

        //*************************************************
        //*                 PRESET UPDATE                 *
        //*************************************************
        function copyFolder(srcFolder, destFolder) {
            try {
                fs.cpSync(srcFolder, destFolder, { recursive: true, force: true });
                logger.log("[Twitch Players] Successfully installed latest custom SAIN preset! You can find in F6 menu", "cyan");
            } catch (error) {
                logger.log(`[Twitch Players] Error when tried updating/installing our SAIN preset! ${error.message}`, "red");
            }
        }

        function compareDates(date1, date2) {
            const d1 = new Date(date1);
            const d2 = new Date(date2);

            if (d1 > d2) return 1;
            if (d1 < d2) return -1;
            return 0;
        }

        function checkForUpdate(localVersionPath, remoteVersionPath) {
            const source = path.resolve(__dirname, '../preset/Death Wish [Twitch Players]');
            const destination = path.resolve(process.cwd(), 'BepInEx/plugins/SAIN/Presets/Death Wish [Twitch Players]');

            // Creating folder if it doesn't exist
            if (!fs.existsSync(destination)) {
                logger.log("[Twitch Players Auto-Updater] First time setup detected. Installing SAIN preset...", "cyan");
                fs.mkdirSync(destination, { recursive: true });
                copyFolder(source, destination);
            } else if (config.SAINAutoUpdatePrese) {
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
                        logger.log("[Twitch Players Auto-Updater] Using latest custom SAIN preset.", "cyan");
                    }
                } catch (error) {
                    logger.log("[Twitch Players Auto-Updater] Error while trying to update SAIN preset! Please report this to the developer!", "red");
                }
            }
        }

    }
}
module.exports = { mod: new ttvPlayers() };
