/* global Set */
var cooldown = new Set();
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