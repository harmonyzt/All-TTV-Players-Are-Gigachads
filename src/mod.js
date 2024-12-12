"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');

class ttvPlayers {
    CFG = require("../cfg/config.json");

    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const pathToSAINPersonalities = './BepInEx/plugins/SAIN/NicknamePersonalities.json';
        const pathToCallsigns = "./user/mods/BotCallsigns";
        const pathToTTVNames = "./user/mods/All-TTV-Players-Are-Gigachads/names/ttv_names.json";

        // Loading ttvNames and yourNames inside method
        const ttvNames = require("../names/ttv_names.json");
        const yourNames = require("../names/your_names.json");

        // Generate a new file with twitch names if we have BotCallsigns installed and liveMode is enabled
        if (fs.existsSync(pathToCallsigns) && this.CFG.liveMode) {
            logger.log("[TTV PLAYERS | LIVE MODE] BotCallsigns detected! Getting all Twitch Names now...", "green");

            const callsignAllNames = require("../names/names.json");
            const TTVNames = JSON.stringify(callsignAllNames.names.filter(exportedTTVName => /twitch|ttv/i.test(exportedTTVName)));
            const parsedTTVNames = JSON.parse(TTVNames);
            const updatedTTVNames = { generatedTwitchNames: {} };
            parsedTTVNames.forEach(name => {
                updatedTTVNames.generatedTwitchNames[name] = "Wreckless";
            });

            // Reading ttv_names
            fs.readFile(pathToTTVNames, 'utf8', (err, data) => {
                if (err) throw err;
                const ttvNameData = JSON.parse(data);
                // Modifying
                ttvNameData.generatedTwitchNames = updatedTTVNames.generatedTwitchNames;
                // Writing our changes back
                fs.writeFile(pathToTTVNames, JSON.stringify(ttvNameData, null, 2), (err) => {
                    if (err) throw err;
                    logger.log("[TTV PLAYERS | LIVE MODE] Data written to ttv_names.json successfully!", "green");
                });
            });
        }

        // Combining ttvNames and yourNames
        const combinedNames = {
                ...ttvNames.generatedTwitchNames,
                ...yourNames.generatedTwitchNames
        };

        // If SAIN's file exists, push the personalities and nicknames
        if (fs.existsSync(pathToSAINPersonalities)) {
            logger.log("[TTV PLAYERS] SAIN personalities file detected!", "green");

            // Reading SAIN's personalities file...
            fs.readFile(pathToSAINPersonalities, 'utf8', (err, data) => {
                if (err) throw err;
                const SAINPersData = JSON.parse(data);
                // Modifying
                SAINPersData.NicknamePersonalityMatches = combinedNames;
                // Writing our changes back
                fs.writeFile(pathToSAINPersonalities, JSON.stringify(SAINPersData, null, 2), (err) => {
                    if (err) throw err;
                    logger.log("[TTV PLAYERS] Data written to SAIN's personalities by nickname file successfully!", "green");
                });
            });
        } else {
            logger.log("[TTV PLAYERS] Couldn't find SAIN's personalities file. If you have just updated SAIN, launch the game at least once for this mod to work.", "red");
            return;
        }
    }
}
module.exports = { mod: new ttvPlayers() };
