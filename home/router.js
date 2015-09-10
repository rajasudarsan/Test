var express = require("express");

var router = new express.Router();

function home(req, res) {
	  res.render("home/home", {layout: false});
}

function team(req, res) {
	  res.render("main/team");
}

router.get("/", home);
router.get("/team", team);

module.exports = router;