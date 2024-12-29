"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');

class ttvPlayers {
    CFG = require("../cfg/config.json");

    // Using BotCallsigns config file
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
        const BCConfig = this.BotCallsignsConfig
        const pathToSAINPersonalities = './BepInEx/plugins/SAIN/NicknamePersonalities.json';
        const pathToCallsigns = "./user/mods/BotCallsigns";
        const pathToTTVNames = "./user/mods/TTV-Players/names/ttv_names.json";
        const firstRun = path.join(__dirname, '../temp/first.run');

        if(this.BotCallsignsConfig == null){
            logger.log("[Twitch Players] COULD NOT LOAD BOT CALLSIGNS CONFIG FILE. MAKE SURE YOU HAVE THE MOD INSTALLED RIGHT. MOD WILL NOT WORK.", "red");
            return
        }

        // Loading ttvNames and yourNames
        const ttvNames = require("../names/ttv_names.json");
        const yourNames = require("../names/your_names.json");

        // Generate a new file with twitch names if we have BotCallsigns installed and liveMode is enabled. This file will be pushed to SAIN's personalities once done
        if (fs.existsSync(pathToCallsigns) && BCConfig.liveMode) {
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

                    generateTTVPersonalities();
                }
            }, 1000); // Check every 1 second for names.ready
        } else if (config.randomisePersonalitiesOnServerStart && !BCConfig.liveMode) {
            generateTTVPersonalities(true);
        }

        // Separately push the update if livemode is enabled
        function pushNewestUpdateToSAIN() {
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
            } else if (!BCConfig.liveMode) {
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
                } else {
                    logger.log("[Twitch Players] Couldn't find SAIN's personalities file. If you have just updated SAIN to the latest, launch the game client at least once for this mod to work.", "yellow");
                    return;
                }
            }
        }

        function getRandomPersonality() {
            const personalityModes = config.personalitiesToUse

            if (personalityModes.length > 1) {
                return personalityModes[Math.floor(Math.random() * personalityModes.length)];
            } else {
                return personalityModes[0];
            }
        }

        function generateTTVPersonalities(calledFromConfigFile) {

            if (calledFromConfigFile) {
                randomisePersonalitiesWithoutRegenerate();
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
                    pushNewestUpdateToSAIN();
                })
            });
        }

        function randomisePersonalitiesWithoutRegenerate() {

            const personalityModes = config.personalitiesToUse;

            if (personalityModes.length > 1) {
                fs.readFile(pathToTTVNames, 'utf8', (err, data) => {
                    if (err) throw err;

                    const ttvNameData = JSON.parse(data);

                    // Assigning new random personality to the name
                    for (let key in ttvNameData.generatedTwitchNames) {
                        if (ttvNameData.generatedTwitchNames.hasOwnProperty(key)) {
                            ttvNameData.generatedTwitchNames[key] = getRandomPersonality();
                        }
                    }

                    fs.writeFile(pathToTTVNames, JSON.stringify(ttvNameData, null, 2), (err) => {
                        if (err) throw err;
                        logger.log("[Twitch Players] Randomised personalities. Have fun :)", "yellow");
                        pushNewestUpdateToSAIN();
                    })
                });
            } else {
                logger.log("[Twitch Players] There was only one personality chosen in the config file. Falling back and pushing updates. Disable randomisePersonalitiesOnServerStart or add one more personality for this to work.", "yellow");
                pushNewestUpdateToSAIN();
            }

        }

        function copyFolder(srcFolder, destFolder) {
            try {
                fs.cpSync(srcFolder, destFolder, { recursive: true, force: true });
                logger.log("[Twitch Players] Moved our custom preset to SAIN presets! Feel free to use it at F6 menu :)", "green");
            } catch (error) {
                logger.log("[Twitch Players] Error when was moving our preset to SAIN! ${error.message}", "red");
            }
        }

        // Deploying custom SAIN preset for better experience
        if (config.deployCustomSAINPreset) {
            const sourceFolder = path.resolve(__dirname, '../preset/Death Wish [Twitch Players]');

            // Creating folder if it doesn't exist
            if (!fs.existsSync(sourceFolder)){
                fs.mkdirSync(sourceFolder);
            }

            const destinationFolder = path.resolve(process.cwd(), 'BepInEx/plugins/SAIN/Presets/Death Wish [Twitch Players]');
        
            copyFolder(sourceFolder, destinationFolder);
        } else if (fs.existsSync(firstRun)){

            logger.log("[Twitch Players] Initiating first time mod run...", "blue");

            const sourceFolder = path.resolve(__dirname, '../preset/Death Wish [Twitch Players]');

            // Creating folder if it doesn't exist
            if (!fs.existsSync(sourceFolder)){
                fs.mkdirSync(sourceFolder);
            }

            const destinationFolder = path.resolve(process.cwd(), 'BepInEx/plugins/SAIN/Presets/Death Wish [Twitch Players]');
        
            copyFolder(sourceFolder, destinationFolder);
            fs.unlinkSync(firstRun);
        }
        
    }
}
module.exports = { mod: new ttvPlayers() };
