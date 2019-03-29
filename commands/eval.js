exports.aliases = ["eval"];
exports.description = "Usado para testar e executar ações usando o bot. (APENAS O CRIADOR DO BOT)";
exports.run = (Discord, bot, message, args) => {
    if (!bot.config.owners.some(a => a == message.author)) return;
    try { message.channel.send(eval(args.join(" "))); } catch (e) {
        message.channel.send("**Erro:** " + e.message);
    }
};