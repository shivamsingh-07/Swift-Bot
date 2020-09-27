const express = require("express");
const app = express();
const ejs = require("ejs");

app.set("view engine", "ejs");

app.use("/", express.static(__dirname + "/content"));

app.get("/", (req, res) => {
	res.render("index");
});

app.listen(8080);
