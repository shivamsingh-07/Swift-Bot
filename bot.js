const Discord = require("discord.js");
const Website = require("./index.js");
const axios = require("axios");
const fs = require("fs");
const Captcha = require("@haileybot/captcha-generator");
const client = new Discord.Client();
const latest = require("./database.json");

// Bot Connection Handler
client.on("ready", () => {
	console.log(client.user.tag + " is connected :)");

	// Checking Rockstar Games Instagram
	client.user.setActivity(`Rockstar Games`, { type: "WATCHING" });
	var ID = setInterval(() => {
		var lastpost = latest.lastPost;
		axios.get("https://www.instagram.com/rockstargames/?__a=1").then((response) => {
			var latestpost = response.data.graphql.user.edge_owner_to_timeline_media.edges[0].node.id;
			var general = client.channels.cache.find((channel) => channel.name === "general");
			if (!general) return;
			if (lastpost === latestpost) return;

			var post = new Discord.MessageEmbed()
				.setColor("#E1306C")
				.setAuthor(
					response.data.graphql.user.full_name + " (@" + response.data.graphql.user.username + ")",
					response.data.graphql.user.profile_pic_url,
					"https://www.instagram.com/rockstargames/",
				)
				.setDescription(
					response.data.graphql.user.edge_owner_to_timeline_media.edges[0].node
						.edge_media_to_caption.edges[0].node.text,
				)
				.setImage(response.data.graphql.user.edge_owner_to_timeline_media.edges[0].node.display_url)
				.setFooter(
					"Instagram",
					"https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png",
				);
			general.send(post);

			// Updating Database
			fs.writeFile("./database.json", JSON.stringify({ lastPost: latestpost }, null, 4), (err) => {
				if (err) throw err;
			});
		});
		console.log("Post checked");
	}, 300000);
});

// User Add Handler
client.on("guildMemberAdd", (member) => {
	member.send(
		`Welcome to **` +
			member.guild.name +
			`**, ${member}. Hope you'll enjoy your stay :confetti_ball: :smiling_face_with_3_hearts: `,
	);
	member.roles.add(member.guild.roles.cache.find((role) => role.name === "non-verified"));
});

// User Left Handler
// client.on("guildMemberRemove", (member) => {
// 	var welcome = client.channels.cache.find((channel) => channel.name === "welcome");
// 	try {
// 		welcome.send(
// 			member,
// 			"https://tenor.com/view/nikal-laude-nikal-lavde-fursat-laude-pehli-fursat-gif-14527278",
// 		);
// 	} catch (err) {
// 		console.log(err);
// 	}
// });

// New Server Invite
client.on("guildCreate", () => {
	var general = client.channels.cache.find((channel) => channel.name === "general");
	general.send(
		new Discord.MessageEmbed()
			.setColor("0099ff")
			.setTitle("Thanks for inviting me to your server!")
			.setDescription("To get started type **>help** to know more."),
	);

	var verify = client.channels.cache.find((channel) => channel.name === "verify");
	verify.send(
		new Discord.MessageEmbed()
			.setColor("0099ff")
			.setTitle("Swift Bot Captcha Verification System")
			.setDescription(
				"Hello user\nYou are currently a non-verified member of this server. To get verified you need to pass the captcha verification. To start the process type **>verify**",
			)
			.setTimestamp(),
	);
});

