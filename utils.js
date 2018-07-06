exports.mention = function (id) {
    return "<@" + id + "> ";
};

exports.addReactions = async function (message) {
    for (var i = 1; i < arguments.length; i++) {
        await message.react(arguments[i]);
    }
}