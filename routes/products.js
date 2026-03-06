var express = require('express');
var router = express.Router();
let RandomToken = require('../utils/GenToken');
/* GET home page. */
router.get('/', function(req, res, next) {
  res.send("Đây là products: " + RandomToken(20));
});

module.exports = router;
