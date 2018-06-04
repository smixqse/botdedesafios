var cooldown = new Set();
module.exports = (Discord, bot, message) => {
    if (message.author.bot) return;
    if (message.guild.id != bot.config.guild) return;
    if (!message.content.split(" ")[0].startsWith(bot.config.prefix)) return;
    let command = message.content.split(" ")[0].slice(bot.config.prefix.length);
    let args = message.content.split(" ").slice(1);
    const cmd = bot.commands.get(command);
    if (!cmd) return;
    if ((cmd.only != null && !cmd.only.includes(message.channel.name.toLowerCase())) || (bot.config.defaultOnlyChannels != null && !bot.config.defaultOnlyChannels.includes(message.channel.name.toLowerCase()))) return;
    if (cooldown.has(message.author.id)) message.channel.send("<@" + message.author.id + "> Aguarde 3 segundos pra usar comandos novamente.");
    if (cooldown.has(message.author.id)) return;
    cooldown.add(message.author.id);
    setTimeout(() => { cooldown.delete(message.author.id); }, 3000);
    cmd.run(Discord, bot, message, args);
}