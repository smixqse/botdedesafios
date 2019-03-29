module.exports = (Discord, bot, role) => {
    if (role.guild.id != bot.config.guild) return;
    if (!role.name.startsWith("Cor ")) return;
    bot.colorRoles.delete(role.name.split("Cor ")[1].split(" (Ex)")[0]);
};