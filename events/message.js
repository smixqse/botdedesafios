/* global Set */
var cooldown = new Set();
const Discord = require("discord.js");
const axios = require("axios");
const crypto = require("crypto");
const moment = require("moment");
moment.locale("pt-br");

module.exports = (bot, message) => {
  if (message.author.bot) return;
  if (message.channel.type == "dm") return;
  if (message.guild.id != bot.config.guild) return;

  // Rolemention
  if (message.author.id == global.rolemention.author) {
    let role = message.guild.roles.cache.get(global.rolemention.roleID);
    if (message.mentions.has(role)) {
      role.setMentionable(false, "Pedido por staffer automaticamente.");
      global.rolemention.roleID = false;
      global.rolemention.author.id = "nada";
    }
  }

  // Message cooldown
  if (
    !message.author.bot &&
    bot.messageCooldown.isReady &&
    bot.punishments.isReady &&
    message.channel.permissionsFor(message.guild.me).has("MANAGE_MESSAGES")
  ) {
    (async () => {
      const cooldownTime = bot.config.messageCooldown.cooldown;
      if (
        bot.messageCooldown.filter(
          (a) =>
            a.user === message.author.id && Date.now() - a.time < cooldownTime
        ).size >= bot.config.messageCooldown.count
      ) {
        const timestamp = Date.now();
        const punishmentValue = bot.punishments.ensure(message.author.id, {
          amount: 0,
          time: timestamp
        });
        if (
          punishmentValue.amount > bot.config.messageCooldown.count &&
          timestamp - punishmentValue.time <
            bot.config.messageCooldown.punishmentCooldown
        ) {
          const mutedRole = message.guild.roles.cache.find(
            (role) => role.name === "Muted"
          );
          if (!message.member.roles.cache.has(mutedRole.id)) {
            const sentMsg = await message.channel.send(
              `❗ | ${message.author} foi floodar, agora tá mutado pra se acalmar um pouco. Toma.`
            );
            message.member.roles.add(mutedRole);
            setTimeout(() => {
              message.member.roles.remove(mutedRole);
            }, bot.config.messageCooldown.muteTime);
            setTimeout(async () => {
              const lastMsgs = await message.channel.messages.fetch({
                limit: 20
              });
              message.channel.bulkDelete(
                lastMsgs.filter((msg) => msg.author.id === message.author.id)
              );
            }, 500);
            sentMsg.delete({ timeout: 8000 });
          } else {
            setTimeout(async () => {
              const lastMsgs = await message.channel.messages.fetch({
                limit: 20
              });
              message.channel.bulkDelete(
                lastMsgs.filter((msg) => msg.author.id === message.author.id)
              );
            }, 500);
          }
        } else {
          if (punishmentValue.amount > bot.config.messageCooldown.count) {
            bot.punishments.delete(message.author.id);
          } else {
            bot.punishments.inc(message.author.id, "amount");
          }
          message.delete();
          if (
            (await message.channel.messages.fetch({ limit: 5 })).some(
              (msg) => msg.author.id === bot.user.id
            )
          )
            return;
          const messages = [
            "tá com pressa aí amigo? Toma um chá pra se acalmar. Conversa mais devagar.",
            "se acalma um pouquinho aí, amigo! Tá mandando muita mensagem.",
            "PARA DE MANDAR TANTA MENSAGEM!!!! Desculpa, tô bravo."
          ];
          const randomMessage =
            messages[Math.floor(Math.random() * messages.length)];
          const sentMsg = await message.channel.send(
            `❗ | ${message.author}, ${randomMessage}`
          );
          sentMsg.delete({ timeout: 5000 });
        }
      } else {
        bot.messageCooldown.set(message.id, {
          user: message.author.id,
          time: Date.now()
        });
      }
    })();
  }

  // Repeated attachment prevention
  if (message.channel.name === bot.config.repostChannel) {
    setTimeout(async () => {
      await bot.imgsDb.defer;
      message = await message.fetch();
      var attachment = {};
      if (message.attachments.size < 1) {
        if (message.embeds.length < 1) {
          attachment = "none";
        } else {
          attachment = "none";
          if (["image", "video", "gifv"].includes(message.embeds[0].type)) {
            attachment = message.embeds[0];
          }
        }
      } else {
        attachment = message.attachments.first();
      }

      if (attachment === "none") return;
      axios
        .get(attachment.url, {
          responseType: "arraybuffer"
        })
        .then(async (resp) => {
          var response = resp.data;
          const cryptoHash = crypto.createHash("sha1");
          cryptoHash.write(resp.data);
          cryptoHash.end();
          const hash = cryptoHash.read().toString("hex");
          var existsHash = bot.imgsDb.has(hash);
          if (existsHash) {
            try {
              var originalMsg = await message.channel.messages.fetch(
                bot.imgsDb.get(hash)
              );
              var author = originalMsg.author;
              message.delete();
              var embed = new Discord.MessageEmbed();
              embed.setTitle("Mídia possivelmente duplicada apagada");
              embed.setDescription(
                `enviada por ${author} ${moment(
                  originalMsg.createdTimestamp
                ).fromNow()}\n\n[Clique aqui para ver a postagem original](${
                  originalMsg.url
                })`
              );
              embed.setColor(message.guild.me.displayHexColor || "#00000");
              var sentMsg = await message.channel.send({
                embed
              });

              embed.setTitle(
                "Mídia possivelmente duplicada apagada no canal de memes"
              );
              embed.attachFiles([attachment.url]);
              message.guild.channels.resolve("420391239117176833").send({
                embed
              });
              sentMsg.delete({
                timeout: 15000
              });
            } catch (e) {
              bot.imgsDb.set(hash, message.id);
            }
          } else {
            bot.imgsDb.set(hash, message.id);
          }
        });
    }, 2000);
  }

  // Mini chat events
  if (
    (Math.floor(Math.random() * bot.config.chatEvents.probability) === 2 &&
      Math.floor(Math.random() * 2) === 0 &&
      message.channel.name === bot.config.chatEvents.channel &&
      message.channel.permissionsFor(message.guild.me).has("SEND_MESSAGES") &&
      !bot.eventRunning) ||
    (message.content.startsWith("ativar evento") &&
      bot.config.owners.includes(message.author.id))
  ) {
    const eventEnded = () => {
      bot.eventRunning = false;
    };
    const updatePoints = function (amount, ...users) {
      for (user of users) {
        bot.points.ensure(user.id, { user: user.id, points: 0 });
        bot.points.math(user.id, "+", amount, "points");
      }
      eventEnded();
    };
    bot.eventRunning = true;
    const events = {
      math: async () => {
        const numbers = [
          Math.floor(Math.random() * 300),
          Math.floor(Math.random() * 300)
        ];
        const result = numbers[0] + numbers[1];
        var eventMsg = await message.channel.send(
          `🎉 | Valendo 30 pontos, rápido: quanto é ${numbers[0]} + ${numbers[1]}?`
        );
        message.channel
          .awaitMessages((msg) => msg.content === result.toString(), {
            max: 1,
            time: 15000,
            errors: ["time"]
          })
          .then(async (msgs) => {
            const winner = msgs.first().author;
            const winnerMsg = await message.channel.send(
              `🎉 | ${winner} acertou primeiro e ganhou 30 pontos.`
            );
            updatePoints(30, winner);
            setTimeout(async () => {
              const lastMsgs = await message.channel.messages.fetch({
                limit: 40
              });
              message.channel.bulkDelete(
                lastMsgs.filter(
                  (msg) =>
                    !isNaN(msg.content.slice(0, 2)) &&
                    msg.attachments.size < 0 &&
                    msg.embeds.length < 0
                )
              );
            }, 2000);
            eventMsg.delete();
          })
          .catch(async (e) => {
            const winnerMsg = await message.channel.send(
              `🎉 | Vocês demoraram muito. A resposta era ${result}.`
            );
            setTimeout(async () => {
              const lastMsgs = await message.channel.messages.fetch({
                limit: 40
              });
              message.channel.bulkDelete(
                lastMsgs.filter(
                  (msg) =>
                    !isNaN(msg.content.slice(0, 2)) &&
                    msg.attachments.size < 0 &&
                    msg.embeds.length < 0
                )
              );
            }, 2000);
            eventMsg.delete();
            setTimeout(
              () =>
                winnerMsg.edit(
                  "🎉 | Aqui aconteceu um evento que ninguém ganhou."
                ),
              10000
            );
            eventEnded();
          });
      },
      luckyNumber: async () => {
        const number = Math.floor(Math.random() * 10).toString();
        var eventMsg = await message.channel.send(
          `🎉 | Valendo 50 pontos, digite seu número da sorte entre 0 e 9, e daqui a pouco sortearemos.`
        );
        message.channel
          .awaitMessages((msg) => !isNaN(msg.content), {
            time: 10000,
            errors: ["time"]
          })
          .catch(async (msgs) => {
            var processedUsers = [];
            var winners = [];
            var duplicateUsers = [];
            msgs.forEach(async (msg) => {
              if (processedUsers.includes(msg.author.id)) {
                if (!duplicateUsers.includes(msg.author))
                  duplicateUsers.push(msg.author);
                return;
              } else {
                if (msg.content === number) {
                  winners.push(msg.author);
                }
                processedUsers.push(msg.author.id);
              }
            });
            var msgToSend;
            if (winners.length < 1) {
              msgToSend = `🎉 | Ninguém ganhou! O número era ${number}.`;
            } else {
              var single = winners.length === 1;
              msgToSend = `🎉 | ${winners.join(", ")} ${
                single ? "é" : "são"
              } o${single ? "" : "s"} ganhador${
                single ? "" : "es"
              }! O número era ${number}.`;
            }
            if (duplicateUsers.length > 0) {
              msgToSend += `\n\nE atenção para ${duplicateUsers.join(
                " e "
              )}: mandar um número mais de uma vez não funciona.`;
            }
            updatePoints(50, ...winners);
            const winnerMsg = await message.channel.send(msgToSend);
            setTimeout(async () => {
              const lastMsgs = await message.channel.messages.fetch({
                limit: 40
              });
              message.channel.bulkDelete(
                lastMsgs.filter(
                  (msg) =>
                    !isNaN(msg.content.slice(0, 2)) &&
                    msg.attachments.size < 0 &&
                    msg.embeds.length < 0
                )
              );
            }, 1000);
            eventMsg.delete();
          });
      },
      reaction: async () => {
        const emojis = ["😳", "😄", "🥺", "😭", "😔", "😍", "🦧"];
        var emoji = emojis[Math.floor(Math.random() * emojis.length)];
        var eventMsg = await message.channel.send(
          `🎉 | O primeiro que reagir a esta mensagem com ${emoji} ganha 50 pontos.`
        );
        eventMsg
          .awaitReactions((rea) => rea.emoji.name === emoji, {
            max: 1,
            time: 15000,
            errors: ["time"]
          })
          .then(async (reas) => {
            const winner = reas.first().users.cache.first();
            const winnerMsg = await message.channel.send(
              `🎉 | ${winner} reagiu primeiro.`
            );
            updatePoints(50, winner);
            eventMsg.delete();
          })
          .catch(async (e) => {
            const winnerMsg = await message.channel.send(
              "🎉 | Vocês demoraram muito pra reagir."
            );
            eventMsg.delete();
            setTimeout(
              () =>
                winnerMsg.edit(
                  "🎉 | Aqui aconteceu um evento que ninguém ganhou."
                ),
              10000
            );
            eventEnded();
          });
      },
      fastType: async () => {
        const blank = "‎";
        const firstPartsMasc = [
          "um empresário",
          "um veterinário",
          "um gamer",
          "um pastor",
          "um fazendeiro",
          "um médico",
          "um enfermeiro",
          "um preguiçoso",
          "um homem comum",
          "um cachorro",
          "um gato",
          "um artista"
        ];
        const firstPartsFem = [
          "uma empresária",
          "uma veterinária",
          "uma gamer",
          "uma pastora",
          "uma fazendeira",
          "uma médica",
          "uma enfermeira",
          "uma preguiçosa",
          "uma mulher comum",
          "uma gata",
          "uma artista"
        ];
        const namesMasc = [
          "Roberto",
          "Rogério",
          "Cristiano",
          "Alexandre",
          "Lucas",
          "Leonardo",
          "Cebolinha",
          "Core",
          "Carlos",
          "Luciano"
        ];
        const namesFem = [
          "Roberta",
          "Renata",
          "Maria",
          "Ana",
          "Joana",
          "Letícia",
          "Emilly",
          "Helena",
          "Luciana"
        ];
        const thirdParts = ["gosta de", "ama", "odeia", "não gosta de"];
        const fourthParts = [
          "comer banana",
          "comer maçã",
          "comer manga",
          "beber café",
          "estudar",
          "criar coisas",
          "dormir",
          "dançar",
          "conversar",
          "cantar"
        ];
        const randomFrom = (array) => {
          return array[Math.floor(Math.random() * array.length)];
        };
        const fem = Math.floor(Math.random() * 2) === 0;
        const text = fem
          ? `${randomFrom(firstPartsFem)} chamada ${randomFrom(
              namesFem
            )} ${randomFrom(thirdParts)} ${randomFrom(fourthParts)}`
          : `${randomFrom(firstPartsMasc)} chamado ${randomFrom(
              namesMasc
            )} ${randomFrom(thirdParts)} ${randomFrom(fourthParts)}`;
        var eventMsg = await message.channel.send(
          `🎉 | Valendo 30 pontos, rápido: digite \`${text
            .split("")
            .join(blank)}\` no chat!`
        );
        message.channel
          .awaitMessages(
            (msg) => msg.content.toLowerCase() === text.toLowerCase(),
            {
              max: 1,
              time: 15000,
              errors: ["time"]
            }
          )
          .then(async (msgs) => {
            const winner = msgs.first().author;
            const winnerMsg = await message.channel.send(
              `🎉 | ${winner} digitou corretamente primeiro e ganhou 30 pontos.`
            );
            updatePoints(30, winner);
            setTimeout(async () => {
              const lastMsgs = await message.channel.messages.fetch({
                limit: 40
              });
              message.channel.bulkDelete(
                lastMsgs.filter(
                  (msg) =>
                    msg.content.toLowerCase().slice(0, 4) ===
                      text.slice(0, 4) &&
                    msg.attachments.size < 0 &&
                    msg.embeds.length < 0
                )
              );
            }, 2000);
            eventMsg.delete();
          })
          .catch(async (e) => {
            const winnerMsg = await message.channel.send(
              `🎉 | Ninguém digitou a tempo.`
            );
            setTimeout(async () => {
              const lastMsgs = await message.channel.messages.fetch({
                limit: 40
              });
              message.channel.bulkDelete(
                lastMsgs.filter(
                  (msg) =>
                    msg.content.toLowerCase().slice(0, 4) ===
                      text.slice(0, 4) &&
                    msg.attachments.size < 0 &&
                    msg.embeds.length < 0
                )
              );
            }, 2000);
            eventMsg.delete();
            setTimeout(
              () =>
                winnerMsg.edit(
                  "🎉 | Aqui aconteceu um evento que ninguém ganhou."
                ),
              10000
            );
            eventEnded();
          });
      },
      nextMsgs: async () => {
        const numbers = [
          "segundo",
          "terceiro",
          "quarto",
          "quinto",
          "sexto",
          "sétimo",
          "oitavo"
        ];
        const quantity = Math.floor(Math.random() * 7);
        var eventMsg = await message.channel.send(
          `🎉 | O ${numbers[quantity]} a mandar mensagem abaixo ganha 30 pontos.`
        );
        message.channel
          .awaitMessages((msg) => !msg.author.bot, {
            max: quantity + 2,
            time: 20000,
            errors: ["time"]
          })
          .then(async (msgs) => {
            const winner = msgs.last().author;
            var unfair = false;
            if (
              msgs.reduce(
                (acc, m) => acc + (m.author.id === winner.id ? 1 : 0),
                0
              ) >=
                quantity + 1 &&
              quantity > 1
            )
              unfair = true;
            if (unfair) {
              const winnerMsg = await message.channel.send(
                `🎉 | ${winner}, você não ganhou nada por forçar a vitória (mandou muitas mensagens para ganhar).`
              );
              eventEnded();
              setTimeout(async () => {
                const lastMsgs = await message.channel.messages.fetch({
                  limit: quantity + 2
                });
                message.channel.bulkDelete(
                  lastMsgs.filter(
                    (msg) =>
                      msg.content.length < 5 &&
                      msg.attachments.size < 0 &&
                      msg.embeds.length < 0
                  )
                );
              }, 2000);
              setTimeout(
                () =>
                  winnerMsg.edit(
                    "🎉 | Aqui aconteceu um evento que ninguém ganhou."
                  ),
                10000
              );
            } else {
              const winnerMsg = await message.channel.send(
                `🎉 | ${winner} ganhou 30 pontos.`
              );
              updatePoints(30, winner);
              setTimeout(async () => {
                const lastMsgs = await message.channel.messages.fetch({
                  limit: quantity + 2
                });
                message.channel.bulkDelete(
                  lastMsgs.filter(
                    (msg) =>
                      msg.content.length < 5 &&
                      msg.attachments.size < 0 &&
                      msg.embeds.length < 0
                  )
                );
              }, 1500);
            }
            eventMsg.delete();
          })
          .catch(async (e) => {
            const winnerMsg = await message.channel.send(
              `🎉 | Parece que o chat morreu. Que triste.`
            );
            eventMsg.delete();
            setTimeout(
              () =>
                winnerMsg.edit(
                  "🎉 | Aqui aconteceu um evento que ninguém ganhou."
                ),
              10000
            );
            eventEnded();
          });
      }
    };
    const startRandomEvent = () => {
      events[
        Object.keys(events)[
          Math.floor(Math.random() * Object.keys(events).length)
        ]
      ]();
    };
    if (
      message.content.startsWith("ativar evento") &&
      bot.config.owners.includes(message.author.id)
    ) {
      if (message.content.split(" ").slice(2).length > 0) {
        events[message.content.split(" ").slice(2)]();
      } else {
        startRandomEvent();
      }
    } else {
      startRandomEvent();
    }
  }

  // Commands
  if (!message.content.split(" ")[0].startsWith(bot.config.prefix)) return;
  let command = message.content.split(" ")[0].slice(bot.config.prefix.length);
  let args = message.content.split(" ").slice(1);
  const cmd = bot.commands.get(command);
  if (!cmd) return;
  if (
    (cmd.only != null &&
      cmd.only.includes(message.channel.name.toLowerCase())) ||
    (cmd.only != null && cmd.only[0] == "all") ||
    (bot.config.defaultOnlyChannels != null &&
      bot.config.defaultOnlyChannels.includes(
        message.channel.name.toLowerCase()
      ))
  ) {
    if (
      cooldown.has(message.author.id) &&
      bot.config.defaultOnlyChannels.includes(
        message.channel.name.toLowerCase()
      ) &&
      !bot.config.owners.includes(message.author.id)
    )
      message.channel.send(
        "<@" +
          message.author.id +
          "> Espere alguns segundos pra usar comandos novamente."
      );
    message.delete();
    if (
      cooldown.has(message.author.id) &&
      !bot.config.owners.includes(message.author.id)
    )
      return;
    cooldown.add(message.author.id);
    setTimeout(() => {
      cooldown.delete(message.author.id);
    }, 5000);
    cmd.run(bot, message, args);
  }
};
