module.exports = (Discord, bot, messageReaction, user) => {
    if (messageReaction.message.guild.id != bot.config.guild) return;
    if (messageReaction.message.author.id == bot.user.id) return;
    if (user.id == bot.user.id) return;
    if (messageReaction.message.channel.name == "regras") {
        let member = messageReaction.message.guild.members.resolve(user);
        if(!member.roles.some(role => role.id == bot.config.memberRole)) member.roles.add(messageReaction.message.guild.roles.resolve(bot.config.memberRole), "Verificação de usuário.");
    }
    /*if (messageReaction.message.guild.id != bot.config.guild) return;
    if (messageReaction.message.author.id != bot.user.id) return;
    if (user.id == bot.user.id) return;
    if (!["Nova expulsão detectada", "Novo banimento detectado"].some(text => messageReaction.message.content.startsWith(text))) return;
    let caseUser = messageReaction.message.content.split("Usuário:")[1].split("\n")[0];
    let punishment = messageReaction.message.content.split("Punição:")[1].split("\n")[0];
    let moderator = user.tag + "(" + user.id + ")";
    let reason = messageReaction.message.content.split("Motivo:")[1].split("\n")[0];
    let proofs = messageReaction.message.content.split("Provas:")[1].split("`")[0];
    if (messageReaction.emoji.name == "✅") {
        let channelToSend = messageReaction.message.guild.channels.find("name", "cantinho-da-vergonha");
        let messageToSend = `\`\`\`\nUsuário: ${caseUser}\nModerador: ${moderator}\nMotivo:${reason}\`\`\`\n\n**Provas**: `;
        if (proofs == " Nenhuma adicionada") {
            channelToSend.send(messageToSend + proofs);
        } else {
            var files = [];
            let proofLinks = proofs.split(", ");
            if (proofLinks[0][0] == " ") proofLinks[0] = proofLinks[0].slice(1);
            for (proofLink in proofLinks) {
                files.push({attachment: proofLink});
            }
            channelToSend.send(messageToSend, {files: files.map(function (fileName) {return {attachment: fileName};})});
        }
        messageReaction.message.reactions.removeAll();
        messageReaction.message.edit("Punição adicionada ao <#422127476592869397>.");
    };
    if (messageReaction.emoji.name == "📝") {
        messageReaction.message.reactions.removeAll();
        messageReaction.message.channel.send("Digite o link ou faça upload da prova que deseja adicionar.").then(msg => {
            let filter = m => m.attachments.size > 0 || (m.content.startsWith("http") && m.content.endsWith(".png"));
            messageReaction.message.channel.awaitMessages(filter, { max: 1, time: 15000, errors: ['time'] })
                .then(messages => {
                    let message = messages.first();
                    if (message.attachments.size > 0) {
                        let url = message.attachments.first().url;
                        let newProofs = proofs;
                        if (proofs == " Nenhuma adicionada") newProofs = url;
                        if (proofs != " Nenhuma adicionada") newProofs = proofs + ", " + url;
                        messageReaction.message.edit(messageReaction.message.content.split("Provas: ")[0] + "Provas: " + newProofs + "```\n\n\n\nClique em ✅ para confirmar e enviar a punição ao <#422127476592869397> sem provas ou clique em 📝 para adicionar provas.");
                        bot.utils.addReactions(messageReaction.message, "✅", "📝");
                        msg.delete();
                    } else {
                        let url = message.content;
                        let newProofs = proofs;
                        if (proofs == " Nenhuma adicionada") newProofs = url;
                        if (proofs != " Nenhuma adicionada") newProofs = proofs + ", " + url;
                        messageReaction.message.edit(messageReaction.message.content.split("Provas: ")[0] + "Provas: " + newProofs + "```\n\n\n\nClique em ✅ para confirmar e enviar a punição ao <#422127476592869397> sem provas ou clique em 📝 para adicionar provas.");
                        bot.utils.addReactions(messageReaction.message, "✅", "📝");
                        msg.delete();
                    }
                })
                .catch(() => { msg.edit("Tempo esgotado. Clique novamente para tentar denovo."); setTimeout(() => {msg.delete();}, 5000); bot.utils.addReactions(messageReaction.message, "✅", "📝"); });
        });
    }*/
}