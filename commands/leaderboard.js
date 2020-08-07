const Discord = require("discord.js");

exports.aliases = ["leaderboard", "top", "points"];
exports.description =
  "Vê as 5 pessoas com mais pontos do servidor, e checa sua quantidade de pontos.";
exports.only = ["all"];

exports.run = async (bot, message, args) => {
  await bot.points.defer;
  const authorPoints = bot.points.ensure(message.author.id, {
    user: user.id,
    points: 0
  });
  const top10 = bot.points
    .array()
    .sort((a, b) => b.points - a.points)
    .splice(0, 10)
    .filter((a) => a.points !== 0);
  const topMessage = `Você tem ${authorPoints.points} pontos.`;
  const embed = new Discord.MessageEmbed();
  embed.setColor(message.guild.me.displayHexColor || "#00000");
  embed.setTitle("Leaderboard");
  var topDescription = "";
  for (item of top10) {
    const index = top10.findIndex((a) => a === item);
    topDescription += `${index + 1}º: ${message.guild.members.resolve(
      item.user
    )} - ${item.points} pontos\n`;
  }
  embed.setDescription(topDescription);
  message.channel.send(topMessage, { embed });
};
