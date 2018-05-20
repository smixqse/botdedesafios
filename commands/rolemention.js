exports.aliases = ["rolemention", "mentionrole"];
exports.description = "Ativa e desativa menções de um cargo rapidamente. (APENAS STAFFERS)";
exports.example = "Gatuno dos Games";
exports.run = (Discord, bot, message, args) => {
    if (!message.member.hasPermission("KICK_MEMBERS")) return;
    if (!args || args.length < 1) message.channel.send(bot.utils.mention(message.author.id) + "Digite o nome de algum cargo.");
    if (!args || args.length < 1) return;
    let role = message.guild.roles.find(role => role.name.toLowerCase() == args.join(" ").toLowerCase());
    if (!role) message.channel.send(bot.utils.mention(message.author.id) + "Esse cargo não existe. Escreva o nome do cargo corretamente. (não diferencia letras maiúsculas de minúsculas)");
    if (!role) return;
    role.setMentionable(true, "Feito por um staffer usando o bot do server para mencionar o cargo em algum lugar.");
    message.channel.send(bot.utils.mention(message.author.id) + "O cargo agora é mencionável. Ele deixará de ser mencionável em 15 segundos.");
    setTimeout(() => { role.setMentionable(false, "Desfazendo ação do comando."); message.channel.send("O cargo deixou de ser mencionável."); }, 15500);
};