module.exports = (Discord, bot, member) => {
  /*
    if (member.guild.id != bot.config.guild) return;
    if (member.user.bot) return;
    let guild = member.guild;
    setTimeout(() => {
        guild.fetchAuditLogs({ limit: 1 }).then(audit => {
            let entry = audit.entries.last();
            if (entry.action != "MEMBER_KICK") return;
            if (entry.target.id != member.user.id) return;
            let messageToSend = `Nova expulsão detectada. Detalhes:\n\n\`\`\`Usuário: ${member.user.tag} (${member.user.id})\nPunição: KICK\nMotivo: ${entry.reason}\nModerador: `;
            if (entry.executor.bot) { messageToSend += `Moderador usou bot para punir o usuário.`; } else { messageToSend += `${entry.executor.tag} (${entry.executor.id})`; };
            messageToSend += `\nProvas: Nenhuma adicionada\`\`\`\n\nClique em ✅ para confirmar e enviar a punição ao <#422127476592869397> sem provas ou clique em 📝 para adicionar provas.`;
            guild.channels.find("name", "staff").send(messageToSend).then(message => {
                bot.utils.addReactions(message, "✅", "📝");
            });
        });
    }, 2000);*/
}