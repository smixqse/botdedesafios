# Bot do Servidor do Core

Ao fazer pull requests de comandos, siga o exemplo [neste arquivo](https://github.com/smixqse/botdocore/blob/master/commands/command.js.example).

Para adicionar novos eventos em pull requests, crie um novo arquivo em /events/ com o nome do arquivo sendo o nome do evento (Ex.: guildMemberAdd.js, messageReactionAdd.js) e coloque isso.

```js
module.exports = (Discord, bot, [...]) => {
    // O código vem aqui.
};
```

Substitua `[...]` por argumentos que o evento precisa. Ex.: `(module.exports = (Discord, bot, messageReaction, user) => {})` (para o evento messageReactionAdd)

Se o arquivo já existe, apenas adicione código nele.
