"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');

class ttvPlayers {
    CFG = require("../cfg/config.json");

    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const pathToSAINPersonalities = './BepInEx/plugins/SAIN/NicknamePersonalities.json';
        const pathToCallsigns = "./user/mods/BotCallsigns";
        const pathToTTVNames = "./user/mods/TTV-Players/names/ttv_names.json";

        // Loading ttvNames and yourNames
        const ttvNames = require("../names/ttv_names.json");
        const yourNames = require("../names/your_names.json");

        // Generate a new file with twitch names if we have BotCallsigns installed and liveMode is enabled. This file will be pushed to SAIN's personalities once done
        if (fs.existsSync(pathToCallsigns) && this.CFG.liveMode) {
            logger.log("[TTV PLAYERS | LIVE MODE] Live mode is ENABLED! This will parse the data from BotCallsign names and make a new file with filtered names...", "yellow");

            let callsignAllNames;

            // This is just sad.
            try {
                callsignAllNames = require("../temp/names_temp.json");

                if (!callsignAllNames) {
                    logger.log("[TTV PLAYERS | LIVE MODE] File names_temp.json is empty... This shouldn't happen! Report this to the developer ASAP! You may disable live mode!", "red");
                    return;
                }

                logger.log("[TTV PLAYERS | LIVE MODE] Just loaded BotCallsigns names, all good! Proceeding...", "green");
            } catch (error) {
                logger.log("[TTV PLAYERS | LIVE MODE] There was an error with loading names_temp.json! Make sure it exists in the mod directory temp!", "red");
                return;
            }

            // Names fell on the floor like empty shells.. Regex stood. The silence was never so loud before.
            // The eternal judge whispered: "Let there be valid names... and nothing else."
            const TTVNames = JSON.stringify(callsignAllNames.names.filter(exportedTTVName => /twitch|ttv/i.test(exportedTTVName)));
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
                    logger.log("[TTV PLAYERS | LIVE MODE] Data updated at ttv_names.json successfully!", "yellow");
                });
            });
        }

        if(this.CFG.useIncludedNames){
            // Combining ttvNames and yourNames
            const combinedNames = {
                    ...ttvNames.generatedTwitchNames,
                    ...yourNames.customNames
            };
        }

        // If SAIN's file exists, push the personalities and nicknames
        if (fs.existsSync(pathToSAINPersonalities)) {
            logger.log("[TTV PLAYERS] SAIN personalities file detected!", "green");

            // Reading SAIN's personalities file...
            fs.readFile(pathToSAINPersonalities, 'utf8', (err, data) => {
                if (err) throw err;
                const SAINPersData = JSON.parse(data);

                if(this.CFG.useIncludedNames) SAINPersData.NicknamePersonalityMatches = combinedNames;

                SAINPersData.NicknamePersonalityMatches = ttvNames.generatedTwitchNames;
                fs.writeFile(pathToSAINPersonalities, JSON.stringify(SAINPersData, null, 2), (err) => {
                    if (err) throw err;
                    logger.log("[TTV PLAYERS] Data written to SAIN's personalities by nickname file successfully!", "green");
                });
            });
        } else {
            logger.log("[TTV PLAYERS] Couldn't find SAIN's personalities file. If you have just updated SAIN, launch the game client at least once for this mod to work.", "red");
            return;
        }
    }
}
module.exports = { mod: new ttvPlayers() };
