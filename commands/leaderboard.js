const Discord = require("discord.js");

exports.aliases = ["leaderboard", "top", "points"];
exports.description =
  "Vê as 5 pessoas com mais pontos do servidor, e checa sua quantidade de pontos.";
exports.only = ["baderna", "casa-staffer-dos-bots", "casa-dos-bots"];

exports.run = async (bot, message, args) => {
  await bot.points.defer;
  await message.guild.members.fetch();
  const authorPoints = bot.points.ensure(message.author.id, {
    user: message.author.id,
    points: 0
  });
  const page =
    args.length > 0 && !isNaN(args[0]) && parseInt(args[0]) > 0
      ? parseInt(args[0])
      : 1;
  const sortedPoints = bot.points.array().sort((a, b) => b.points - a.points);
  const filteredPoints = sortedPoints.filter((a) => a.points !== 0);
  const pageCount = Math.floor(filteredPoints.length / 10 + 1);
  const top10 = filteredPoints.splice(0 + 10 * page - 10, 10);
  if (top10.length < 1) {
    message.channel.send(
      `Essa página não existe. A última página é a ${pageCount}.`
    );
    return;
  }
  const topMessage = `${message.author}, você tem ${
    authorPoints.points
  } pontos e é o ${
    sortedPoints.findIndex((a) => a.user === message.author.id) + 1
  }º no ranking.`;
  const embed = new Discord.MessageEmbed();
  embed.setColor(message.guild.me.displayHexColor || "#00000");
  embed.setTitle("Leaderboard");
  embed.setFooter(
    `página ${page} de ${pageCount} | para ver outra página, digite g.top <página>.`
  );
  var topDescription = "";
  for (item of top10) {
    const index = top10.findIndex((a) => a === item);
    const user = bot.users.resolve(item.user);
    if (user === null) continue;
    const isUser = user.id === message.author.id;
    const winnerEmojis = "🥇 🥈 🥉".split(" ");
    topDescription += `${isUser ? "**" : ""}${
      page === 1 && index < 3 ? winnerEmojis[index] + " " : ""
    }${10 * page - 10 + index + 1}º: \`${user.tag}\` - ${item.points} pontos${
      isUser ? "**" : ""
    }\n`;
  }
  embed.setDescription(topDescription);
  message.channel.send(topMessage, { embed });
};
