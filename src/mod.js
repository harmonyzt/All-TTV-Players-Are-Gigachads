"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');

class ttvPlayers {
    ttvNames = require("../names/ttv_names.json");

    postDBLoad(container) {
        const logger = container.resolve("WinstonLogger");
        const pathToSAINServerMod = './user/mods/zSolarint-SAIN-ServerMod';
        const pathToSAINPlugin = './BepInEx/plugins/SAIN/SAIN.dll';
        const pathToSAINPersonalities = './BepInEx/plugins/SAIN/NicknamePersonalities.json';
        const pathToCallsigns = "./user/mods/BotCallsigns";
        
        // Generate a new file with twitch names if we have BotCallsigns installed
        if(fs.existsSync(pathToCallsigns)){
            logger.log("[TTV PLAYERS] BotCallsigns Mod detected! It generated us a fancy file we can work with! Getting all Twitch Names now...", "green");

            const callsignAllNames =  require("../names/names.json");
            const TTVName = JSON.stringify(callsignAllNames.names.filter(TTVName => /twitch|ttv/i.test(TTVName)));

            //var thingy = { ttvNames: {} };
            //ttvNames.forEach(TTVName => {
            //    thingy.ttvNames[TTVName] = "Wreckless";
            //});

            //fs.writeFile(pathToSAINPersonalities, JSON.stringify(jsonData, null, 2), (err) => {
            //    if (err) throw err;
            //    logger.log("[TTV PLAYERS] Data written to SAIN's personalities by nickname file successfully!", "green");
            //});

        }
        
        //If SAIN exists push the personalities and nicknames
        if ((fs.existsSync(pathToSAINServerMod) && fs.existsSync(pathToSAINPlugin))) {
            logger.log("[TTV PLAYERS] SAIN Server Mod detected!", "green");
            logger.log("[TTV PLAYERS] SAIN Plugin detected!", "green");


            // Reading SAIN's personalities file...
            fs.readFile(pathToSAINPersonalities, 'utf8', (err, data) => {
                if (err) throw err;
                const jsonData = JSON.parse(data);
                // Modifying
                jsonData.NicknamePersonalityMatches = this.ttvNames;
                // Writing our changes back
                fs.writeFile(pathToSAINPersonalities, JSON.stringify(jsonData, null, 2), (err) => {
                    if (err) throw err;
                    logger.log("[TTV PLAYERS] Data written to SAIN's personalities by nickname file successfully!", "green");
                });
            });
        } else {
            logger.log("[TTV PLAYERS] Please ensure you have started the game at least once with SAIN installed. Mod will work after second server start.", "yellow");
            return;
        }
    }
}
module.exports = { mod: new ttvPlayers() };
