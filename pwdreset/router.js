var express = require("express");
var crypto = require('crypto');
var User = require('../models/user.js');
var hash = require('../utils/hash.js');
var bodyParser = require('body-parser');
var router = new express.Router();
var _ = require('lodash');
var nodemailer = require('nodemailer');
var sesTransport = require('nodemailer-ses-transport');
var activator = require('activator');
var smtp_creds = require('../smtp_credentials.js');
var ObjectId = require('mongoose').Types.ObjectId;
// TBD move this access key id and secret access key to a separate file and require it in
var transport = nodemailer.createTransport(sesTransport({
	accessKeyId: smtp_creds.accessKeyId,
        secretAccessKey: smtp_creds.secretAccessKey,
        rateLimit: 1 // do not send more than 1 messages in a second
}));

router.use(bodyParser());

function forgotpwd (req, res,next) {
	if (!(req.connection.encrypted)){
		return res.redirect("https://" + req.headers.host.replace('8008','8009') + req.url);
	}
	res.render("pwdreset/pwdreset", {layout: false});
}

var userModel = {
	_find: function (login,cb) {
		       var found = {};
		       if (!login) {
			       cb("nologin");
		       } else {
				User.findOne({email: login}, function(err, foundUser){
					if (err) cb(null,err);
					found.id = foundUser.email;
					found.email = foundUser.email;
					found.activation_code = foundUser.activation_code;
					found.password_reset_code = foundUser.password_reset_code;
					found.password_reset_time = foundUser.password_reset_time;
				       cb(null,_.cloneDeep(found));
				});
		       }
	       },
	find: function() {
		      this._find.apply(this,arguments);
	      },
	save: function (id,data,cb) {
		      if (id){
			    var query = {"email": id};
			    var saveThisData = {};
			    if (data.password){
				crypto.randomBytes(16, function(err, bytes){
					saveThisData.salt = bytes.toString('utf8');
					saveThisData.hash = hash(data.password, saveThisData.salt);
					saveThisData.password_reset_code = data.password_reset_code;
					saveThisData.password_reset_time = data.password_reset_time;
					User.findOneAndUpdate(query, saveThisData, function(err, doc){
						if (err) { cb(err); 
						}else{ 
							console.log('saved the new password to db...');
							cb(null); }
					}); 
				});
			      } else {
					saveThisData.password_reset_code = data.password_reset_code;
					saveThisData.password_reset_time = data.password_reset_time;
					User.findOneAndUpdate(query, saveThisData, function(err, doc){
						if (err) { cb(err); 
						}else{ cb(null); }
					}); 
			      } 
		      }else {
			      cb(404);
		      }
	      }
}; 

activator.init({user:userModel,transport:transport,from: 'support@valetbasket.com', templates: __dirname});

router.get("/passwordreset",forgotpwd);
router.post("/passwordreset", activator.createPasswordResetNext, function(req, res,next){
	res.render('pwdreset/request_sent', {layout: false});
});
router.get("/resetpassword", function(req,res,next){
	res.render('pwdreset/newpassword', {code: req.query.code, email: req.query.email, layout: false});
});
router.post("/resetpassword",activator.completePasswordResetNext, function(req,res,next){
	User.findOne({email: req.query.email}, function(err, newUser){
		req.session.isLoggedIn = true;
		req.session.user = req.query.email;
		req.session.name = newUser.name["first"]+' '+newUser.name["last"];
		res.render('orders/orderform', {layout:false, name: req.session.name});
	});
});

module.exports = router;

// new module activator
// new amazon service ses - option to use plain smtp
// new router method use - put
// new way of creating an object
// email template
