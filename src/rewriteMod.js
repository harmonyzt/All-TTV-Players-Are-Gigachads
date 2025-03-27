"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
const path = require('path');

class ttvPlayers {
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

        // Check for custom names and personalities file and create if doesn't exist
        function createFileIfNotExists(path) {
            if (!fs.existsSync(path)) {
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
        }
        createFileIfNotExists(customNamesForUser);

        //*************************************************
        //*               CONFIG MANAGER                  *
        //*************************************************
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

        if (!config.SAINProgressiveDifficulty && config.SAINAlwaysSetPresetDefaults) {
            adjustDifficulty(50, true);
        }

        if (!config.randomizePersonalitiesOnServerStart && !config.globalMode && !BCConfig.liveMode) {
            pushNewestUpdateToSAIN();
        }

        let runOnce = 1

    }
}