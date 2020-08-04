exports.aliases = [
  "role",
  "cargo",
  "add",
  "newrole",
  "addrole",
  "addcargo",
  "removerole",
  "remcargo"
];
exports.description = "Adicione novos cargos a si mesmo.";
exports.run = (bot, message, args) => {
  var mention = bot.utils.mention(message.author.id);
  function reply(msg) {
    message.channel.send(`${mention}${msg}`);
  }
  var prefix = "+";
  var roles = message.guild.roles
    .filter((r) => r.name.startsWith(prefix) && !r.name.includes("(RP)"))
    .sort(function (a, b) {
      if (a.name.length >= b.name.length) {
        return 1;
      } else {
        return -1;
      }
    });
  if (args.length < 1) {
    reply(
      `Cargos disponíveis: \`${roles
        .map((r) => r.name.slice(prefix.length))
        .join("`, `")}\`\n\nPara receber ou remover um cargo, é só executar \`${
        bot.config.prefix
      }cargo <nome do cargo>\`. Lembrando que não é necessário escrever o nome completo.`
    );
  } else {
    var results = roles.filter((r) =>
      r.name.toLowerCase().includes(args.join(" ").toLowerCase())
    );
    if (results.size < 1) {
      reply(
        "Não consegui encontrar nenhum cargo com esse nome. `Lembre-se que isto é uma pesquisa, então você não precisa escrever o nome todo.`"
      );
    } else {
      var role = results.first();
      var memberRoles = message.member.roles;
      var hasRole = memberRoles.some((r) => r === role);
      var reason = "Comando executado por usuário.";
      if (hasRole) {
        memberRoles.remove(role, reason);
      } else {
        memberRoles.add(role, reason);
      }
      reply(
        `O cargo \`${role.name.slice(prefix.length)}\` foi ${
          hasRole ? "removido de" : "adicionado a"
        } você.`
      );
    }
  }
};
