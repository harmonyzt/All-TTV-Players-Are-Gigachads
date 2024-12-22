"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');

class ttvPlayers {
    CFG = require("../cfg/config.json");

    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const config = this.CFG;
        const pathToSAINPersonalities = './BepInEx/plugins/SAIN/NicknamePersonalities.json';
        const pathToCallsigns = "./user/mods/BotCallsigns";
        const pathToTTVNames = "./user/mods/TTV-Players/names/ttv_names.json";

        // Loading ttvNames and yourNames
        const ttvNames = require("../names/ttv_names.json");
        const yourNames = require("../names/your_names.json");

        // Generate a new file with twitch names if we have BotCallsigns installed and liveMode is enabled. This file will be pushed to SAIN's personalities once done
        if (fs.existsSync(pathToCallsigns) && config.liveMode) {
            logger.log("[Twitch Players | LIVE MODE] Live mode is ENABLED! This will parse the data from BotCallsign names and make a new file with filtered names...", "yellow");
        
            const namesReadyPath = path.join(__dirname, '../temp/names.ready');
            const namesTempPath = path.join(__dirname, '../temp/names_temp.json');
        
            // Watch for the presence of 'names.ready' file inside temp
            const checkForNamesReady = setInterval(() => {
                if (fs.existsSync(namesReadyPath)) {
                    // Stop checking for the flag
                    clearInterval(checkForNamesReady);
                    
                    // Delete that flag
                    fs.unlinkSync(namesReadyPath);
                    logger.log("[Twitch Players | LIVE MODE] Detected and removed flag file from BotCallsigns mod for the next liveMode run", "yellow");

                    let callsignAllNames;
        
                    try {
                        callsignAllNames = require(namesTempPath);
        
                        if (!callsignAllNames) {
                            logger.log("[Twitch Players | LIVE MODE] File names_temp.json is empty... This shouldn't happen! Report this to the developer ASAP! You may want to disable live mode!", "red");
                            return;
                        }
        
                        logger.log("[Twitch Players | LIVE MODE] Loaded fresh BotCallsigns names...", "green");
                    } catch (error) {
                        logger.log("[Twitch Players | LIVE MODE] There was an error with loading names_temp.json! Make sure it exists in the temp mod directory!", "red");
                        return;
                    }
        
                    // Process names
                    const TTVNames = JSON.stringify(callsignAllNames.names.filter(exportedTTVName => /twitch|ttv|twiitch/i.test(exportedTTVName)));
                    const parsedTTVNames = JSON.parse(TTVNames);
                    const updatedTTVNames = { generatedTwitchNames: {} };
        
                    parsedTTVNames.forEach(name => {
                        updatedTTVNames.generatedTwitchNames[name] = this.CFG.personalityLiveMode;
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
            }, 1000); // Check every 1 second
        }

        if(config.useIncludedNames){
            // Combining ttvNames and yourNames if this was enabled
            const combinedNames = {
                    ...ttvNames.generatedTwitchNames,
                    ...yourNames.customNames
            };
        }

        // If SAIN's file exists, push the personalities and nicknames
        if (!config.liveMode) {
            if(fs.existsSync(pathToSAINPersonalities)){
            logger.log("[Twitch Players] SAIN personalities file detected!", "green");

            // Reading SAIN's personalities file...
            fs.readFile(pathToSAINPersonalities, 'utf8', (err, data) => {
                if (err) throw err;
                const SAINPersData = JSON.parse(data);

                if(config.useIncludedNames) SAINPersData.NicknamePersonalityMatches = combinedNames;

                SAINPersData.NicknamePersonalityMatches = ttvNames.generatedTwitchNames;
                fs.writeFile(pathToSAINPersonalities, JSON.stringify(SAINPersData, null, 2), (err) => {
                    if (err) throw err;
                    logger.log("[Twitch Players] Data written to SAIN's personalities by nickname file successfully!", "green");
                });
            });
        } else {
            logger.log("[Twitch Players] Couldn't find SAIN's personalities file. If you have just updated SAIN to the latest, launch the game client at least once for this mod to work.", "yellow");
            return;
        }
        }

        // Separately push the update if livemode is enabled
        function pushNewestUpdateToSAIN() {
            if(config.liveMode){
                if (fs.existsSync(pathToSAINPersonalities)) {
                    logger.log("[Twitch Players | LIVE MODE] SAIN personalities file detected!", "green");
        
                    // Reading SAIN's personalities file...
                    fs.readFile(pathToSAINPersonalities, 'utf8', (err, data) => {
                        if (err) throw err;
                        const SAINPersData = JSON.parse(data);
        
                        if(config.useIncludedNames) SAINPersData.NicknamePersonalityMatches = combinedNames;
        
                        SAINPersData.NicknamePersonalityMatches = ttvNames.generatedTwitchNames;
                        fs.writeFile(pathToSAINPersonalities, JSON.stringify(SAINPersData, null, 2), (err) => {
                            if (err) throw err;
                            logger.log("[Twitch Players | LIVE MODE] Data written to SAIN's personalities by nickname file successfully!", "green");
                        });
                    });
                } else {
                    logger.log("[Twitch Players | LIVE MODE] Couldn't find SAIN's personalities file. If you have just updated SAIN to the latest, launch the game client at least once for this mod to work.", "yellow");
                    return;
                }
            }
        }
    }
}
module.exports = { mod: new ttvPlayers() };
