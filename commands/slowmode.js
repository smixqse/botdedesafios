exports.aliases = ["slowmode", "snailmode"]; // Coloque o nome do arquivo como primeiro alias aqui. Ex.: help.js => exports.aliases = ["help", "...", "..."];
exports.description = "Deixa um tempo para enviar uma nova mensagem no chat!";
exports.example = "slowmode <tempo em ms>";
exports.run = async (Discord, bot, message, args, slowmode) => {
  var tempo = args[0];

  var channel = message.channel.id;
  if (tempo == "off") {
    if (!slowmode.has(channel)) return message.channel.send("O slowmode não está ativado neste canal.");
    slowmode.delete(channel);
    await message.channel.send(`<#${channel}> não está mais em slowmode!`);
  }
  tempo = `${tempo}000`;
  
  message.channel.send(`<#${channel}> agora está em slowmode!");
  slowmode.set(channel, tempo);
};
