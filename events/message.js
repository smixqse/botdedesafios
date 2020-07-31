/* global Set */
var cooldown = new Set();
const axios = require("axios");
const crypto = require("crypto");
const moment = require("moment");
moment.locale("pt-br");

module.exports = (Discord, bot, message) => {
    if (message.author.bot) return;
    if (message.channel.type == "dm") return;
    if (message.guild.id != bot.config.guild) return;

    // Rolemention
    if (message.author.id == global.rolemention.author) {
        let role = message.guild.roles.cache.get(global.rolemention.roleID);
        if (message.mentions.has(role)) {
            role.setMentionable(false, "Pedido por staffer automaticamente.");
            global.rolemention.roleID = false;
            global.rolemention.author.id = "nada";
        }
    };

    // Repeated attachment prevention
    if (message.channel.name === "memes") {
        setTimeout(async() => {
            message = await message.fetch();
            var attachment = {};
            if (message.attachments.size < 1) {
                if (message.embeds.length < 1) {
                    attachment = "none";
                } else {
                    attachment = "none";
                    if (["image", "video", "gifv"].includes(message.embeds[0].type)) {
                        attachment = message.embeds[0];
                    }
                };
            } else {
                attachment = message.attachments.first();
            };

            if (attachment === "none") return;
            axios.get(attachment.url, {
                responseType: 'arraybuffer'
            }).then(async(resp) => {
                var response = resp.data;
                const cryptoHash = crypto.createHash('sha1');
                cryptoHash.write(resp.data);
                cryptoHash.end();
                const hash = cryptoHash.read().toString("hex");
                var existsHash = false;
                if (bot.imgsDb[hash]) existsHash = true;
                if (existsHash) {
                    try {
                        var originalMsg = await message.channel.messages.fetch(bot.imgsDb[hash]);
                        var author = originalMsg.author;
                        message.delete();
                        var embed = new Discord.MessageEmbed();
                        embed.setTitle("Mídia possivelmente duplicada apagada");
                        embed.setDescription(`enviada por ${author} ${moment(originalMsg.createdTimestamp).fromNow()}\n\n[Clique aqui para ver a postagem original](${originalMsg.url})`);
                        embed.setColor(message.guild.me.displayHexColor || "#00000");
                        var sentMsg = await message.channel.send({
                            embed
                        });
                        embed.setTitle("Mídia possivelmente duplicada apagada no canal de memes");
                        embed.attachFiles([attachment.url]);
                        message.guild.channels.resolve("420391239117176833").send({
                            embed
                        });
                        sentMsg.delete({
                            timeout: 15000
                        });
                    } catch (e) {
                        bot.imgsDb[hash] = message.id;
                        require("fs").writeFileSync("./db/imgs.json", JSON.stringify(bot.imgsDb));
                    }
                } else {
                    bot.imgsDb[hash] = message.id;
                    require("fs").writeFileSync("./db/imgs.json", JSON.stringify(bot.imgsDb));
                }
            });
        }, 2000);

    }

    // Commands
    if (!message.content.split(" ")[0].startsWith(bot.config.prefix)) return;
    let command = message.content.split(" ")[0].slice(bot.config.prefix.length);
    let args = message.content.split(" ").slice(1);
    const cmd = bot.commands.get(command);
    if (!cmd) return;
    if ((cmd.only != null && cmd.only.includes(message.channel.name.toLowerCase())) || (cmd.only != null && cmd.only[0] == "all") || (bot.config.defaultOnlyChannels != null && bot.config.defaultOnlyChannels.includes(message.channel.name.toLowerCase()))) {
        if (cooldown.has(message.author.id) && bot.config.defaultOnlyChannels.includes(message.channel.name.toLowerCase())) message.channel.send("<@" + message.author.id + "> Espere alguns segundos pra usar comandos novamente.");
        message.delete();
        if (cooldown.has(message.author.id)) return;
        cooldown.add(message.author.id);
        setTimeout(() => {
            cooldown.delete(message.author.id);
        }, 5000);
        cmd.run(Discord, bot, message, args);
    };
}