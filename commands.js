/**
 * This is the file where the bot commands are located
 *
 * @license MIT license
 */

var http = require('http');

if (Config.serverid === 'showdown') {
	var https = require('https');
	var csv = require('csv-parse');
}

exports.commands = {
	/**
	 * Help commands
	 *
	 * These commands are here to provide information about the bot.
	 */
	 
	credits: 'about',
	about: function (arg, user, room) {
		var text = (room === user || user.hasRank(room, '#')) ? '' : '/pm ' + user.id + ', ';
		text += '**RKO-Bot:** A bot that hits an RKO outta nowhere...when you least expect it. Base repo made by TTT, modified by Ruby D.';
		this.say(room, text);
	},
	
	git: function (arg, user, room) {
		var text = (room === user || user.isExcepted) ? '' : '/pm ' + user.id + ', ';
		text += '**Pokemon Showdown Bot** source code: ' + Config.fork;
		this.say(room, text);
	},
	
	help: 'guide',
	guide: function (arg, user, room) {
		var text = (room === user || user.hasRank(room, '#'))  ? '' : '/pm ' + user.id + ', ';
		if (Config.botguide) {
			text += 'A guide on how to use this bot can be found here: ' + Config.botguide;
		} else {
			text += 'There is no guide for this bot. PM the owner with any questions.';
		}
		this.say(room, text);
	},

	/**
	 * Dev commands
	 *
	 * These commands are here for highly ranked users (or the creator) to use
	 * to perform arbitrary actions that can't be done through any other commands
	 * or to help with upkeep of the bot.
	 */

	reload: function (arg, user, room) {
		if (!user.isExcepted) return false;
		try {
			this.uncacheTree('./commands.js');
			Commands = require('./commands.js').commands;
			this.say(room, 'Commands reloaded.');
		} catch (e) {
			error('failed to reload: ' + e.stack);
		}
	},
	custom: function (arg, user, room) {
		if (!user.isExcepted) return false;
		// Custom commands can be executed in an arbitrary room using the syntax
		// ".custom [room] command", e.g., to do !data pikachu in the room lobby,
		// the command would be ".custom [lobby] !data pikachu". However, using
		// "[" and "]" in the custom command to be executed can mess this up, so
		// be careful with them.
		if (arg.indexOf('[') !== 0 || arg.indexOf(']') < 0) {
			return this.say(room, arg);
		}
		var tarRoomid = arg.slice(1, arg.indexOf(']'));
		var tarRoom = Rooms.get(tarRoomid);
		if (!tarRoom) return this.say(room, Users.self.name + ' is not in room ' + tarRoomid + '!');
		arg = arg.substr(arg.indexOf(']') + 1).trim();
		this.say(tarRoom, arg);
	},
	js: function (arg, user, room) {
		if (!user.isExcepted) return false;
		try {
			let result = eval(arg.trim());
			this.say(room, JSON.stringify(result));
		} catch (e) {
			this.say(room, e.name + ": " + e.message);
		}
	},
	uptime: function (arg, user, room) {
		var text = ((room === user || user.isExcepted) ? '' : '/pm ' + user.id + ', ') + '**Uptime:** ';
		var divisors = [52, 7, 24, 60, 60];
		var units = ['week', 'day', 'hour', 'minute', 'second'];
		var buffer = [];
		var uptime = ~~(process.uptime());
		do {
			let divisor = divisors.pop();
			let unit = uptime % divisor;
			buffer.push(unit > 1 ? unit + ' ' + units.pop() + 's' : unit + ' ' + units.pop());
			uptime = ~~(uptime / divisor);
		} while (uptime);

		switch (buffer.length) {
		case 5:
			text += buffer[4] + ', ';
			/* falls through */
		case 4:
			text += buffer[3] + ', ';
			/* falls through */
		case 3:
			text += buffer[2] + ', ' + buffer[1] + ', and ' + buffer[0];
			break;
		case 2:
			text += buffer[1] + ' and ' + buffer[0];
			break;
		case 1:
			text += buffer[0];
			break;
		}

		this.say(room, text);
	}, 


	/**
	 * Room Owner commands
	 *
	 * These commands allow room owners to personalise settings for moderation and command use.
	 */

	settings: 'set',
	set: function (arg, user, room) {
		if (room === user || !user.hasRank(room, '#')) return false;

		var settable = {
			autoban: 1,
			banword: 1,
			say: 1,
			joke: 1,
			usagestats: 1,
			'8ball': 1,
			guia: 1,
			studio: 1,
			wifi: 1,
			monotype: 1,
			survivor: 1,
			happy: 1,
			buzz: 1
		};
		var modOpts = {
			flooding: 1,
			caps: 1,
			stretching: 1,
			bannedwords: 1
		};

		var opts = arg.split(',');
		var cmd = toId(opts[0]);
		var setting;
		if (cmd === 'm' || cmd === 'mod' || cmd === 'modding') {
			let modOpt = toId(opts[1]);
			if (!modOpts[modOpt]) return this.say(room, 'Incorrect command: correct syntax is ' + Config.commandcharacter + 'set mod, [' +
				Object.keys(modOpts).join('/') + '](, [on/off])');

			setting = toId(opts[2]);
			if (!setting) return this.say(room, 'Moderation for ' + modOpt + ' in this room is currently ' +
				(this.settings.modding[room] && modOpt in this.settings.modding[room] ? 'OFF' : 'ON') + '.');

			let roomid = room.id;
			if (!this.settings.modding) this.settings.modding = {};
			if (!this.settings.modding[roomid]) this.settings.modding[roomid] = {};
			if (setting === 'on') {
				delete this.settings.modding[roomid][modOpt];
				if (Object.isEmpty(this.settings.modding[roomid])) delete this.settings.modding[roomid];
				if (Object.isEmpty(this.settings.modding)) delete this.settings.modding;
			} else if (setting === 'off') {
				this.settings.modding[roomid][modOpt] = 0;
			} else {
				return this.say(room, 'Incorrect command: correct syntax is ' + Config.commandcharacter + 'set mod, [' +
					Object.keys(modOpts).join('/') + '](, [on/off])');
			}

			this.writeSettings();
			return this.say(room, 'Moderation for ' + modOpt + ' in this room is now ' + setting.toUpperCase() + '.');
		}

		if (!(cmd in Commands)) return this.say(room, Config.commandcharacter + '' + opts[0] + ' is not a valid command.');

		var failsafe = 0;
		while (true) {
			if (typeof Commands[cmd] === 'string') {
				cmd = Commands[cmd];
			} else if (typeof Commands[cmd] === 'function') {
				if (cmd in settable) break;
				return this.say(room, 'The settings for ' + Config.commandcharacter + '' + opts[0] + ' cannot be changed.');
			} else {
				return this.say(room, 'Something went wrong. PM Morfent or TalkTakesTime here or on Smogon with the command you tried.');
			}

			if (++failsafe > 5) return this.say(room, 'The command "' + Config.commandcharacter + '' + opts[0] + '" could not be found.');
		}

		var settingsLevels = {
			off: false,
			disable: false,
			'false': false,
			'+': '+',
			'%': '%',
			'@': '@',
			'#': '#',
			'&': '&',
			'~': '~',
			on: true,
			enable: true,
			'true': true
		};

		var roomid = room.id;
		setting = opts[1].trim().toLowerCase();
		if (!setting) {
			let msg = '' + Config.commandcharacter + '' + cmd + ' is ';
			if (!this.settings[cmd] || (!(roomid in this.settings[cmd]))) {
				msg += 'available for users of rank ' + ((cmd === 'autoban' || cmd === 'banword') ? '#' : Config.defaultrank) + ' and above.';
			} else if (this.settings[cmd][roomid] in settingsLevels) {
				msg += 'available for users of rank ' + this.settings[cmd][roomid] + ' and above.';
			} else {
				msg += this.settings[cmd][roomid] ? 'available for all users in this room.' : 'not available for use in this room.';
			}

			return this.say(room, msg);
		}

		if (!(setting in settingsLevels)) return this.say(room, 'Unknown option: "' + setting + '". Valid settings are: off/disable/false, +, %, @, #, &, ~, on/enable/true.');
		if (!this.settings[cmd]) this.settings[cmd] = {};
		this.settings[cmd][roomid] = settingsLevels[setting];

		this.writeSettings();
		this.say(room, 'The command ' + Config.commandcharacter + '' + cmd + ' is now ' +
			(settingsLevels[setting] === setting ? ' available for users of rank ' + setting + ' and above.' :
			(this.settings[cmd][roomid] ? 'available for all users in this room.' : 'unavailable for use in this room.')));
	},
	blacklist: 'autoban',
	ban: 'autoban',
	ab: 'autoban',
	autoban: function (arg, user, room) {
		if (room === user || !user.canUse('autoban', room)) return false;
		if (!Users.self.hasRank(room, '@')) return this.say(room, Users.self.name + ' requires rank of @ or higher to (un)blacklist.');
		if (!toId(arg)) return this.say(room, 'You must specify at least one user to blacklist.');

		arg = arg.split(',');
		var added = [];
		var illegalNick = [];
		var alreadyAdded = [];
		var roomid = room.id;
		for (let i = 0; i < arg.length; i++) {
			let tarUser = toId(arg[i]);
			if (!tarUser || tarUser.length > 18) {
				illegalNick.push(tarUser);
			} else if (!this.blacklistUser(tarUser, roomid)) {
				alreadyAdded.push(tarUser);
			} else {
				added.push(tarUser);
				this.say(room, '/roomban ' + tarUser + ', Blacklisted user');
			}
		}

		var text = '';
		if (added.length) {
			text += 'User' + (added.length > 1 ? 's "' + added.join('", "') + '" were' : ' "' + added[0] + '" was') + ' added to the blacklist.';
			this.say(room, '/modnote ' + text + ' by ' + user.name + '.');
			this.writeSettings();
		}
		if (alreadyAdded.length) {
			text += ' User' + (alreadyAdded.length > 1 ? 's "' + alreadyAdded.join('", "') + '" are' : ' "' + alreadyAdded[0] + '" is') + ' already present in the blacklist.';
		}
		if (illegalNick.length) text += (text ? ' All other' : 'All') + ' users had illegal nicks and were not blacklisted.';
		this.say(room, text);
	},
	unblacklist: 'unautoban',
	unban: 'unautoban',
	unab: 'unautoban',
	unautoban: function (arg, user, room) {
		if (room === user || !user.canUse('autoban', room)) return false;
		if (!Users.self.hasRank(room, '@')) return this.say(room, Users.self.name + ' requires rank of @ or higher to (un)blacklist.');
		if (!toId(arg)) return this.say(room, 'You must specify at least one user to unblacklist.');

		arg = arg.split(',');
		var removed = [];
		var notRemoved = [];
		var roomid = room.id;
		for (let i = 0; i < arg.length; i++) {
			let tarUser = toId(arg[i]);
			if (!tarUser || tarUser.length > 18) {
				notRemoved.push(tarUser);
			} else if (!this.unblacklistUser(tarUser, roomid)) {
				notRemoved.push(tarUser);
			} else {
				removed.push(tarUser);
				this.say(room, '/roomunban ' + tarUser);
			}
		}

		var text = '';
		if (removed.length) {
			text += ' User' + (removed.length > 1 ? 's "' + removed.join('", "') + '" were' : ' "' + removed[0] + '" was') + ' removed from the blacklist';
			this.say(room, '/modnote ' + text + ' by user ' + user.name + '.');
			this.writeSettings();
		}
		if (notRemoved.length) text += (text.length ? ' No other' : 'No') + ' specified users were present in the blacklist.';
		this.say(room, text);
	},
	rab: 'regexautoban',
	regexautoban: function (arg, user, room) {
		if (room === user || !user.isRegexWhitelisted || !user.canUse('autoban', room)) return false;
		if (!Users.self.hasRank(room, '@')) return this.say(room, Users.self.name + ' requires rank of @ or higher to (un)blacklist.');
		if (!arg) return this.say(room, 'You must specify a regular expression to (un)blacklist.');

		try {
			new RegExp(arg, 'i');
		} catch (e) {
			return this.say(room, e.message);
		}

		// checks if the user is attempting to autoban everyone
		// this isn't foolproof, but good enough to catch mistakes.
		// if a user bypasses this to autoban everyone, then they shouldn't be on the regex autoban whitelist
		if (/^(?:(?:\.+|[a-z0-9]|\\[a-z0-9SbB])(?![a-z0-9\.\\])(?:[*+]|\{\d+\,(?:\d+)?\})?)+$/i.test(arg)) {
			return this.say(room, 'Regular expression /' + arg + '/i cannot be added to the blacklist. Proofread your regex so it no longer matches all names.');
		}

		arg = '/' + arg + '/i';
		if (!this.blacklistUser(arg, room.id)) return this.say(room, '/' + arg + ' is already present in the blacklist.');

		this.writeSettings();
		this.say(room, '/modnote Regular expression ' + arg + ' was added to the blacklist by user ' + user.name + '.');
		this.say(room, 'Regular expression ' + arg + ' was added to the blacklist.');
	},
	unrab: 'unregexautoban',
	unregexautoban: function (arg, user, room) {
		if (room === user || !user.isRegexWhitelisted || !user.canUse('autoban', room)) return false;
		if (!Users.self.hasRank(room, '@')) return this.say(room, Users.self.name + ' requires rank of @ or higher to (un)blacklist.');
		if (!arg) return this.say(room, 'You must specify a regular expression to (un)blacklist.');

		arg = '/' + arg.replace(/\\\\/g, '\\') + '/i';
		if (!this.unblacklistUser(arg, room.id)) return this.say(room, '/' + arg + ' is not present in the blacklist.');

		this.writeSettings();
		this.say(room, '/modnote Regular expression ' + arg + ' was removed from the blacklist user by ' + user.name + '.');
		this.say(room, 'Regular expression ' + arg + ' was removed from the blacklist.');
	},
	viewbans: 'viewblacklist',
	vab: 'viewblacklist',
	viewautobans: 'viewblacklist',
	viewblacklist: function (arg, user, room) {
		if (room === user || !user.canUse('autoban', room)) return false;

		var text = '/pm ' + user.id + ', ';
		if (!this.settings.blacklist) return this.say(room, text + 'No users are blacklisted in this room.');

		var roomid = room.id;
		var blacklist = this.settings.blacklist[roomid] || this.settings.blacklist;
		if (!blacklist) return this.say(room, text + 'No users are blacklisted in this room.');

		if (arg.length) {
			let nick = toId(arg);
			if (!nick || nick.length > 18) {
				text += 'Invalid username: "' + nick + '".';
			} else {
				text += 'User "' + nick + '" is currently ' + (blacklist[nick] || 'not ') + 'blacklisted in ' + roomid + '.';
			}
		} else {
			let userlist = Object.keys(blacklist);
			if (!userlist.length) return this.say(room, text + 'No users are blacklisted in this room.');
			this.uploadToHastebin('The following users are banned from ' + roomid + ':\n\n' + userlist.join('\n'), function (link) {
				if (!link.startsWith('Error')) text += 'Blacklist for room ' + roomid + ': ';
				text += link;
			}.bind(this));
		}

		this.say(room, text);
	},
	banphrase: 'banword',
	banword: function (arg, user, room) {
		arg = arg.trim().toLowerCase();
		if (!arg) return false;

		var tarRoom = room.id;
		if (room === user) {
			if (!user.isExcepted) return false;
			tarRoom = 'global';
		} else if (user.canUse('banword', room)) {
			tarRoom = room.id;
		} else {
			return false;
		}

		var bannedPhrases = this.settings.bannedphrases ? this.settings.bannedphrases[tarRoom] : null;
		if (!bannedPhrases) {
			if (bannedPhrases === null) this.settings.bannedphrases = {};
			bannedPhrases = (this.settings.bannedphrases[tarRoom] = {});
		} else if (bannedPhrases[arg]) {
			return this.say(room, 'Phrase "' + arg + '" is already banned.');
		}
		bannedPhrases[arg] = 1;

		this.writeSettings();
		this.say(room, 'Phrase "' + arg + '" is now banned.');
	},
	unbanphrase: 'unbanword',
	unbanword: function (arg, user, room) {
		var tarRoom;
		if (room === user) {
			if (!user.isExcepted) return false;
			tarRoom = 'global';
		} else if (user.canUse('banword', room)) {
			tarRoom = room.id;
		} else {
			return false;
		}

		arg = arg.trim().toLowerCase();
		if (!arg) return false;
		if (!this.settings.bannedphrases) return this.say(room, 'Phrase "' + arg + '" is not currently banned.');

		var bannedPhrases = this.settings.bannedphrases[tarRoom];
		if (!bannedPhrases || !bannedPhrases[arg]) return this.say(room, 'Phrase "' + arg + '" is not currently banned.');

		delete bannedPhrases[arg];
		if (Object.isEmpty(bannedPhrases)) {
			delete this.settings.bannedphrases[tarRoom];
			if (Object.isEmpty(this.settings.bannedphrases)) delete this.settings.bannedphrases;
		}

		this.writeSettings();
		this.say(room, 'Phrase \"' + arg + '\" is no longer banned.');
	},
	viewbannedphrases: 'viewbannedwords',
	vbw: 'viewbannedwords',
	viewbannedwords: function (arg, user, room) {
		var tarRoom = room.id;
		var text = '';
		var bannedFrom = '';
		if (room === user) {
			if (!user.isExcepted) return false;
			tarRoom = 'global';
			bannedFrom += 'globally';
		} else if (user.canUse('banword', room)) {
			text += '/pm ' + user.id + ', ';
			bannedFrom += 'in ' + room.id;
		} else {
			return false;
		}

		if (!this.settings.bannedphrases) return this.say(room, text + 'No phrases are banned in this room.');
		var bannedPhrases = this.settings.bannedphrases[tarRoom];
		if (!bannedPhrases) return this.say(room, text + 'No phrases are banned in this room.');

		if (arg.length) {
			text += 'The phrase "' + arg + '" is currently ' + (bannedPhrases[arg] || 'not ') + 'banned ' + bannedFrom + '.';
			return this.say(room, text);
		}

		var banList = Object.keys(bannedPhrases);
		if (!banList.length) return this.say(room, text + 'No phrases are banned in this room.');

		this.uploadToHastebin('The following phrases are banned ' + bannedFrom + ':\n\n' + banList.join('\n'), function (link) {
			if (!link.startsWith('Error')) text += 'Banned phrases ' + bannedFrom + ': ';
			text += link;
		}.bind(this));

		this.say(room, text);
	},

	/**
	 * General commands
	 *
	 * Add custom commands here.
	 */

	tell: 'say',
	say: function (arg, user, room) {
		if (room === user || !user.canUse('say', room)) return false;
		this.say(room, stripCommands(arg) + ' (' + user.name + ' said this)');
	},
	joke: function (arg, user, room) {
		if (room === user || !user.canUse('joke', room)) return false;
		var self = this;

		var reqOpt = {
			hostname: 'api.icndb.com',
			path: '/jokes/random',
			method: 'GET'
		};
		var req = http.request(reqOpt, function (res) {
			res.on('data', function (chunk) {
				try {
					let data = JSON.parse(chunk);
					self.say(room, data.value.joke.replace(/&quot;/g, "\""));
				} catch (e) {
					self.say(room, 'Sorry, couldn\'t fetch a random joke... :(');
				}
			});
		});
		req.end();
	},
	usage: 'usagestats',
	usagestats: function (arg, user, room) {
		var text = (room === user || user.canUse('usagestats', room)) ? '' : '/pm ' + user.id + ', ';
		text += 'http://www.smogon.com/stats/2015-04/';
		this.say(room, text);
	},
	seen: function (arg, user, room) { // this command is still a bit buggy
		var text = (room === user ? '' : '/pm ' + user.id + ', ');
		arg = toId(arg);
		if (!arg || arg.length > 18) return this.say(room, text + 'Invalid username.');
		if (arg === user.id) {
			text += 'Have you looked in the mirror lately?';
		} else if (arg === Users.self.id) {
			text += 'You might be either blind or illiterate. Might want to get that checked out.';
		} else if (!this.chatData[arg] || !this.chatData[arg].seenAt) {
			text += 'The user ' + arg + ' has never been seen.';
		} else {
			text += arg + ' was last seen ' + this.getTimeAgo(this.chatData[arg].seenAt) + ' ago' + (
				this.chatData[arg].lastSeen ? ', ' + this.chatData[arg].lastSeen : '.');
		}
		this.say(room, text);
	},
	'8ball': function (arg, user, room) {
		var text = (room === user || user.canUse('8ball', room)) ? '' : '/pm ' + user.id + ', ';
		var rand = ~~(20 * Math.random());

		switch (rand) {
	 		case 0:
				text += "Signs point to yes.";
				break;
	  		case 1:
				text += "Yes.";
				break;
			case 2:
				text += "Reply hazy, try again.";
				break;
			case 3:
				text += "Without a doubt.";
				break;
			case 4:
				text += "My sources say no.";
				break;
			case 5:
				text += "As I see it, yes.";
				break;
			case 6:
				text += "You may rely on it.";
				break;
			case 7:
				text += "Concentrate and ask again.";
				break;
			case 8:
				text += "Outlook not so good.";
				break;
			case 9:
				text += "It is decidedly so.";
				break;
			case 10:
				text += "Better not tell you now.";
				break;
			case 11:
				text += "Very doubtful.";
				break;
			case 12:
				text += "Yes - definitely.";
				break;
			case 13:
				text += "It is certain.";
				break;
			case 14:
				text += "Cannot predict now.";
				break;
			case 15:
				text += "Most likely.";
				break;
			case 16:
				text += "Ask again later.";
				break;
			case 17:
				text += "My reply is no.";
				break;
			case 18:
				text += "Outlook good.";
				break;
			case 19:
				text += "Don't count on it.";
				break;
			case 20:
				text += "You got struck by an **RKO OUTTA NOWHERE**!";
				break;
		}
		this.say(room, text);
	},

	/**
	 * Room specific commands
	 *
	 * These commands are used in specific rooms on the Smogon server.
	 */
	espaol: 'esp',
	ayuda: 'esp',
	esp: function (arg, user, room) {
		// links to relevant sites for the Wi-Fi room 
		if (Config.serverid !== 'showdown') return false;
		var text = '';
		if (room.id === 'espaol') {
			if (!user.canUse('guia', room)) text += '/pm ' + user.id + ', ';
		} else if (room !== user) {
			return false;
		}
		var messages = {
			reglas: 'Recuerda seguir las reglas de nuestra sala en todo momento: http://ps-salaespanol.weebly.com/reglas.html',
			faq: 'Preguntas frecuentes sobre el funcionamiento del chat: http://ps-salaespanol.weebly.com/faq.html',
			faqs: 'Preguntas frecuentes sobre el funcionamiento del chat: http://ps-salaespanol.weebly.com/faq.html',
			foro: '¡Visita nuestro foro para participar en multitud de actividades! http://ps-salaespanol.proboards.com/',
			guia: 'Desde este índice (http://ps-salaespanol.proboards.com/thread/575/ndice-de-gu) podrás acceder a toda la información importante de la sala. By: Lost Seso',
			liga: '¿Tienes alguna duda sobre la Liga? ¡Revisa el **índice de la Liga** aquí!: (http://goo.gl/CxH2gi) By: xJoelituh'
		};
		text += (toId(arg) ? (messages[toId(arg)] || '¡Bienvenidos a la comunidad de habla hispana! Si eres nuevo o tienes dudas revisa nuestro índice de guías: http://ps-salaespanol.proboards.com/thread/575/ndice-de-gu') : '¡Bienvenidos a la comunidad de habla hispana! Si eres nuevo o tienes dudas revisa nuestro índice de guías: http://ps-salaespanol.proboards.com/thread/575/ndice-de-gu');
		this.say(room, text);
	},
	studio: function (arg, user, room) {
		if (Config.serverid !== 'showdown') return false;
		var text = '';
		if (room.id === 'thestudio') {
			if (!user.canUse('studio', room)) text += '/pm ' + user.id + ', ';
		} else if (room !== user) {
			return false;
		}
		var messages = {
			plug: '/announce The Studio\'s plug.dj can be found here: https://plug.dj/the-studio/'
		};
		this.say(room, text + (messages[toId(arg)] || ('Welcome to The Studio, a music sharing room on PS!. If you have any questions, feel free to PM a room staff member. Available commands for .studio: ' + Object.keys(messages).join(', '))));
	},
	wifi: function (arg, user, room) {
		// links to relevant sites for the Wi-Fi room 
		if (Config.serverid !== 'showdown') return false;
		var text = '';
		if (room.id === 'wifi') {
			if (!user.canUse('wifi', room)) text += '/pm ' + user.id + ', ';
		} else if (room !== user) {
			return false;
		}

		arg = arg.split(',');
		var msgType = toId(arg[0]);
		if (!msgType) return this.say(room, 'Welcome to the Wi-Fi room! Links can be found here: http://pstradingroom.weebly.com/links.html');

		switch (msgType) {
		case 'intro': 
			return this.say(room, text + 'Here is an introduction to Wi-Fi: http://tinyurl.com/welcome2wifi');
		case 'rules': 
			return this.say(room, text + 'The rules for the Wi-Fi room can be found here: http://pstradingroom.weebly.com/rules.html');
		case 'faq':
		case 'faqs':
			return this.say(room, text + 'Wi-Fi room FAQs: http://pstradingroom.weebly.com/faqs.html');
		case 'scammers':
			return this.say(room, text + 'List of known scammers: http://tinyurl.com/psscammers');
		case 'cloners':
			return this.say(room, text + 'List of approved cloners: http://goo.gl/WO8Mf4');
		case 'tips':
			return this.say(room, text + 'Scamming prevention tips: http://pstradingroom.weebly.com/scamming-prevention-tips.html');
		case 'breeders':
			return this.say(room, text + 'List of breeders: http://tinyurl.com/WiFIBReedingBrigade');
		case 'signup':
			return this.say(room, text + 'Breeders Sign Up: http://tinyurl.com/GetBreeding');
		case 'bans':
		case 'banappeals':
			return this.say(room, text + 'Ban appeals: http://tinyurl.com/WifiBanAppeals');
		case 'lists':
			return this.say(room, text + 'Major and minor list compilation: http://tinyurl.com/WifiSheets');
		case 'trainers':
			return this.say(room, text + 'List of EV trainers: http://tinyurl.com/WifiEVtrainingCrew');
		case 'youtube':
			return this.say(room, text + 'Wi-Fi room\'s official YouTube channel: http://tinyurl.com/wifiyoutube');
		case 'league':
			return this.say(room, text + 'Wi-Fi Room Pokemon League: http://tinyurl.com/wifiroomleague');
		case 'checkfc':
			if (!Config.googleapikey) return this.say(room, text + 'A Google API key has not been provided and is required for this command to work.');
			if (arg.length < 2) return this.say(room, text + 'Usage: .wifi checkfc, [fc]');
			let wifiRoom = room.id === 'wifi' ? room : Rooms.get('wifi');
			if (!wifiRoom) return false;
			if (!wifiRoom.data) wifiRoom.data = {
				docRevs: ['', ''],
				scammers : {},
				cloners: []
			};
			let wifiData = wifiRoom.data;
			var self = this;
			this.getDocMeta('0AvygZBLXTtZZdFFfZ3hhVUplZm5MSGljTTJLQmJScEE', function (err, meta) {
				if (err) return self.say(room, text + 'An error occured while processing your command.');
				let value = arg[1].replace(/\D/g, '');
				if (value.length !== 12) return self.say(room, text + '"' + arg[1] + '" is not a valid FC.');
				if (wifiData.docRevs[1] === meta.version) {
					value = wifiData.scammers[value];
					if (value) return self.say(room, text + '**The FC ' + arg[1] + ' belongs to a known scammer: ' + (value.length > 61 ? value + '..' : value) + '.**');
					return self.say(room, text + 'This FC does not belong to a known scammer.');
				}
				wifiData.docRevs[1] = meta.version;
				self.getDocCsv(meta, function (data) {
					csv(data, function (err, data) {
						if (err) return self.say(room, text + 'An error occured while processing your command.');
						for (let i = 0; i < data.length; i++) {
							let str = data[i][1].replace(/\D/g, '');
							let strLen = str.length;
							if (str && strLen > 11) {
								for (let j = 0; j < strLen; j += 12) {
									wifiData.scammers[str.substr(j, 12)] = data[i][0];
								}
							}
						}
						value = wifiData.scammers[value];
						if (value) return self.say(room, text + '**The FC ' + arg[1] + ' belongs to a known scammer: ' + (value.length > 61 ? value.substr(0, 61) + '..' : value) + '.**');
						return self.say(room, text + 'This FC does not belong to a known scammer.');
					});
				});
			});
			break;
		case 'ocloners':
		case 'onlinecloners':
			if (!Config.googleapikey) return this.say(room, text + 'A Google API key has not been provided and is required for this command to work.');
			let wifiRoom = room.id === 'wifi' ? room : Rooms.get('wifi');
			if (!wifiRoom) return false;
			if (!wifiRoom.data) wifiRoom.data = {
				docRevs: ['', ''],
				scammers : {},
				cloners: []
			};
			let wifiData = wifiRoom.data;
			var self = this;
			self.getDocMeta('0Avz7HpTxAsjIdFFSQ3BhVGpCbHVVdTJ2VVlDVVV6TWc', function (err, meta) {
				if (err) return self.say(room, text + 'An error occured while processing your command. Please report this!');
				if (room !== user && !text) text += '/pm ' + user.id + ', ';
				if (wifiData.docRevs[0] === meta.version) {
					let found = [];
					let cloners = wifiData.cloners;
					for (let i in cloners) {
						let cloner = cloners[i];
						if (wifiRoom.users.get(toId(cloner[0]))) {
							found.push('Name: ' + cloner[0] + ' | FC: ' + cloner[1] + ' | IGN: ' + cloner[2]);
						}
					}
					if (!found.length) return self.say(room, text + 'No cloners were found online.');

					let foundStr = found.join(', ');
					if (foundStr.length > 266) {
						return self.uploadToHastebin("The following cloners are online :\n\n" + found.join('\n'), function (link) {
							self.say(room, text + link);
						});
					}
					return self.say(room, text + "The following cloners are online: " + foundStr);
				}

				self.say(room, text + 'Cloners List changed. Updating...');
				wifiData.docRevs[0] = meta.version;
				self.getDocCsv(meta, function (data) {
					csv(data, function (err, data) {
						if (err) return this.say(room, text + 'An error occured while processing your command. Please report this!');

						let cloners = wifiData.cloners;
						for (let i = 0; i < data.length; i++) {
							let cloner = data[i];
							let str = cloner[1].replace(/\D/g, '');
							if (str && str.length >= 12) {
								cloners.push([cloner[0], cloner[1], cloner[2]]);
							}
						}

						let found = [];
						for (let i in cloners) {
							let cloner = cloners[i];
							if (wifiRoom.users.get(toId(cloner[0]))) {
								found.push('Name: ' + cloner[0] + ' | FC: ' + cloner[1] + ' | IGN: ' + cloner[2]);
							}
						}
						if (!found.length) return self.say(room, text + 'No cloners were found online.');

						let foundStr = found.join(', ');
						if (foundStr.length < 267) return self.say(room, text + "The following cloners are online :\n\n" + foundStr);
						self.uploadToHastebin("The following cloners are online :\n\n" + found.join('\n'), function (link) {
							self.say(room, text + link);
						});
					});
				});
			});
			break;
		default:
			return this.say(room, text + 'Unknown option. General links can be found here: http://pstradingroom.weebly.com/links.html');
		}
	},
	mono: 'monotype',
	monotype: function (arg, user, room) {
		// links and info for the monotype room
		if (Config.serverid !== 'showdown') return false;
		var text = '';
		if (room.id === 'monotype') {
			if (!user.canUse('monotype', room)) text += '/pm ' + user.id + ', ';
		} else if (room !== user) {
			return false;
		}
		var messages = {
			cc: 'The monotype room\'s Core Challenge can be found here: http://monotypeps.weebly.com/core-ladder-challenge.html',
			plug: 'The monotype room\'s plug can be found here: https://plug.dj/monotyke-djs',
			rules: 'The monotype room\'s rules can be found here: http://monotypeps.weebly.com/monotype-room.html',
			site: 'The monotype room\'s site can be found here: http://monotypeps.weebly.com/',
			stats: 'You can find the monotype usage stats here: http://monotypeps.weebly.com/stats.html',
			banlist: 'The monotype banlist can be found here: http://monotypeps.weebly.com/monotype-metagame.html'
		};
		text += messages[toId(arg)] || 'Unknown option. If you are looking for something and unable to find it, please ask monotype room staff for help on where to locate what you are looking for. General information can be found here: http://monotypeps.weebly.com/';
		this.say(room, text);
	},
	survivor: function (arg, user, room) {
		// contains links and info for survivor in the Survivor room
		if (Config.serverid !== 'showdown') return false;
		var text = '';
		if (room.id === 'survivor') {
			if (!user.canUse('survivor', room)) text += '/pm ' + user.id + ', ';
		} else if (room !== user) {
			return false;
		}
		var gameTypes = {
			hg: "The rules for this game type can be found here: http://survivor-ps.weebly.com/hunger-games.html",
			hungergames: "The rules for this game type can be found here: http://survivor-ps.weebly.com/hunger-games.html",
			classic: "The rules for this game type can be found here: http://survivor-ps.weebly.com/classic.html"
		};
		arg = toId(arg);
		if (!arg) return this.say(room, text + "The list of game types can be found here: http://survivor-ps.weebly.com/themes.html");
		text += gameTypes[arg] || "Invalid game type. The game types can be found here: http://survivor-ps.weebly.com/themes.html";
		this.say(room, text);
	},
	thp: 'happy',
	thehappyplace: 'happy',
	happy: function (arg, user, room) {
		// info for The Happy Place
		if (Config.serverid !== 'showdown') return false;
		var text = '';
		if (room === 'thehappyplace') {
			if (!user.canUse('happy', room)) text += '/pm ' + user.id + ', ';
		} else if (room !== user) {
			return false;
		}
		arg = toId(arg);
		if (arg === 'askstaff' || arg === 'ask' || arg === 'askannie') {
			text += "http://thepshappyplace.weebly.com/ask-the-staff.html";
		} else {
			text += "The Happy Place, at its core, is a friendly environment for anyone just looking for a place to hang out and relax. We also specialize in taking time to give advice on life problems for users. Need a place to feel at home and unwind? Look no further!";
		}
		this.say(room, text);
	},


	/**
	 * Jeopardy commands
	 *
	 * The following commands are used for Jeopardy in the Academics room
	 * on the Smogon server.
	 */


	b: 'buzz',
	buzz: function (arg, user, room) {
		if (this.buzzed || room === user || !user.canUse('buzz', room)) return false;

		this.say(room, '**' + user.name + ' has buzzed in!**');
		this.buzzed = user;
		this.buzzer = setTimeout(function (room, buzzMessage) {
			this.say(room, buzzMessage);
			this.buzzed = '';
		}.bind(this), 7 * 1000, room, user.name + ', your time to answer is up!');
	},
	reset: function (arg, user, room) {
		if (!this.buzzed || room === user || !user.hasRank(room, '%')) return false;
		clearTimeout(this.buzzer);
		this.buzzed = '';
		this.say(room, 'The buzzer has been reset.');
	},
};

/* Pro Wrestling room commands */
	smackdown: 'smackdownresults',
	smackdownresults: function (arg, user, room) {
		var text = (room === user || user.hasRank(room, '+%@#')) ? '' : '/pm ' + user.id + ', ';
		text += 'http://bleacherreport.com/articles/2449358-wwe-smackdown-results-winners-grades-reaction-and-highlights-from-april-30 **Smackdown Results: April 30th**';
		this.say(room, text);
	},
	
	rawresults: 'raw',
	raw: function (arg, user, room) {
		var text = (room === user || user.hasRank(room, '+%@#')) ? '' : '/pm ' + user.id + ', ';
		text += 'http://bleacherreport.com/articles/2453752-wwe-raw-results-winners-grades-reaction-and-highlights-from-may-4 **Raw Results: May 4th**';
		this.say(room, text);
	},

	ppv: function (arg, user, room) {
		var text = (room === user || user.hasRank(room, '+%@#')) ? '' : '/pm ' + user.id + ', ';
		text += "This month's PPV is **Payback** | Results for Extreme Rules: http://bleacherreport.com/articles/2442937-wwe-extreme-rules-2015-results-biggest-winners-and-losers-from-ppv ";
		this.say(room, text);
	},
