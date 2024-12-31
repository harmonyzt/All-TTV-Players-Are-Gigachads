"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');

class ttvPlayers {
    CFG = require("../cfg/config.json");

    // Using BotCallsigns config file to indicate if liveMode was enabled or not
    constructor() {
        this.BotCallsignsConfigPath = path.resolve(__dirname, '../../BotCallsigns/config/config.json');
        this.BotCallsignsConfig = null;

        try {
            const data = fs.readFileSync(this.BotCallsignsConfigPath, 'utf8');
            this.BotCallsignsConfig = JSON.parse(data);
        } catch (err) {
            logger.log("[Twitch Players] ERROR! Couldn't load BotCallsigns configuration file! MOD WILL NOT WORK.", "red");
            return;
        }
    }

    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const config = this.CFG;
        const BCConfig = this.BotCallsignsConfig;
        const pathToSAINPersonalities = './BepInEx/plugins/SAIN/NicknamePersonalities.json';
        const pathToCallsigns = "./user/mods/BotCallsigns";
        const pathToTTVNames = "./user/mods/TTV-Players/names/ttv_names.json";
        const pathToGlobalNames = "./user/mods/TTV-Players/names/global_names.json";

        if (this.BotCallsignsConfig == null) {
            logger.log("[Twitch Players] COULD NOT LOAD BOT CALLSIGNS CONFIG FILE. MAKE SURE YOU HAVE THAT MOD INSTALLED RIGHT. MOD WILL NOT WORK.", "red");
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
            logger.log("[Twitch Players | LIVE MODE] Live mode is ENABLED! This will parse the data from BotCallsign names and make a new file with filtered names...", "yellow");

            const namesReadyPath = path.join(__dirname, '../temp/names.ready');

            // Watch for the presence of 'names.ready' file inside temp
            const checkForNamesReady = setInterval(() => {
                if (fs.existsSync(namesReadyPath)) {
                    // Stop checking for the flag
                    clearInterval(checkForNamesReady);

                    // Delete that flag
                    fs.unlinkSync(namesReadyPath);
                    logger.log("[Twitch Players | LIVE MODE] Detected and removed flag file from BotCallsigns mod for the next liveMode run", "yellow");

                    generateTTVPersonalities(false, false);
                }
            }, 1000); // Check every 1 second for names.ready
        } else if (config.randomizePersonalitiesOnServerStart) {
            generateTTVPersonalities(config.randomizePersonalitiesOnServerStart, config.globalMode);
        }

        function getRandomPersonalityIgnoreWeights(personalities) {
            const personalityModes = Object.keys(personalities);
            if (personalityModes.length > 1) {
                return personalityModes[Math.floor(Math.random() * personalityModes.length)];
            } else {
                return personalityModes[0];
            }
        }

