function getLetters() { return ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"]; }
exports.aliases = ["pcor", "pcolor", "pcores"];
exports.description = "Substituído por g.cor";
exports.run = (Discord, bot, message, args) => {
    message.channel.send("Querendo pegar alguma cor? As coisas mudaram. Use `g.cor`.");
};