// Message Handler
client.on("message", (message) => {
	// Bot doesn't reply to a bot message or member's DM
	if (message.author.bot || message.channel.type === "dm") return;

	if (message.channel.name === "verify" && message.content !== ">verify") return message.delete();

	if (message.content.startsWith(">")) {
		var value = message.content.substr(1);
		var commands = value.split(" ");
		var initial = commands[0];
		var arguments = commands.slice(1);

		switch (initial) {
			case "hi":
				message.channel.send("Hello " + `${message.author}` + `. ${greetmessage()}`);
				break;

			// >help Section
			case "help":
				message.channel.send(help());
				break;

			// >guess Section
			case "guess":
				if (arguments < 1) message.channel.send(`Ask me something [${message.author.toString()}]`);
				else message.channel.send(`[${message.author.toString()}] I think ${predict()}`);
				break;

			// >poll Section
			case "poll":
				let pollChannel = message.mentions.channels.first();
				let pollDescription = arguments.slice(1);

				let embedPoll = new Discord.MessageEmbed()
					.setColor("0099ff")
					.setTitle("Pole by *" + message.author.username + "*")
					.setDescription(pollDescription)
					.setColor("0099ff");

				pollChannel
					.send(embedPoll)
					.then(async (msgEmbed) => {
						await msgEmbed.react("👍");
						await msgEmbed.react("👎");
					})
					.catch((err) => console.log(err));
				break;

			// >verify Section
			case "verify":
				message.delete();

				if (message.channel.name !== "verify") break;

				let captcha = new Captcha();

				var verifyEmbed = new Discord.MessageEmbed()
					.setColor("#3498DB")
					.setTitle("Captcha Verification for " + message.guild.name)
					.setDescription(
						"Please type the given code in **#" +
							message.channel.name +
							"** channel in **" +
							message.guild.name +
							"**. This code is valid for only 5 minutes or single response (right or wrong).",
					)
					.setImage("attachment://captcha.png");

				const filter = (msg) => {
					if (msg.author.bot) return;
					if (msg.author.id === message.author.id && msg.content === captcha.value) return true;
					else message.author.send("You entered the captcha incorrectly.");
					return false;
				};

				message.author
					.send({
						files: [new Discord.MessageAttachment(captcha.PNGStream, "captcha.png")],
						embed: verifyEmbed,
					})
					.then(() => {
						message.channel
							.awaitMessages(filter, {
								max: 1,
								time: 30000,
								errors: ["time"],
							})
							.then((responseCode) => {
								if (responseCode) {
									message.author.send(
										"Congratulations! :partying_face: Your are now a verified member of **" +
											message.guild.name +
											"**",
									);
									message.guild
										.member(message.author)
										.roles.remove(
											message.member.roles.cache.find(
												(role) => role.name === "non-verified",
											),
										);
								}
							})
							.catch((err) => {
								message.author.send("Captcha Expired!");
							});
					})
					.catch((err) => console.log("M-ERROR: " + err));
				break;

			// >stalk Section
			case "stalk":
				if (arguments < 1) {
					message.channel.send(`Please provide a username [${message.author.toString()}]`);
				} else {
					axios
						.get(`https://www.instagram.com/${arguments}/?__a=1`)
						.then((response) => {
							console.log(response);

							var embed = new Discord.MessageEmbed()
								.setColor("#E1306C")
								.setTitle(response.data.graphql.user.full_name)
								.setThumbnail(response.data.graphql.user.profile_pic_url)
								.setDescription(
									response.data.graphql.user.biography +
										"\n\n" +
										"**Followers : **" +
										response.data.graphql.user.edge_followed_by.count +
										"\n" +
										"**Following : **" +
										response.data.graphql.user.edge_follow.count +
										"\n" +
										"**Posts : **" +
										response.data.graphql.user.edge_owner_to_timeline_media.count +
										"\n\n" +
										"**Profile URL : **" +
										`https://www.instagram.com/${arguments}`,
								)
								.setFooter(
									"Instagram",
									"https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png",
								);

							message.channel.send(embed);
						})
						.catch((err) => {
							if (err) {
								var embed = new Discord.MessageEmbed()
									.setColor("#E1306C")
									.setTitle("An error occured due to one of the following reasons :")
									.setDescription(
										"1. The username is incorrect.\n2. Server might be unavailable\n\nTry Again Later",
									)
									.setFooter(
										"Instagram",
										"https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png",
									);

								message.channel.send(embed);
							}
						});
				}
				break;

			default:
				message.channel.send("Invalid Command :( Try **>help** to learn more.");
				break;
		}
	}
});

// >guess Function
function predict() {
	var guess = ["Yes!", "Maybe Yes", "Maybe No", "No!"];
	var index = Math.floor(Math.random() * 4);
	return guess[index];
}

// >hi Function
function greetmessage() {
	var guess = ["Hope you are enjoying :)", "Have a nice day ^^)"];
	var index = Math.floor(Math.random() * 2);
	return guess[index];
}

// >help Function
function help() {
	return new Discord.MessageEmbed()
		.setColor("#3498DB")
		.setTitle("Swift Commands")
		.setDescription("Some commands which will help you in interacting with Swift.")
		.attachFiles(["./logo.png"])
		.setThumbnail("attachment://logo.png")
		.addFields(
			{
				name: ">guess",
				value: "You can actually ask Swift to pridict the occurance of your question.",
			},
			{
				name: ">poll",
				value:
					"You can start a poll from this command by typing: >poll *channel reference* **your poll**",
			},
			{
				name: ">stalk",
				value:
					"You can basically sneek into someone's instagram profile by typing person's username after this command.",
			},
		);
}

// Starting Bot
client.login("NzIzODUzMjY5MzY1MTYyMDk1.Xu3rAw.yXIr_vEgTcyGHRj-5ZI6jYbRKAY");
