module.exports = (Discord, bot, oldRole, newRole) => {
    if (oldRole.guild.id != bot.config.guild) return;
    if (!oldRole.name.startsWith("Cor ")) return;
    bot.colorRoles.delete(oldRole.name.split("Cor ")[1].split(" (Ex)")[0]);
    bot.colorRoles.set(newRole.name.split("Cor ")[1].split(" (Ex)")[0], newRole);
};