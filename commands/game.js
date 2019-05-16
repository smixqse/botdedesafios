exports.aliases = ["game", "jogo", "promocao", "games", "jogos", "freegame"];
exports.description = "Substituído por g.role";
exports.run = (Discord, bot, message, args) => {
    /*if (message.channel.type == "dm") return;
    var guildMember = message.guild.members.get(message.author.id);
    if (!guildMember.roles.has(bot.config.gameRole)) {
        message.channel.send(bot.utils.mention(message.author.id) + "Opa! Agora você vai ficar sabendo quando tiver rolando uma promoção bem topperson! 🎮");
        guildMember.roles.add(bot.config.gameRole);
    } else {
        message.channel.send(bot.utils.mention(message.author.id) + "Não quer mais ficar sabendo das altas promoções? Ok! Você não será mais notificado! 🎮");
        guildMember.roles.remove(bot.config.gameRole);
    }*/
  message.channel.send("Querendo receber o cargo Gatuno dos Games? Use agora o comando `g.cargo` para isso. Execute para saber mais.");
};