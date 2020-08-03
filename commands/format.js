const Discord = require("discord.js");

exports.aliases = ["format", "formatar", "mentions"];
exports.description = "Formata textos com menções de usuário, cargo e canal.";

exports.run = (bot, message, args) => {
  var readOnly  = !bot.config.defaultOnlyChannels.includes(message.channel.name.toLowerCase());
  var mention = bot.utils.mention(message.author.id);
  function reply(msg) {message.channel.send(`${mention}${msg}`);}
  if (args.length < 1) {
    reply(`Coloque entre <> uma "menção" para o canal, cargo ou usuário que você quer substituir no texto, mesmo que o Discord não sugira. Ex.: \`${bot.config.prefix}format Entre no canal <#canal> se tiver o cargo <@Cargo Loko Demais>\``);
  } else {
    var text = args.join(" ");
    while (text.indexOf("<") !== -1) {
      var contents = text.slice(text.indexOf("<") + 1, text.indexOf(">"));
      if (!["@", "#"].includes(contents[0])) {
        text = text.replace(`<${contents}>`, contents);
      } else {
        if (!isNaN(contents.slice(2)) && contents.length > 15) {
          text = text.replace(`<${contents}>`, `{}{${contents.replace(/\s+/g, '')}}{}`);
        } else {
          if (contents[0] == "@") {
              var roleSearch = message.guild.roles.filter(a => a.name.toLowerCase().includes(contents.slice(1).toLowerCase()));
              if (roleSearch.size < 1) {
                text = text.replace(`<${contents}>`, contents);
              } else {
                text = text.replace(`<${contents}>`, `<@&${roleSearch.first().id}>`);
              };
          } else {
            if (!isNaN(contents.slice(2))) {
              text = text.replace(`<${contents}>`, `{}{${contents}}{}`);
            } else {
              var channelSearch = message.guild.channels.filter(a => a.name == contents.slice(1));
              if (channelSearch.size < 1) {
                text = text.replace(`<${contents}>`, contents);
              } else {
                text = text.replace(`<${contents}>`, `<#${channelSearch.first().id}>`);
              };
            };
          };
        };
      };
    };
    while (text.indexOf("{}{") !== -1) {
      text = text.replace("{}{", "<").replace("}{}", ">");
    }
    var embed = new Discord.MessageEmbed().setColor(message.guild.me.roles.color.hexColor).setTitle("Resultado").setDescription(`\`\`\`${Discord.escapeMarkdown(text, true)}\`\`\``)
    message.channel.send(embed);
  };
};