        // This function use weightings from config file from 0 to 100. Without global mode it won't do that.
        function getRandomPersonalityForGlobalMode(personalities) {
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


        function generateTTVPersonalities(randomizePersonalities, globalMode) {
            if (randomizePersonalities) {
                randomizePersonalitiesWithoutRegenerate(globalMode);
                return;
            }

            let callsignAllNames;
            const namesTempPath = path.join(__dirname, '../temp/names_temp.json');

            try {
                callsignAllNames = require(namesTempPath);

                if (!callsignAllNames) {
                    logger.log("[Twitch Players | LIVE MODE] File names_temp.json is empty... This shouldn't happen! Report this to the developer ASAP! You may want to disable live mode!", "red");
                    return;
                }

                logger.log("[Twitch Players | LIVE MODE] Loaded BotCallsigns names...", "green");
            } catch (error) {
                logger.log("[Twitch Players | LIVE MODE] There was an error with loading names_temp.json! Make sure it exists in the temp mod directory!", "red");
                return;
            }

            // Process names
            const TTVNames = JSON.stringify(callsignAllNames.names.filter(exportedTTVName => /twitch|ttv|twiitch|_TV/i.test(exportedTTVName)));
            const parsedTTVNames = JSON.parse(TTVNames);
            const updatedTTVNames = { generatedTwitchNames: {} };

            parsedTTVNames.forEach(name => {
                updatedTTVNames.generatedTwitchNames[name] = getRandomPersonality();
            });

            fs.readFile(pathToTTVNames, 'utf8', (err, data) => {
                if (err) throw err;

                const ttvNameData = JSON.parse(data);
                ttvNameData.generatedTwitchNames = updatedTTVNames.generatedTwitchNames;
                fs.writeFile(pathToTTVNames, JSON.stringify(ttvNameData, null, 2), (err) => {
                    if (err) throw err;
                    logger.log("[Twitch Players | LIVE MODE] Data updated at ttv_names.json successfully! Pushing changes to SAIN...", "yellow");
                    pushNewestUpdateToSAIN(false);
                })
            });
        }

        function randomizePersonalitiesWithoutRegenerate(_globalMode) {
            const personalityModes = config.personalitiesToUse;

            if (_globalMode) {
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
                        pushNewestUpdateToSAIN(config.globalMode);
                    })
                });


            } else if (Object.keys(personalityModes).length > 1) {
                fs.readFile(pathToTTVNames, 'utf8', (err, data) => {
                    if (err) throw err;

                    const ttvNameData = JSON.parse(data);

                    // Assigning new random personality to the name
                    for (let key in ttvNameData.generatedTwitchNames) {
                        if (ttvNameData.generatedTwitchNames.hasOwnProperty(key)) {
                            ttvNameData.generatedTwitchNames[key] = getRandomPersonalityIgnoreWeights(personalityModes);
                        }
                    }

                    fs.writeFile(pathToTTVNames, JSON.stringify(ttvNameData, null, 2), (err) => {
                        if (err) throw err;
                        logger.log("[Twitch Players] Randomized personalities. Pushing changes to SAIN...", "cyan");
                        pushNewestUpdateToSAIN(config.globalMode);
                    })
                });
            } else {
                logger.log("[Twitch Players] There was only one personality chosen in the config file. Falling back and pushing updates. Disable randomizePersonalitiesOnServerStart or add one more personality for this to work.", "yellow");
                pushNewestUpdateToSAIN(config.globalMode);
            }
        }

        // Push update to SAIN file
        function pushNewestUpdateToSAIN(__globalMode) {
            if (BCConfig.liveMode) {
                if (fs.existsSync(pathToSAINPersonalities)) {
                    logger.log("[Twitch Players | LIVE MODE] SAIN personalities file detected!", "green");

                    // Reading SAIN's personalities file...
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
                            logger.log("[Twitch Players | LIVE MODE] Data was written to SAIN file successfully!", "green");
                        });
                    });
                } else {
                    logger.log("[Twitch Players | LIVE MODE] Couldn't find SAIN's personalities file. If you have just updated SAIN to the latest, launch the game client at least once for this mod to work.", "yellow");
                    return;
                }
            } else if (!BCConfig.liveMode && !config.globalMode) {
                if (fs.existsSync(pathToSAINPersonalities)) {
                    logger.log("[Twitch Players] SAIN personalities file detected!", "green");

                    // Reading SAIN's personalities file...
                    fs.readFile(pathToSAINPersonalities, 'utf8', (err, data) => {
                        if (err) throw err;
                        const SAINPersData = JSON.parse(data);

                        if (config.useCustomNamesAndPersonalities) {
                            // Combining ttvNames and yourNames if this was enabled
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
            } else if (__globalMode) {
                if (fs.existsSync(pathToSAINPersonalities)) {
                    logger.log("[Twitch Players | Global Mode] SAIN personalities file detected!", "cyan");

                    // Reading SAIN's personalities file...
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

        // checkForUpdate()
        function copyFolder(srcFolder, destFolder, update) {
            try {
                fs.cpSync(srcFolder, destFolder, { recursive: true, force: true });
                logger.log("[Twitch Players] Successfully installed latest custom SAIN preset! You can find in F6 menu", "cyan");
            } catch (error) {
                logger.log(`[Twitch Players] Error when tried updating/installing our SAIN preset! ${error.message}`, "red");
            }
        }

        // checkForUpdate()
        function compareDates(date1, date2) {
            const d1 = new Date(date1);
            const d2 = new Date(date2);

            if (d1 > d2) return 1;
            if (d1 < d2) return -1;
            return 0;
        }

        // Check for SAIN preset update/first mod run
        function checkForUpdate(localVersionPath, remoteVersionPath) {
            const sourceFolder = path.resolve(__dirname, '../preset/Death Wish [Twitch Players]');
            const destinationFolder = path.resolve(process.cwd(), 'BepInEx/plugins/SAIN/Presets/Death Wish [Twitch Players]');

            // Creating folder if it doesn't exist
            if (!fs.existsSync(destinationFolder)) {
                logger.log("[Twitch Players] Initiating first time mod run...", "cyan");
                fs.mkdirSync(destinationFolder);
                copyFolder(sourceFolder, destinationFolder, false);
            } else if (config.autoUpdateSAINPreset) {
                try {
                    const localSAINData = JSON.parse(fs.readFileSync(localVersionPath, 'utf-8'));
                    const remoteSAINData = JSON.parse(fs.readFileSync(remoteVersionPath, 'utf-8'));

                    const localSAINDateVer = localSAINData.DateCreated;
                    const remoteSAINDateVer = remoteSAINData.DateCreated;

                    const comparison = compareDates(localSAINDateVer, remoteSAINDateVer);

                    if (comparison === 1) {
                        logger.log("[Twitch Players] Detected outdated custom SAIN preset! Updating...", "cyan");
                        copyFolder(sourceFolder, destinationFolder, true);
                    } else {
                        logger.log("[Twitch Players Auto-Updater] Using latest custom SAIN preset.", "cyan");
                    }
                } catch (error) {
                    logger.log("[Twitch Players] Error while trying to update SAIN preset! Please report this to the developer!", "red");
                }
            }
        }

    }
}
module.exports = { mod: new ttvPlayers() };
