import { Injector, Logger, React, webpack, common, settings, commands } from 'replugged';
const injector = new Injector();
const logger = Logger.plugin("uwuifier");
const { getModule } = webpack;

import * as uwuifier from './uwuifier';

import findInReactTree from './findInReactTree';

const defaultSettings = {
    enabled: true,
    periodToExclamationChance: uwuifier.settings.periodToExclamationChance,
    stutterChance: uwuifier.settings.stutterChance,
    presuffixChance: uwuifier.settings.presuffixChance,
    suffixChance: uwuifier.settings.suffixChance,
    duplicateCharactersChance: uwuifier.settings.duplicateCharactersChance,
    duplicateCharactersAmount: uwuifier.settings.duplicateCharactersAmount,
};
const cfg = await settings.init('mod.cgytrus.uwuifier', defaultSettings);

import * as settingsUi from "./components/Settings.jsx";
export function Settings() {
    return settingsUi.Settings(cfg, uwuifier);
}

function assignUwuifierSetting(name) {
    uwuifier.settings.__defineGetter__(name, () => cfg.get(name));
    uwuifier.settings.__defineSetter__(name, value => cfg.set(name, value));
}

export async function start() {
    assignUwuifierSetting('periodToExclamationChance');
    assignUwuifierSetting('stutterChance');
    assignUwuifierSetting('presuffixChance');
    assignUwuifierSetting('suffixChance');
    assignUwuifierSetting('duplicateCharactersChance');
    assignUwuifierSetting('duplicateCharactersAmount');

    let ignoreIn = [
        /^<#(?<id>\d{17,19})>$/gd, // channel
        /<a?:\w{2,32}:\d{17,18}>/gd, // emote
        /^<@&(?<id>\d{17,19})>$/gd, // role
        /^<@!?(?<id>\d{17,19})>$/gd, // user
        /(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&\/=]*)/gd, // link
        /^(@everyone|@here)$/gd, // global ping
        /\`\`\`.*\`\`\`/gsd, // multi-line code
        /\`.*\`/gsd // single-line code
    ];

    function isIgnoredAt(offset, string) {
        for(let pattern of ignoreIn) {
            for(let match of string.matchAll(pattern)) {
                for(let bounds of match.indices) {
                    if(bounds === undefined)
                        continue;
                    if(bounds[0] <= offset && offset <= bounds[1])
                        return true;
                }
            }
        }
        return false;
    }

    function startsWithCommand(string) {
        /*for(let [command] of Object.entries(powercord.api.commands.commands)) {
            if(string.startsWith(`${powercord.api.commands.prefix}${command}`))
                return true;
        }*/
        return false;
    }

    function uwuifyMessage(message, checkForCommand) {
        try {
            if(checkForCommand && startsWithCommand(message))
                return message;
            return uwuifier.uwuify(message, true, isIgnoredAt);
        }
        catch(error) {
            logger.error(error);
            try {
                sendEphemeralMessage(`${uwuifier.uwuify('oh no! there was an error in uwuifier!! ;-; i\'m gonna show it to you now')}\n${error}`);
            }
            catch {
                try {
                    sendEphemeralMessage(`ow nyow! t-thewe was an e-ewwow in uwuifiew!!\\~ ;-; i'm gwonna s-show it to uwu nyow uwu\\~\\~\n${error}`);
                } catch(ephemeralMessageError) {
                    logger.error(ephemeralMessageError);
                }
            }
        }
        return message;
    }

    const CTAC = replugged.webpack.getBySource(".slateTextArea");
    injector.after(CTAC.type, 'render', (_, res) => {
        const editor = findInReactTree(res, x => x.props?.promptToUpload && x.props.onSubmit);
        if(editor == null)
            return res;
        editor.props.onSubmit = (original => function(o, a, u, s) {
            if(cfg.get('enabled'))
                o = uwuifyMessage(o, true);
            return original(o, a, u, s);
        })(editor.props.onSubmit);
        return res;
    });

    /*commands.registerCommand({
        name: 'uwu',
        description: uwuifier.uwuify('Toggle uwuifying for this message.', true),
        usage: '{c} [message]',
        executor: args => ({
            send: true,
            result: cfg.get('enabled') ? args.join(' ') : uwuifyMessage(args.join(' '), false)
        }),
        options: {
            type: 1,
            name: 'uwu',
            description: uwuifier.uwuify('Toggle uwuifying for this message.', true),
            required: true
        }
    });*/
}

export function stop() {
    injector.uninjectAll();
    //commands.unregisterCommand('uwu');
}

function sendEphemeralMessage(content, username = 'Clyde', avatar = 'clyde') {
    sendEphemeralMessageInChannel(common.channels.getChannelId(), content, username, avatar);
}

function sendEphemeralMessageInChannel(channelId, content, username = 'Clyde', avatar = 'clyde') {
    common.messages.receiveMessage(channelId, {
        id: getModule(['fromTimestamp'], false).fromTimestamp(Date.now()), // generate message id
        type: 0, // MessageTypes.DEFAULT
        flags: 64, // MessageFlags.EPHEMERAL
        content: content,
        channel_id: channelId,
        author: {
            id: '1', // LOCAL_BOT_ID
            username: username,
            discriminator: '0000', // NON_USER_BOT_DISCRIMINATOR
            avatar: avatar,
            bot: true
        },
        attachments: [],
        embeds: [],
        pinned: false,
        mentions: [],
        mention_channels: [],
        mention_roles: [],
        mention_everyone: false,
        timestamp: (new Date).toISOString(),
        state: 'SENT', // MessageStates.SENT
        tts: false,
        loggingName: null
    });
}
